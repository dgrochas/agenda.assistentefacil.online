from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    PROVIDER = "provider"
    CUSTOMER = "customer"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELED = "canceled"
    COMPLETED = "completed"


class UserProfessional(Base):
    __tablename__ = "userprofessional"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(String(4096), nullable=True)
    slug_url: Mapped[str] = mapped_column(String(255), unique=True, index=True)


class UserPatient(Base):
    __tablename__ = "userpatient"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(50))


class ConfigAgenda(Base):
    __tablename__ = "configagenda"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    professional_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("userprofessional.id"), unique=True, index=True
    )
    work_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    slot_duration: Mapped[int] = mapped_column(Integer, default=30)
    buffer_time: Mapped[int] = mapped_column(Integer, default=10)
    cancellation_deadline_hours: Mapped[int] = mapped_column(Integer, default=24)


class AppointmentType(str, Enum):
    PATIENT_APPOINTMENT = "patient_appointment"
    PERSONAL_BLOCK = "personal_block"


class Appointment(Base):
    __tablename__ = "appointment"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    professional_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("userprofessional.id"), index=True)
    patient_id: Mapped[Optional[UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("userpatient.id"), index=True, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[AppointmentStatus] = mapped_column(
        SAEnum(AppointmentStatus), default=AppointmentStatus.SCHEDULED
    )
    appointment_type: Mapped[AppointmentType] = mapped_column(
        SAEnum(AppointmentType), default=AppointmentType.PATIENT_APPOINTMENT
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    external_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class EventType(Base):
    __tablename__ = "eventtype"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    professional_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("userprofessional.id"), unique=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(default=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # Hex color
