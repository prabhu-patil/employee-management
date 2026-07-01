from datetime import date, datetime
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AttendanceStatus(str, PyEnum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    wfh = "wfh"
    on_leave = "on_leave"


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus),
        default=AttendanceStatus.absent,
    )
    location_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    work_mode: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)

    user = relationship("User", back_populates="attendances")
