from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_session
from app.models.entities import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


@dataclass
class TokenPayload:
    sub: str
    role: UserRole


def get_db_session(session: Session = Depends(get_session)) -> Session:
    return session


def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        role = payload.get("role")
        if not sub or not role:
            raise credentials_exception
        return TokenPayload(sub=sub, role=UserRole(role))
    except (JWTError, ValueError):
        raise credentials_exception


def require_role(required_role: UserRole):
    def checker(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if current_user.role != required_role:
            raise HTTPException(status_code=403, detail="Sem permissao para esta operacao.")
        return current_user

    return checker


def subject_uuid(payload: TokenPayload) -> UUID:
    return UUID(payload.sub)
