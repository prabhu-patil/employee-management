from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


class CreateEmployeeRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=8)
    role: UserRole = UserRole.employee
    department_id: Optional[UUID | str] = None
    manager_id: Optional[UUID] = None
    phone: Optional[str] = None

    @field_validator("department_id", "manager_id", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class UpdateEmployeeRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[UUID | str] = None
    manager_id: Optional[UUID] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("department_id", "manager_id", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class EmployeeDetailResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    full_name: str
    role: UserRole
    employee_id: Optional[str]
    department_id: Optional[UUID]
    department_name: Optional[str]
    manager_id: Optional[UUID]
    manager_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    phone: Optional[str]
    created_at: datetime


class EmployeeListResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    full_name: str
    role: UserRole
    employee_id: Optional[str]
    department_id: Optional[UUID]
    department_name: Optional[str]
    is_active: bool
    avatar_url: Optional[str]
    phone: Optional[str]


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None


class DepartmentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    description: Optional[str]
    head_id: Optional[UUID]
