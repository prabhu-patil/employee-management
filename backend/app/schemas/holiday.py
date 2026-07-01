from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.holiday import HolidayShift, HolidayStatus, HolidayType


class HolidayBase(BaseModel):
    holiday_no: str = Field(..., max_length=64)
    name: str = Field(..., max_length=120)
    shift: HolidayShift = HolidayShift.all_shifts
    holiday_date: date
    location: str | None = Field(default=None, max_length=120)
    holiday_type: HolidayType = HolidayType.cultural
    status: HolidayStatus = HolidayStatus.approved
    details: str | None = Field(default=None, max_length=500)


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    holiday_no: str | None = Field(default=None, max_length=64)
    name: str | None = Field(default=None, max_length=120)
    shift: HolidayShift | None = None
    holiday_date: date | None = None
    location: str | None = Field(default=None, max_length=120)
    holiday_type: HolidayType | None = None
    status: HolidayStatus | None = None
    details: str | None = Field(default=None, max_length=500)


class HolidayResponse(HolidayBase):
    model_config = {"from_attributes": True}

    id: UUID
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime | None
