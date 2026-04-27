from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.entities import AppointmentStatus


class AppointmentCreateIn(BaseModel):
    professional_id: UUID
    start_time: datetime
    end_time: datetime


class AppointmentOut(BaseModel):
    id: UUID
    professional_id: UUID
    patient_id: UUID
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus


class AppointmentRescheduleIn(BaseModel):
    start_time: datetime
    end_time: datetime
