from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserRole(str, PyEnum):
    admin = "admin"
    hr = "hr"
    manager = "manager"
    employee = "employee"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.employee)
    department_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("departments.id"),
        nullable=True,
    )
    manager_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

    login_sessions = relationship("LoginSession", back_populates="user")
    attendances = relationship("Attendance", back_populates="user")
    leave_requests = relationship(
        "LeaveRequest",
        foreign_keys="LeaveRequest.user_id",
        back_populates="user",
    )
    refresh_tokens = relationship("RefreshToken", back_populates="user")
