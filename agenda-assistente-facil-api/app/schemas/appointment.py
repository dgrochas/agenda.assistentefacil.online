from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Optional

from app.models.entities import AppointmentStatus, AppointmentType


class EventTypeBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 30
    color: Optional[str] = None


class EventTypeCreateIn(EventTypeBase):
    pass


class EventTypeUpdateIn(EventTypeBase):
    is_active: Optional[bool] = None


class EventTypeOut(EventTypeBase):
    id: UUID
    professional_id: UUID
    is_active: bool


class AppointmentCreateIn(BaseModel):
    professional_id: UUID
    start_time: datetime
    end_time: datetime
    appointment_type: Optional[AppointmentType] = AppointmentType.PATIENT_APPOINTMENT
    patient_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None


class AppointmentOut(BaseModel):
    id: UUID
    professional_id: UUID
    patient_id: Optional[UUID]
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    appointment_type: AppointmentType
    title: Optional[str]
    description: Optional[str]


class AppointmentRescheduleIn(BaseModel):
    start_time: datetime
    end_time: datetime
