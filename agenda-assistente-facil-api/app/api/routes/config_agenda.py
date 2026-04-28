from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_role, subject_uuid
from app.models.entities import ConfigAgenda, UserRole
from app.repositories.config_agenda import ConfigAgendaRepository
from app.schemas.config_agenda import ConfigAgendaOut, ConfigAgendaUpsertIn

router = APIRouter(prefix="/agenda-config", tags=["agenda-config"])
repo = ConfigAgendaRepository()


@router.get("/me", response_model=ConfigAgendaOut)
def get_my_agenda_config(
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    provider_id = subject_uuid(current_user)
    existing = repo.get_by_professional_id(session, provider_id)
    if not existing:
        default = ConfigAgenda(professional_id=provider_id, work_hours={})
        created = repo.save(session, default)
        return ConfigAgendaOut.model_validate(created, from_attributes=True)
    return ConfigAgendaOut.model_validate(existing, from_attributes=True)


@router.put("/me", response_model=ConfigAgendaOut)
def upsert_my_agenda_config(
    payload: ConfigAgendaUpsertIn,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    provider_id = subject_uuid(current_user)
    existing = repo.get_by_professional_id(session, provider_id)
    if not existing:
        existing = ConfigAgenda(
            professional_id=provider_id,
            work_hours=payload.work_hours,
            slot_duration=payload.slot_duration,
            buffer_time=payload.buffer_time,
            cancellation_deadline_hours=payload.cancellation_deadline_hours,
        )
    else:
        existing.work_hours = payload.work_hours
        existing.slot_duration = payload.slot_duration
        existing.buffer_time = payload.buffer_time
        existing.cancellation_deadline_hours = payload.cancellation_deadline_hours

    saved = repo.save(session, existing)
    return ConfigAgendaOut.model_validate(saved, from_attributes=True)
