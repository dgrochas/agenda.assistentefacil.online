from pydantic import BaseModel, EmailStr

from app.models.entities import UserRole


class RegisterProviderIn(BaseModel):
    email: EmailStr
    password: str
    slug_url: str


class RegisterCustomerIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: str


class TokenRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
