from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx
from jose import jwt

from app.core.config import settings
from app.core.security import decrypt_sensitive, encrypt_sensitive
from app.models.entities import Appointment, UserProfessional

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
GOOGLE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


class CalendarIntegrationError(Exception):
    pass


async def _google_request_with_retry(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    expected_statuses: tuple[int, ...] = (200,),
    retries: int = 2,
) -> httpx.Response:
    last_exc: Exception | None = None
    for _ in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.request(method, url, data=data, json=json, headers=headers)
            if response.status_code in expected_statuses:
                return response
            if response.status_code in (429, 500, 502, 503, 504):
                continue
            raise CalendarIntegrationError(f"Google API error: {response.status_code}")
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            last_exc = exc
            continue
    raise CalendarIntegrationError("Falha de comunicacao com Google Calendar.") from last_exc


def _build_state(provider_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {"provider_id": str(provider_id), "iat": now, "exp": now.timestamp() + 600}
    return jwt.encode(payload, settings.google_oauth_state_secret, algorithm="HS256")


def _parse_state(state: str) -> UUID:
    payload = jwt.decode(state, settings.google_oauth_state_secret, algorithms=["HS256"])
    return UUID(payload["provider_id"])


def build_google_oauth_url(provider_id: UUID) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": _build_state(provider_id),
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    payload = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "grant_type": "authorization_code",
        "code": code,
    }
    response = await _google_request_with_retry("POST", GOOGLE_TOKEN_URL, data=payload, expected_statuses=(200,))
    return response.json()


async def refresh_access_token(refresh_token: str) -> str:
    payload = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    response = await _google_request_with_retry("POST", GOOGLE_TOKEN_URL, data=payload, expected_statuses=(200,))
    return response.json()["access_token"]


def apply_oauth_tokens(professional: UserProfessional, token_payload: dict[str, Any]) -> None:
    refresh_token = token_payload.get("refresh_token")
    if refresh_token:
        professional.refresh_token_encrypted = encrypt_sensitive(refresh_token)
    professional.oauth_provider = "google"


def extract_provider_id_from_state(state: str) -> UUID:
    return _parse_state(state)


async def fetch_google_busy_slots(
    professional: UserProfessional, start: datetime, end: datetime
) -> list[Appointment]:
    if not professional.refresh_token_encrypted:
        return []

    try:
        refresh_token = decrypt_sensitive(professional.refresh_token_encrypted)
        access_token = await refresh_access_token(refresh_token)

        payload = {
            "timeMin": start.astimezone(timezone.utc).isoformat(),
            "timeMax": end.astimezone(timezone.utc).isoformat(),
            "items": [{"id": settings.google_calendar_default_id}],
        }
        headers = {"Authorization": f"Bearer {access_token}"}

        response = await _google_request_with_retry(
            "POST", GOOGLE_FREEBUSY_URL, json=payload, headers=headers, expected_statuses=(200,)
        )
        busy_ranges = (
            response.json().get("calendars", {}).get(settings.google_calendar_default_id, {}).get("busy", [])
        )
    except Exception:
        return []

    normalized: list[Appointment] = []
    for busy in busy_ranges:
        normalized.append(
            Appointment(
                professional_id=professional.id,
                patient_id=UUID("00000000-0000-0000-0000-000000000000"),
                start_time=datetime.fromisoformat(busy["start"].replace("Z", "+00:00")),
                end_time=datetime.fromisoformat(busy["end"].replace("Z", "+00:00")),
            )
        )

    return normalized


async def create_google_calendar_event(
    professional: UserProfessional,
    appointment: Appointment,
    patient_email: str,
) -> str | None:
    if not professional.refresh_token_encrypted:
        return None

    try:
        refresh_token = decrypt_sensitive(professional.refresh_token_encrypted)
        access_token = await refresh_access_token(refresh_token)
        event_payload = {
            "summary": "Consulta - Agenda Assistente Facil",
            "description": "Evento criado automaticamente pela plataforma.",
            "start": {"dateTime": appointment.start_time.astimezone(timezone.utc).isoformat()},
            "end": {"dateTime": appointment.end_time.astimezone(timezone.utc).isoformat()},
            "attendees": [{"email": patient_email}],
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        event_url = GOOGLE_EVENTS_URL.format(calendar_id=settings.google_calendar_default_id)

        response = await _google_request_with_retry(
            "POST", event_url, json=event_payload, headers=headers, expected_statuses=(200,)
        )
        return response.json().get("id")
    except Exception:
        return None


async def update_google_calendar_event(
    professional: UserProfessional,
    appointment: Appointment,
    external_event_id: str,
) -> bool:
    if not professional.refresh_token_encrypted or not external_event_id:
        return False

    try:
        refresh_token = decrypt_sensitive(professional.refresh_token_encrypted)
        access_token = await refresh_access_token(refresh_token)
        event_payload = {
            "start": {"dateTime": appointment.start_time.astimezone(timezone.utc).isoformat()},
            "end": {"dateTime": appointment.end_time.astimezone(timezone.utc).isoformat()},
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        event_url = GOOGLE_EVENT_URL.format(
            calendar_id=settings.google_calendar_default_id, event_id=external_event_id
        )
        await _google_request_with_retry("PATCH", event_url, json=event_payload, headers=headers, expected_statuses=(200,))
        return True
    except Exception:
        return False


async def cancel_google_calendar_event(
    professional: UserProfessional,
    external_event_id: str,
) -> bool:
    if not professional.refresh_token_encrypted or not external_event_id:
        return False

    try:
        refresh_token = decrypt_sensitive(professional.refresh_token_encrypted)
        access_token = await refresh_access_token(refresh_token)
        headers = {"Authorization": f"Bearer {access_token}"}
        event_url = GOOGLE_EVENT_URL.format(
            calendar_id=settings.google_calendar_default_id, event_id=external_event_id
        )
        await _google_request_with_retry("DELETE", event_url, headers=headers, expected_statuses=(200, 204, 410))
        return True
    except Exception:
        return False


async def google_event_exists(
    professional: UserProfessional,
    external_event_id: str,
) -> bool:
    if not professional.refresh_token_encrypted or not external_event_id:
        return False

    try:
        refresh_token = decrypt_sensitive(professional.refresh_token_encrypted)
        access_token = await refresh_access_token(refresh_token)
        headers = {"Authorization": f"Bearer {access_token}"}
        event_url = GOOGLE_EVENT_URL.format(
            calendar_id=settings.google_calendar_default_id, event_id=external_event_id
        )
        response = await _google_request_with_retry(
            "GET", event_url, headers=headers, expected_statuses=(200, 404), retries=0
        )
        return response.status_code == 200
    except Exception:
        return False
