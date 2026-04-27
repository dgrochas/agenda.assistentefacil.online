from fastapi import APIRouter

from app.api.routes import appointments, auth, config_agenda

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(appointments.router)
api_router.include_router(config_agenda.router)
