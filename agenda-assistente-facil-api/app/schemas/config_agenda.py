from pydantic import BaseModel, Field


class ConfigAgendaUpsertIn(BaseModel):
    work_hours: dict = Field(
        default_factory=lambda: {
            "mon": [{"start": "08:00", "end": "18:00"}],
            "tue": [{"start": "08:00", "end": "18:00"}],
            "wed": [{"start": "08:00", "end": "18:00"}],
            "thu": [{"start": "08:00", "end": "18:00"}],
            "fri": [{"start": "08:00", "end": "18:00"}],
        }
    )
    slot_duration: int = 30
    buffer_time: int = 10
    cancellation_deadline_hours: int = 24


class ConfigAgendaOut(BaseModel):
    work_hours: dict
    slot_duration: int
    buffer_time: int
    cancellation_deadline_hours: int
