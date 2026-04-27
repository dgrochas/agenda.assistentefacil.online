from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.db.session import create_db_and_tables

app = FastAPI(title=settings.app_name)
app.include_router(api_router)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


@app.get("/health")
def healthcheck():
    return {"status": "ok"}
