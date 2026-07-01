from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_employee, get_current_hr
from app.models.holiday import Holiday
from app.models.user import User
from app.schemas.holiday import HolidayCreate, HolidayResponse, HolidayUpdate

router = APIRouter()


@router.get("", response_model=list[HolidayResponse])
async def list_holidays(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    result = await db.execute(
        select(Holiday).order_by(Holiday.holiday_date.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=HolidayResponse, status_code=201)
async def create_holiday(
    data: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    holiday = Holiday(
        holiday_no=data.holiday_no,
        name=data.name,
        shift=data.shift,
        holiday_date=data.holiday_date,
        location=data.location,
        holiday_type=data.holiday_type,
        status=data.status,
        details=data.details,
        created_by=current_user.id,
    )
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)
    return holiday


@router.put("/{holiday_id}", response_model=HolidayResponse)
async def update_holiday(
    holiday_id: UUID,
    data: HolidayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    holiday = result.scalar_one_or_none()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(holiday, field, value)

    await db.commit()
    await db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}", status_code=204)
async def delete_holiday(
    holiday_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    holiday = result.scalar_one_or_none()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    await db.delete(holiday)
    await db.commit()
