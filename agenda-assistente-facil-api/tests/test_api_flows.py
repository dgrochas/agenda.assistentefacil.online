from datetime import datetime, timedelta, timezone


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_auth_config_and_appointments_flow(client):
    # provider register/login
    r = client.post(
        "/api/v1/auth/register/provider",
        json={"email": "medico@example.com", "password": "123456", "slug_url": "dr-x"},
    )
    assert r.status_code == 201
    professional_id = r.json()["id"]

    r = client.post(
        "/api/v1/auth/token",
        json={"email": "medico@example.com", "password": "123456", "role": "provider"},
    )
    assert r.status_code == 200
    provider_token = r.json()["access_token"]

    # patient register/login
    r = client.post(
        "/api/v1/auth/register/customer",
        json={
            "email": "paciente@example.com",
            "password": "123456",
            "full_name": "Paciente Teste",
            "phone_number": "+5511999999999",
        },
    )
    assert r.status_code == 201

    r = client.post(
        "/api/v1/auth/token",
        json={"email": "paciente@example.com", "password": "123456", "role": "customer"},
    )
    assert r.status_code == 200
    patient_token = r.json()["access_token"]

    # provider config
    r = client.put(
        "/api/v1/agenda-config/me",
        headers=_auth_header(provider_token),
        json={
            "work_hours": {"mon": [{"start": "08:00", "end": "18:00"}]},
            "slot_duration": 30,
            "buffer_time": 10,
            "cancellation_deadline_hours": 1,
        },
    )
    assert r.status_code == 200

    # patient creates appointment
    now = datetime.now(timezone.utc) + timedelta(days=2)
    start_time = now.replace(minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=30)

    r = client.post(
        "/api/v1/appointments",
        headers=_auth_header(patient_token),
        json={
            "professional_id": professional_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        },
    )
    assert r.status_code == 201
    appointment_id = r.json()["id"]

    # idempotencia basica: mesma requisicao retorna agendamento ja existente
    r = client.post(
        "/api/v1/appointments",
        headers=_auth_header(patient_token),
        json={
            "professional_id": professional_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        },
    )
    assert r.status_code == 201
    assert r.json()["id"] == appointment_id

    # patient list
    r = client.get("/api/v1/appointments/me", headers=_auth_header(patient_token))
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get(
        "/api/v1/appointments/provider/me",
        headers=_auth_header(provider_token),
        params={
            "start": (start_time - timedelta(days=1)).isoformat(),
            "end": (end_time + timedelta(days=1)).isoformat(),
        },
    )
    assert r.status_code == 200
    assert len(r.json()) == 1

    # reschedule
    r = client.post(
        f"/api/v1/appointments/{appointment_id}/reschedule",
        headers=_auth_header(patient_token),
        json={
            "start_time": (start_time + timedelta(hours=1)).isoformat(),
            "end_time": (end_time + timedelta(hours=1)).isoformat(),
        },
    )
    assert r.status_code == 200

    # cancel
    r = client.post(
        f"/api/v1/appointments/{appointment_id}/cancel",
        headers=_auth_header(patient_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "canceled"


def test_appointment_overlap_conflict(client):
    provider = client.post(
        "/api/v1/auth/register/provider",
        json={"email": "medico-conflict@example.com", "password": "123456", "slug_url": "dr-conflict"},
    )
    assert provider.status_code == 201
    professional_id = provider.json()["id"]

    patient1 = client.post(
        "/api/v1/auth/register/customer",
        json={
            "email": "paciente-1@example.com",
            "password": "123456",
            "full_name": "Paciente 1",
            "phone_number": "+5511000000001",
        },
    )
    assert patient1.status_code == 201
    token1 = client.post(
        "/api/v1/auth/token",
        json={"email": "paciente-1@example.com", "password": "123456", "role": "customer"},
    ).json()["access_token"]

    patient2 = client.post(
        "/api/v1/auth/register/customer",
        json={
            "email": "paciente-2@example.com",
            "password": "123456",
            "full_name": "Paciente 2",
            "phone_number": "+5511000000002",
        },
    )
    assert patient2.status_code == 201
    token2 = client.post(
        "/api/v1/auth/token",
        json={"email": "paciente-2@example.com", "password": "123456", "role": "customer"},
    ).json()["access_token"]

    start_time = (datetime.now(timezone.utc) + timedelta(days=3)).replace(minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=30)

    created = client.post(
        "/api/v1/appointments",
        headers=_auth_header(token1),
        json={
            "professional_id": professional_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        },
    )
    assert created.status_code == 201

    conflict = client.post(
        "/api/v1/appointments",
        headers=_auth_header(token2),
        json={
            "professional_id": professional_id,
            "start_time": (start_time + timedelta(minutes=10)).isoformat(),
            "end_time": (end_time + timedelta(minutes=10)).isoformat(),
        },
    )
    assert conflict.status_code == 409
