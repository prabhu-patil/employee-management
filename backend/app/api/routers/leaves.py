from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_employee, get_current_hr, get_current_manager
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave import LeaveApplyRequest, LeaveResponse

router = APIRouter()


def _leave_response(leave: LeaveRequest, user: User) -> LeaveResponse:
    return LeaveResponse(
        id=leave.id,
        user_id=leave.user_id,
        employee_name=user.full_name,
        employee_email=user.email,
        employee_id=user.employee_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        approved_by=leave.approved_by,
        approved_at=leave.approved_at,
        created_at=leave.created_at,
    )


async def _get_leave_or_404(db: AsyncSession, leave_id: UUID) -> LeaveRequest:
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return leave


async def _get_user_or_404(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    return user


@router.post("/apply", response_model=LeaveResponse)
async def apply_leave(
    data: LeaveApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    leave = LeaveRequest(
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status=LeaveStatus.pending,
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return _leave_response(leave, current_user)


@router.get("/my", response_model=list[LeaveResponse])
async def my_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == current_user.id)
        .order_by(LeaveRequest.created_at.desc())
    )
    return [_leave_response(leave, current_user) for leave in result.scalars().all()]


@router.get("/team", response_model=list[LeaveResponse])
async def team_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    query = select(LeaveRequest, User).join(User, LeaveRequest.user_id == User.id)
    if current_user.role == UserRole.manager:
        query = query.where(User.manager_id == current_user.id)

    result = await db.execute(query.order_by(LeaveRequest.created_at.desc()))
    return [_leave_response(leave, user) for leave, user in result.all()]


@router.put("/{leave_id}/approve", response_model=LeaveResponse)
async def approve_leave(
    leave_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    leave = await _get_leave_or_404(db, leave_id)
    leave.status = LeaveStatus.approved
    leave.approved_by = current_user.id
    leave.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(leave)
    user = await _get_user_or_404(db, leave.user_id)
    return _leave_response(leave, user)


@router.put("/{leave_id}/reject", response_model=LeaveResponse)
async def reject_leave(
    leave_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    leave = await _get_leave_or_404(db, leave_id)
    leave.status = LeaveStatus.rejected
    leave.approved_by = current_user.id
    leave.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(leave)
    user = await _get_user_or_404(db, leave.user_id)
    return _leave_response(leave, user)
