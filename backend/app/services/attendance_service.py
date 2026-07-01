import calendar
from datetime import date, datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance, AttendanceStatus
from app.models.user import User
from app.schemas.attendance import CheckInRequest, CheckOutRequest
from app.schemas.attendance import AttendanceSummaryResponse


class AttendanceService:
    ATTENDANCE_TIMEZONE = ZoneInfo("Asia/Kolkata")
    LATE_CHECK_IN_TIME = time(9, 15)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(AttendanceService.ATTENDANCE_TIMEZONE)

    @staticmethod
    def _today() -> date:
        return AttendanceService._now().date()

    @staticmethod
    def _attendance_dict(attendance: Attendance, user: User) -> dict:
        return {
            "user_id": user.id,
            "full_name": user.full_name,
            "employee_id": user.employee_id,
            "email": user.email,
            "status": attendance.status,
            "check_in": attendance.check_in,
            "check_out": attendance.check_out,
            "work_mode": attendance.work_mode,
            "location_verified": attendance.location_verified,
        }

    @staticmethod
    async def check_in(
        db: AsyncSession,
        user_id: UUID,
        data: CheckInRequest,
    ) -> Attendance:
        now = AttendanceService._now()
        today = now.date()

        result = await db.execute(
            select(Attendance).where(
                Attendance.user_id == user_id,
                Attendance.date == today,
            )
        )
        existing_attendance = result.scalar_one_or_none()
        if existing_attendance:
            raise HTTPException(status_code=400, detail="Already checked in today")

        if data.work_mode == "wfh":
            status = AttendanceStatus.wfh
        elif now.time() > AttendanceService.LATE_CHECK_IN_TIME:
            status = AttendanceStatus.late
        else:
            status = AttendanceStatus.present

        attendance = Attendance(
            user_id=user_id,
            date=today,
            check_in=now,
            status=status,
            location_verified=data.latitude is not None,
            work_mode=data.work_mode,
            city=data.city,
            country=data.country,
        )

        db.add(attendance)
        await db.commit()
        await db.refresh(attendance)
        return attendance

    @staticmethod
    async def check_out(
        db: AsyncSession,
        user_id: UUID,
        data: CheckOutRequest,
    ) -> Attendance:
        today = AttendanceService._today()

        result = await db.execute(
            select(Attendance).where(
                Attendance.user_id == user_id,
                Attendance.date == today,
            )
        )
        attendance = result.scalar_one_or_none()
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        if attendance.check_out:
            raise HTTPException(status_code=400, detail="Already checked out today")
        if not attendance.check_in:
            raise HTTPException(status_code=400, detail="Check-in time not found")

        check_out = AttendanceService._now()
        attendance.check_out = check_out
        attendance.total_hours = round(
            (check_out - attendance.check_in).total_seconds() / 3600,
            2,
        )

        if attendance.total_hours < 4 and attendance.status != AttendanceStatus.on_leave:
            attendance.status = AttendanceStatus.half_day

        await db.commit()
        await db.refresh(attendance)
        return attendance

    @staticmethod
    async def get_my_attendance(
        db: AsyncSession,
        user_id: UUID,
        year: int,
        month: int,
    ) -> list[Attendance]:
        result = await db.execute(
            select(Attendance)
            .where(
                Attendance.user_id == user_id,
                extract("year", Attendance.date) == year,
                extract("month", Attendance.date) == month,
            )
            .order_by(Attendance.date.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_today_all(db: AsyncSession) -> list[dict]:
        today = AttendanceService._today()
        result = await db.execute(
            select(Attendance, User)
            .join(User, Attendance.user_id == User.id)
            .where(Attendance.date == today)
            .order_by(Attendance.check_in.asc().nulls_last())
        )
        return [
            AttendanceService._attendance_dict(attendance, user)
            for attendance, user in result.all()
        ]

    @staticmethod
    async def get_team_attendance(
        db: AsyncSession,
        manager_id: UUID,
        date: date,
    ) -> list[dict]:
        result = await db.execute(
            select(Attendance, User)
            .join(User, Attendance.user_id == User.id)
            .where(
                User.manager_id == manager_id,
                Attendance.date == date,
            )
            .order_by(Attendance.check_in.asc().nulls_last())
        )
        return [
            AttendanceService._attendance_dict(attendance, user)
            for attendance, user in result.all()
        ]

    @staticmethod
    async def get_monthly_summary(
        db: AsyncSession,
        user_id: UUID,
        year: int,
        month: int,
    ) -> AttendanceSummaryResponse:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        result = await db.execute(
            select(Attendance).where(
                Attendance.user_id == user_id,
                extract("year", Attendance.date) == year,
                extract("month", Attendance.date) == month,
            )
        )
        attendances = list(result.scalars().all())

        present_statuses = {
            AttendanceStatus.present,
            AttendanceStatus.late,
            AttendanceStatus.wfh,
            AttendanceStatus.half_day,
        }
        present_days = sum(1 for item in attendances if item.status in present_statuses)
        absent_days = sum(1 for item in attendances if item.status == AttendanceStatus.absent)
        late_days = sum(1 for item in attendances if item.status == AttendanceStatus.late)
        wfh_days = sum(1 for item in attendances if item.status == AttendanceStatus.wfh)
        total_hours = round(
            sum(item.total_hours for item in attendances if item.total_hours is not None),
            2,
        )

        _, days_in_month = calendar.monthrange(year, month)
        working_days = sum(
            1
            for day in range(1, days_in_month + 1)
            if date(year, month, day).weekday() < 5
        )
        attendance_percentage = (
            min((present_days / working_days) * 100, 100) if working_days else 0
        )

        return AttendanceSummaryResponse(
            user_id=user.id,
            full_name=user.full_name,
            employee_id=user.employee_id,
            present_days=present_days,
            absent_days=absent_days,
            late_days=late_days,
            wfh_days=wfh_days,
            total_hours=total_hours,
            attendance_percentage=round(attendance_percentage, 1),
        )

    @staticmethod
    async def mark_absent_for_today(db: AsyncSession) -> None:
        today = AttendanceService._today()

        users_result = await db.execute(select(User).where(User.is_active == True))
        active_users = list(users_result.scalars().all())
        if not active_users:
            return

        attendance_result = await db.execute(
            select(Attendance.user_id).where(Attendance.date == today)
        )
        existing_user_ids = set(attendance_result.scalars().all())

        missing_attendances = [
            Attendance(
                user_id=user.id,
                date=today,
                status=AttendanceStatus.absent,
                location_verified=False,
            )
            for user in active_users
            if user.id not in existing_user_ids
        ]

        if not missing_attendances:
            return

        db.add_all(missing_attendances)
        await db.commit()
