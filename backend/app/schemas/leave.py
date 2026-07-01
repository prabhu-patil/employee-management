from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.leave import LeaveStatus, LeaveType


class LeaveApplyRequest(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_date_range(self) -> "LeaveApplyRequest":
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date")
        return self


class LeaveResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    employee_name: str
    employee_email: str
    employee_id: str | None
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str | None
    status: LeaveStatus
    approved_by: UUID | None
    approved_at: datetime | None
    created_at: datetime
