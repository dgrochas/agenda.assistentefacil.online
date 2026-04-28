from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Appointment, AppointmentStatus


class AppointmentRepository:
    def create(self, session: Session, entity: Appointment) -> Appointment:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def list_by_patient(self, session: Session, patient_id: UUID) -> list[Appointment]:
        stmt = select(Appointment).where(Appointment.patient_id == patient_id)
        return list(session.execute(stmt).scalars().all())

    def list_busy_for_professional(
        self, session: Session, professional_id: UUID, start: datetime, end: datetime
    ) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .where(Appointment.professional_id == professional_id)
            .where(Appointment.start_time < end)
            .where(Appointment.end_time > start)
        )
        return list(session.execute(stmt).scalars().all())

    def list_by_professional_period(
        self, session: Session, professional_id: UUID, start: datetime, end: datetime
    ) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .where(Appointment.professional_id == professional_id)
            .where(Appointment.start_time >= start)
            .where(Appointment.start_time <= end)
            .order_by(Appointment.start_time)
        )
        return list(session.execute(stmt).scalars().all())

    def list_scheduled_with_external_event(
        self, session: Session, professional_id: UUID, start: datetime, end: datetime
    ) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .where(Appointment.professional_id == professional_id)
            .where(Appointment.status == AppointmentStatus.SCHEDULED)
            .where(Appointment.external_event_id.is_not(None))
            .where(Appointment.start_time >= start)
            .where(Appointment.start_time <= end)
            .order_by(Appointment.start_time)
        )
        return list(session.execute(stmt).scalars().all())

    def get_by_id(self, session: Session, appointment_id: UUID) -> Appointment | None:
        stmt = select(Appointment).where(Appointment.id == appointment_id)
        return session.execute(stmt).scalar_one_or_none()

    def save(self, session: Session, entity: Appointment) -> Appointment:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def has_overlapping_scheduled(
        self,
        session: Session,
        professional_id: UUID,
        start: datetime,
        end: datetime,
        ignore_appointment_id: UUID | None = None,
    ) -> bool:
        stmt = (
            select(Appointment)
            .where(Appointment.professional_id == professional_id)
            .where(Appointment.status == AppointmentStatus.SCHEDULED)
            .where(Appointment.start_time < end)
            .where(Appointment.end_time > start)
        )
        if ignore_appointment_id:
            stmt = stmt.where(Appointment.id != ignore_appointment_id)
        return session.execute(stmt).scalar_one_or_none() is not None

    def find_same_scheduled_for_patient(
        self,
        session: Session,
        patient_id: UUID,
        professional_id: UUID,
        start: datetime,
        end: datetime,
    ) -> Appointment | None:
        stmt = (
            select(Appointment)
            .where(Appointment.patient_id == patient_id)
            .where(Appointment.professional_id == professional_id)
            .where(Appointment.start_time == start)
            .where(Appointment.end_time == end)
            .where(Appointment.status == AppointmentStatus.SCHEDULED)
        )
        return session.execute(stmt).scalar_one_or_none()
