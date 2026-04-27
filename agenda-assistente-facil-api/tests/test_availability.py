from datetime import datetime, timezone
from uuid import uuid4

from app.models.entities import Appointment, ConfigAgenda
from app.services.availability import calculate_available_slots


def test_calculate_available_slots_blocks_busy_window():
    config = ConfigAgenda(
        professional_id=uuid4(),
        work_hours={"mon": [{"start": "08:00", "end": "10:00"}]},
        slot_duration=30,
        buffer_time=0,
    )
    busy = [
        Appointment(
            professional_id=uuid4(),
            patient_id=uuid4(),
            start_time=datetime(2026, 1, 5, 8, 30, tzinfo=timezone.utc),
            end_time=datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc),
        )
    ]
    slots = calculate_available_slots(
        config=config,
        busy_events=busy,
        period_start=datetime(2026, 1, 5, 8, 0, tzinfo=timezone.utc),
        period_end=datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc),
    )

    slot_ranges = {(s["start_time"].hour, s["start_time"].minute) for s in slots}
    assert (8, 30) not in slot_ranges
    assert (8, 0) in slot_ranges
    assert (9, 0) in slot_ranges
