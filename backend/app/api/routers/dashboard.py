from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_hr, get_current_manager
from app.models.attendance import Attendance, AttendanceStatus
from app.models.department import Department
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.login_session import LoginSession
from app.models.user import User, UserRole

router = APIRouter()

PRESENT_STATUSES = [
    AttendanceStatus.present,
    AttendanceStatus.late,
    AttendanceStatus.wfh,
]


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    today = datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (
        month_start.replace(year=month_start.year + 1, month=1)
        if month_start.month == 12
        else month_start.replace(month=month_start.month + 1)
    )

    total_employees_result = await db.execute(
        select(func.count(User.id)).where(
            User.is_active == True,
            User.role == UserRole.employee,
        )
    )
    total_employees = total_employees_result.scalar_one()

    attendance_counts_result = await db.execute(
        select(Attendance.status, func.count(Attendance.id))
        .where(Attendance.date == today)
        .group_by(Attendance.status)
    )
    attendance_counts = {
        status: count for status, count in attendance_counts_result.all()
    }

    pending_leaves_result = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.status == LeaveStatus.pending
        )
    )
    pending_leaves = pending_leaves_result.scalar_one()

    new_employees_result = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= month_start,
            User.created_at < next_month,
        )
    )
    new_employees_this_month = new_employees_result.scalar_one()

    present_today = sum(
        attendance_counts.get(status, 0) for status in PRESENT_STATUSES
    )
    attendance_percentage_today = (
        round((present_today / total_employees) * 100, 1)
        if total_employees > 0
        else 0
    )

    return {
        "total_employees": total_employees,
        "present_today": present_today,
        "absent_today": attendance_counts.get(AttendanceStatus.absent, 0),
        "late_today": attendance_counts.get(AttendanceStatus.late, 0),
        "on_leave_today": attendance_counts.get(AttendanceStatus.on_leave, 0),
        "wfh_today": attendance_counts.get(AttendanceStatus.wfh, 0),
        "pending_leaves": pending_leaves,
        "new_employees_this_month": new_employees_this_month,
        "attendance_percentage_today": attendance_percentage_today,
    }


@router.get("/weekly-attendance")
async def weekly_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)

    result = await db.execute(
        select(
            Attendance.date,
            Attendance.status,
            func.count(Attendance.id),
        )
        .where(Attendance.date >= start_date)
        .group_by(Attendance.date, Attendance.status)
        .order_by(Attendance.date)
    )

    rows_by_date = {
        (start_date + timedelta(days=offset)): {
            "date": (start_date + timedelta(days=offset)).isoformat(),
            "present": 0,
            "absent": 0,
            "late": 0,
            "wfh": 0,
        }
        for offset in range(7)
    }

    for attendance_date, status, count in result.all():
        if attendance_date not in rows_by_date:
            continue
        if status == AttendanceStatus.present:
            rows_by_date[attendance_date]["present"] = count
        elif status == AttendanceStatus.absent:
            rows_by_date[attendance_date]["absent"] = count
        elif status == AttendanceStatus.late:
            rows_by_date[attendance_date]["late"] = count
        elif status == AttendanceStatus.wfh:
            rows_by_date[attendance_date]["wfh"] = count

    return list(rows_by_date.values())


@router.get("/department-breakdown")
async def department_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    today = datetime.now(timezone.utc).date()

    result = await db.execute(
        select(
            Department.name.label("department_name"),
            func.count(distinct(User.id)).label("total_employees"),
            func.count(distinct(Attendance.user_id)).label("present_today"),
        )
        .select_from(Department)
        .outerjoin(
            User,
            and_(
                User.department_id == Department.id,
                User.is_active == True,
                User.role == UserRole.employee,
            ),
        )
        .outerjoin(
            Attendance,
            and_(
                Attendance.user_id == User.id,
                Attendance.date == today,
                Attendance.status.in_(PRESENT_STATUSES),
            ),
        )
        .group_by(Department.id, Department.name)
        .order_by(Department.name)
    )

    return [
        {
            "department_name": department_name,
            "total_employees": total_employees,
            "present_today": present_today,
        }
        for department_name, total_employees, present_today in result.all()
    ]


@router.get("/recent-logins")
async def recent_logins(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    result = await db.execute(
        select(
            LoginSession.user_id,
            User.full_name,
            User.employee_id,
            LoginSession.login_at,
            LoginSession.city,
            LoginSession.country,
            LoginSession.latitude,
            LoginSession.longitude,
            LoginSession.device_info,
        )
        .join(User, LoginSession.user_id == User.id)
        .order_by(LoginSession.login_at.desc())
        .limit(20)
    )

    return [
        {
            "user_id": user_id,
            "full_name": full_name,
            "employee_id": employee_id,
            "login_at": login_at,
            "city": city,
            "country": country,
            "latitude": latitude,
            "longitude": longitude,
            "device_info": device_info,
        }
        for (
            user_id,
            full_name,
            employee_id,
            login_at,
            city,
            country,
            latitude,
            longitude,
            device_info,
        ) in result.all()
    ]
