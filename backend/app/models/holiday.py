from datetime import date
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class HolidayType(str, PyEnum):
    national = "national"
    religious = "religious"
    cultural = "cultural"
    awareness = "awareness"
    environmental = "environmental"


class HolidayShift(str, PyEnum):
    all_shifts = "all_shifts"
    day_shift = "day_shift"
    night_shifts = "night_shifts"


class HolidayStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"


class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    holiday_no: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    shift: Mapped[HolidayShift] = mapped_column(
        Enum(HolidayShift), default=HolidayShift.all_shifts, nullable=False
    )
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    holiday_type: Mapped[HolidayType] = mapped_column(
        Enum(HolidayType), default=HolidayType.cultural, nullable=False
    )
    status: Mapped[HolidayStatus] = mapped_column(
        Enum(HolidayStatus), default=HolidayStatus.approved, nullable=False
    )
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
