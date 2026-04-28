from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, subject_uuid
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import UserPatient, UserProfessional, UserRole
from app.repositories.users import UserRepository
from app.schemas.auth import (
    RegisterCustomerIn,
    RegisterProviderIn,
    TokenRequest,
    TokenResponse,
)
from app.services.google_calendar import (
    apply_oauth_tokens,
    build_google_oauth_url,
    exchange_code_for_tokens,
    extract_provider_id_from_state,
)

router = APIRouter(prefix="/auth", tags=["auth"])
user_repo = UserRepository()


@router.post("/register/provider", status_code=201)
def register_provider(payload: RegisterProviderIn, session: Session = Depends(get_db_session)):
    existing = user_repo.get_professional_by_email(session, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="E-mail ja cadastrado.")

    entity = UserProfessional(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        slug_url=payload.slug_url,
    )
    created = user_repo.create_professional(session, entity)
    return {"id": str(created.id), "email": created.email}


@router.post("/register/customer", status_code=201)
def register_customer(payload: RegisterCustomerIn, session: Session = Depends(get_db_session)):
    existing = user_repo.get_patient_by_email(session, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="E-mail ja cadastrado.")

    entity = UserPatient(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
    )
    created = user_repo.create_patient(session, entity)
    return {"id": str(created.id), "email": created.email}


@router.post("/token", response_model=TokenResponse)
def login(payload: TokenRequest, session: Session = Depends(get_db_session)):
    if payload.role == UserRole.PROVIDER:
        user = user_repo.get_professional_by_email(session, payload.email)
    else:
        user = user_repo.get_patient_by_email(session, payload.email)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario ou senha invalidos.")

    token = create_access_token(subject=str(user.id), role=payload.role.value)
    return TokenResponse(access_token=token)


@router.get("/provider/google/start")
def google_oauth_start(
    current_user=Depends(get_current_user),
):
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(status_code=403, detail="Apenas profissionais podem conectar o Google.")
    provider_id = subject_uuid(current_user)
    return {"authorization_url": build_google_oauth_url(provider_id)}


@router.get("/provider/google/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    session: Session = Depends(get_db_session),
):
    provider_id = extract_provider_id_from_state(state)
    professional = user_repo.get_professional_by_id(session, provider_id)
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional nao encontrado.")

    token_payload = await exchange_code_for_tokens(code)
    apply_oauth_tokens(professional, token_payload)
    user_repo.save_professional(session, professional)
    return {"status": "google_connected"}
