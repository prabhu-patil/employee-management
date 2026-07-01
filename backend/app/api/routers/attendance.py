from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    get_current_admin,
    get_current_employee,
    get_current_hr,
    get_current_manager,
)
from app.models.attendance import Attendance, AttendanceStatus
from app.models.user import User
from app.schemas.attendance import (
    AttendanceResponse,
    AttendanceSummaryResponse,
    CheckInRequest,
    CheckOutRequest,
)
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="")


@router.post("/check-in")
async def check_in(
    data: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    attendance = await AttendanceService.check_in(db, current_user.id, data)
    check_in_time = attendance.check_in.strftime("%H:%M:%S") if attendance.check_in else ""
    return {
        "message": f"Checked in successfully at {check_in_time}. Status: {attendance.status.value}",
        "attendance": AttendanceResponse.model_validate(attendance),
    }


@router.post("/check-out")
async def check_out(
    data: CheckOutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    attendance = await AttendanceService.check_out(db, current_user.id, data)
    total_hours = attendance.total_hours or 0
    return {
        "message": f"Checked out. Total hours today: {total_hours}h",
        "attendance": AttendanceResponse.model_validate(attendance),
    }


@router.get("/today/status")
async def today_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    today = AttendanceService._today()
    result = await db.execute(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date == today,
        )
    )
    attendance = result.scalar_one_or_none()

    attendance_response = AttendanceResponse.model_validate(attendance) if attendance else None

    return {
        "attendance": attendance_response,
        "record": attendance_response,
        "can_check_in": attendance is None,
        "can_check_out": bool(attendance and attendance.check_in and not attendance.check_out),
    }


@router.get("/my", response_model=list[AttendanceResponse])
async def my_attendance(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    today = AttendanceService._today()
    attendances = await AttendanceService.get_my_attendance(
        db,
        current_user.id,
        year or today.year,
        month or today.month,
    )
    return [AttendanceResponse.model_validate(attendance) for attendance in attendances]


@router.get("/my/summary", response_model=AttendanceSummaryResponse)
async def my_attendance_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    today = AttendanceService._today()
    return await AttendanceService.get_monthly_summary(
        db,
        current_user.id,
        year or today.year,
        month or today.month,
    )


@router.get("/today")
async def today_all(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    return await AttendanceService.get_today_all(db)


@router.get("/team/today")
async def team_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    today = AttendanceService._today()
    return await AttendanceService.get_team_attendance(db, current_user.id, today)


@router.get("/all", response_model=list[AttendanceSummaryResponse] | list[AttendanceResponse])
async def all_attendance(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    today = AttendanceService._today()
    selected_year = year or today.year
    selected_month = month or today.month

    if user_id:
        attendances = await AttendanceService.get_my_attendance(
            db,
            user_id,
            selected_year,
            selected_month,
        )
        return [AttendanceResponse.model_validate(attendance) for attendance in attendances]

    users_result = await db.execute(select(User).where(User.is_active == True))
    users = list(users_result.scalars().all())
    summaries = [
        await AttendanceService.get_monthly_summary(
            db,
            user.id,
            selected_year,
            selected_month,
        )
        for user in users
    ]
    return summaries


@router.get("/stats/today")
async def today_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    today = AttendanceService._today()

    status_result = await db.execute(
        select(
            Attendance.status,
            func.count(User.id),
        )
        .select_from(User)
        .outerjoin(
            Attendance,
            and_(
                Attendance.user_id == User.id,
                Attendance.date == today,
            ),
        )
        .where(User.is_active == True)
        .group_by(Attendance.status)
    )
    status_counts = {status: count for status, count in status_result.all()}
    total_employees = sum(status_counts.values())

    return {
        "total_employees": total_employees,
        "present": status_counts.get(AttendanceStatus.present, 0),
        "late": status_counts.get(AttendanceStatus.late, 0),
        "half_day": status_counts.get(AttendanceStatus.half_day, 0),
        "absent": status_counts.get(AttendanceStatus.absent, 0),
        "wfh": status_counts.get(AttendanceStatus.wfh, 0),
        "on_leave": status_counts.get(AttendanceStatus.on_leave, 0),
        "not_checked_in": status_counts.get(None, 0),
    }


@router.post("/admin/trigger-absent-marker")
async def trigger_absent_marker(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    await AttendanceService.mark_absent_for_today(db)
    return {
        "message": "Absent marker triggered",
        "timestamp": datetime.now().isoformat(),
    }
