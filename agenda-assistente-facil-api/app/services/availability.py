from datetime import datetime, timedelta

from app.models.entities import Appointment, ConfigAgenda


def calculate_available_slots(
    config: ConfigAgenda,
    busy_events: list[Appointment],
    period_start: datetime,
    period_end: datetime,
) -> list[dict]:
    """
    Implementacao inicial:
    - percorre o periodo em blocos de `slot_duration`
    - bloqueia slots que colidem com eventos ocupados
    - aplica `buffer_time` no fim do slot
    """
    slots: list[dict] = []
    step = timedelta(minutes=config.slot_duration)
    buffer_delta = timedelta(minutes=config.buffer_time)
    cursor = period_start

    while cursor + step <= period_end:
        slot_end = cursor + step
        blocked = False

        for busy in busy_events:
            busy_start = busy.start_time - buffer_delta
            busy_end = busy.end_time + buffer_delta
            if cursor < busy_end and slot_end > busy_start:
                blocked = True
                break

        if not blocked:
            slots.append({"start_time": cursor, "end_time": slot_end})

        cursor += step

    return slots
