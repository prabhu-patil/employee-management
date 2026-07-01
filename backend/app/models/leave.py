from datetime import date, datetime
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class LeaveType(str, PyEnum):
    annual = "annual"
    sick = "sick"
    casual = "casual"
    unpaid = "unpaid"


class LeaveStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    leave_type: Mapped[LeaveType] = mapped_column(Enum(LeaveType), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus),
        default=LeaveStatus.pending,
    )
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="leave_requests")
