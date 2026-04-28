from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import UserPatient, UserProfessional


class UserRepository:
    def get_professional_by_email(self, session: Session, email: str) -> Optional[UserProfessional]:
        return session.execute(select(UserProfessional).where(UserProfessional.email == email)).scalar_one_or_none()

    def get_patient_by_email(self, session: Session, email: str) -> Optional[UserPatient]:
        return session.execute(select(UserPatient).where(UserPatient.email == email)).scalar_one_or_none()

    def get_professional_by_id(self, session: Session, professional_id: UUID) -> Optional[UserProfessional]:
        return session.execute(select(UserProfessional).where(UserProfessional.id == professional_id)).scalar_one_or_none()

    def get_patient_by_id(self, session: Session, patient_id: UUID) -> Optional[UserPatient]:
        return session.execute(select(UserPatient).where(UserPatient.id == patient_id)).scalar_one_or_none()

    def create_professional(self, session: Session, entity: UserProfessional) -> UserProfessional:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def create_patient(self, session: Session, entity: UserPatient) -> UserPatient:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

    def save_professional(self, session: Session, entity: UserProfessional) -> UserProfessional:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity
