from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from app.models.attendance import AttendanceStatus


class CheckInRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
    work_mode: str = Field(default="office", pattern="^(office|wfh|hybrid)$")


class CheckOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    date: date
    check_in: Optional[datetime]
    check_out: Optional[datetime]
    total_hours: Optional[float]
    status: AttendanceStatus
    location_verified: bool
    work_mode: Optional[str]
    city: Optional[str] = None
    country: Optional[str] = None

    @field_serializer("total_hours")
    def serialize_total_hours(self, total_hours: Optional[float]) -> Optional[float]:
        return round(total_hours, 2) if total_hours is not None else None


class AttendanceSummaryResponse(BaseModel):
    model_config = {"from_attributes": True}

    user_id: UUID
    full_name: str
    employee_id: Optional[str]
    present_days: int
    absent_days: int
    late_days: int
    wfh_days: int
    total_hours: float
    attendance_percentage: float

    @field_serializer("attendance_percentage")
    def serialize_attendance_percentage(self, attendance_percentage: float) -> float:
        return round(attendance_percentage, 1)


class MonthlyAttendanceRequest(BaseModel):
    year: int
    month: int = Field(ge=1, le=12)
    user_id: Optional[UUID] = None
