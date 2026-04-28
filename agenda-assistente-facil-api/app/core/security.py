from datetime import datetime, timedelta, timezone
from typing import Any

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fernet = Fernet(settings.data_encryption_key.encode())


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "role": role, "iat": now, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def encrypt_sensitive(value: str) -> str:
    return fernet.encrypt(value.encode()).decode()


def decrypt_sensitive(value: str) -> str:
    return fernet.decrypt(value.encode()).decode()
