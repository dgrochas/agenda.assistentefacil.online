from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import EventType


class EventTypeRepository:
    def create(self, session: Session, entity: EventType) -> EventType:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def list_by_professional(self, session: Session, professional_id: UUID) -> list[EventType]:
        stmt = select(EventType).where(
            EventType.professional_id == professional_id
        ).order_by(EventType.title)
        return list(session.execute(stmt).scalars().all())

    def list_active_by_professional(self, session: Session, professional_id: UUID) -> list[EventType]:
        stmt = select(EventType).where(
            EventType.professional_id == professional_id,
            EventType.is_active == True
        ).order_by(EventType.title)
        return list(session.execute(stmt).scalars().all())

    def get_by_id(self, session: Session, event_type_id: UUID) -> EventType | None:
        stmt = select(EventType).where(EventType.id == event_type_id)
        return session.execute(stmt).scalar_one_or_none()

    def update(self, session: Session, entity: EventType) -> EventType:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def delete(self, session: Session, event_type_id: UUID) -> bool:
        entity = self.get_by_id(session, event_type_id)
        if entity:
            session.delete(entity)
            session.commit()
            return True
        return False
