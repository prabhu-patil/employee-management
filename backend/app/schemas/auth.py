from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=8)
    role: Optional[UserRole] = UserRole.employee

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: Optional[str]
    employee_id: Optional[str]
