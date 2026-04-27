from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ConfigAgenda


class ConfigAgendaRepository:
    def get_by_professional_id(self, session: Session, professional_id: UUID) -> Optional[ConfigAgenda]:
        stmt = select(ConfigAgenda).where(ConfigAgenda.professional_id == professional_id)
        return session.execute(stmt).scalar_one_or_none()

    def save(self, session: Session, entity: ConfigAgenda) -> ConfigAgenda:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity
