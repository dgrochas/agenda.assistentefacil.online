from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, require_role, subject_uuid
from app.models.entities import Appointment, AppointmentStatus, UserRole
from app.repositories.config_agenda import ConfigAgendaRepository
from app.repositories.appointments import AppointmentRepository
from app.repositories.users import UserRepository
from app.schemas.appointment import AppointmentCreateIn, AppointmentOut, AppointmentRescheduleIn
from app.services.availability import calculate_available_slots
from app.services.google_calendar import (
    cancel_google_calendar_event,
    create_google_calendar_event,
    fetch_google_busy_slots,
    google_event_exists,
    update_google_calendar_event,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])
repo = AppointmentRepository()
user_repo = UserRepository()
config_repo = ConfigAgendaRepository()


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    payload: AppointmentCreateIn,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.CUSTOMER)),
):
    patient_id = subject_uuid(current_user)
    patient = user_repo.get_patient_by_id(session, patient_id)
    professional = user_repo.get_professional_by_id(session, payload.professional_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente nao encontrado.")
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional nao encontrado.")
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="Intervalo de horario invalido.")

    existing_same = repo.find_same_scheduled_for_patient(
        session=session,
        patient_id=patient_id,
        professional_id=payload.professional_id,
        start=payload.start_time,
        end=payload.end_time,
    )
    if existing_same:
        return AppointmentOut.model_validate(existing_same, from_attributes=True)

    has_conflict = repo.has_overlapping_scheduled(
        session=session,
        professional_id=payload.professional_id,
        start=payload.start_time,
        end=payload.end_time,
    )
    if has_conflict:
        raise HTTPException(status_code=409, detail="Horario indisponivel para este profissional.")

    entity = Appointment(
        professional_id=payload.professional_id,
        patient_id=patient_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    created = repo.create(session, entity)
    external_event_id = await create_google_calendar_event(professional, created, patient.email)
    if external_event_id:
        created.external_event_id = external_event_id
        session.add(created)
        session.commit()
        session.refresh(created)
    return AppointmentOut.model_validate(created, from_attributes=True)


@router.get("/me", response_model=list[AppointmentOut])
def my_appointments(
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.CUSTOMER)),
):
    patient_id = subject_uuid(current_user)
    items = repo.list_by_patient(session, patient_id)
    return [AppointmentOut.model_validate(x, from_attributes=True) for x in items]


@router.get("/provider/me", response_model=list[AppointmentOut])
def my_provider_appointments(
    start: datetime = Query(...),
    end: datetime = Query(...),
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    provider_id = subject_uuid(current_user)
    items = repo.list_by_professional_period(session, provider_id, start, end)
    return [AppointmentOut.model_validate(x, from_attributes=True) for x in items]


@router.get("/availability/{professional_id}")
async def get_availability(
    professional_id: UUID,
    start: datetime = Query(...),
    end: datetime = Query(...),
    session: Session = Depends(get_db_session),
):
    config = config_repo.get_by_professional_id(session, professional_id)
    if not config:
        return {"professional_id": str(professional_id), "slots": []}

    professional = user_repo.get_professional_by_id(session, professional_id)
    busy_events = repo.list_busy_for_professional(session, professional_id, start, end)
    google_busy = await fetch_google_busy_slots(professional, start, end) if professional else []
    slots = calculate_available_slots(config, [*busy_events, *google_busy], start, end)
    return {"professional_id": str(professional_id), "slots": slots}


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel_appointment(
    appointment_id: UUID,
    session: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    appointment = repo.get_by_id(session, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")
    actor_id = subject_uuid(current_user)
    is_owner_patient = current_user.role == UserRole.CUSTOMER and appointment.patient_id == actor_id
    is_owner_provider = current_user.role == UserRole.PROVIDER and appointment.professional_id == actor_id
    if not is_owner_patient and not is_owner_provider:
        raise HTTPException(status_code=403, detail="Sem permissao para cancelar este agendamento.")

    config = config_repo.get_by_professional_id(session, appointment.professional_id)
    now = datetime.now(timezone.utc)
    appointment_time = appointment.start_time
    if appointment_time.tzinfo is None:
        appointment_time = appointment_time.replace(tzinfo=timezone.utc)
    if config:
        min_time = now.timestamp() + (config.cancellation_deadline_hours * 3600)
        if appointment_time.timestamp() < min_time:
            raise HTTPException(status_code=400, detail="Fora da janela de cancelamento permitida.")

    appointment.status = AppointmentStatus.CANCELED
    professional = user_repo.get_professional_by_id(session, appointment.professional_id)
    if professional and appointment.external_event_id:
        await cancel_google_calendar_event(professional, appointment.external_event_id)
    saved = repo.save(session, appointment)
    return AppointmentOut.model_validate(saved, from_attributes=True)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
async def reschedule_appointment(
    appointment_id: UUID,
    payload: AppointmentRescheduleIn,
    session: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    appointment = repo.get_by_id(session, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")
    actor_id = subject_uuid(current_user)
    is_owner_patient = current_user.role == UserRole.CUSTOMER and appointment.patient_id == actor_id
    is_owner_provider = current_user.role == UserRole.PROVIDER and appointment.professional_id == actor_id
    if not is_owner_patient and not is_owner_provider:
        raise HTTPException(status_code=403, detail="Sem permissao para reagendar este agendamento.")
    if appointment.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Somente agendamentos ativos podem ser reagendados.")
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="Intervalo de horario invalido.")

    has_conflict = repo.has_overlapping_scheduled(
        session=session,
        professional_id=appointment.professional_id,
        start=payload.start_time,
        end=payload.end_time,
        ignore_appointment_id=appointment.id,
    )
    if has_conflict:
        raise HTTPException(status_code=409, detail="Novo horario conflita com outro agendamento.")

    appointment.start_time = payload.start_time
    appointment.end_time = payload.end_time
    professional = user_repo.get_professional_by_id(session, appointment.professional_id)
    if professional and appointment.external_event_id:
        await update_google_calendar_event(professional, appointment, appointment.external_event_id)
    saved = repo.save(session, appointment)
    return AppointmentOut.model_validate(saved, from_attributes=True)


@router.post("/provider/reconcile")
async def reconcile_provider_calendar(
    start: datetime = Query(...),
    end: datetime = Query(...),
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    provider_id = subject_uuid(current_user)
    professional = user_repo.get_professional_by_id(session, provider_id)
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional nao encontrado.")

    appointments = repo.list_scheduled_with_external_event(session, provider_id, start, end)
    checked = 0
    canceled_locally = 0

    for appointment in appointments:
        checked += 1
        exists = await google_event_exists(professional, appointment.external_event_id or "")
        if not exists:
            appointment.status = AppointmentStatus.CANCELED
            repo.save(session, appointment)
            canceled_locally += 1

    return {
        "professional_id": str(provider_id),
        "checked": checked,
        "canceled_locally": canceled_locally,
    }
