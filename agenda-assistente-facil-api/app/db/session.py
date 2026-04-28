from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.entities import Base

engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def create_db_and_tables() -> None:
    Base.metadata.create_all(engine)


def get_session():
    with SessionLocal() as session:
        yield session
