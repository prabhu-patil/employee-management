from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    get_current_admin,
    get_current_employee,
    get_current_hr,
    get_current_manager,
)
from app.models.user import User, UserRole
from app.schemas.employee import (
    CreateEmployeeRequest,
    DepartmentCreate,
    DepartmentResponse,
    EmployeeDetailResponse,
    EmployeeListResponse,
    UpdateEmployeeRequest,
)
from app.services.employee_service import EmployeeService

router = APIRouter()

UPLOAD_DIR = Path("uploads")
MAX_AVATAR_SIZE = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png"}


@router.get("/", response_model=list[EmployeeListResponse])
async def list_employees(
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    department_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    return await EmployeeService.get_all_employees(
        db,
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        department_id=department_id,
        is_active=is_active,
    )


@router.get("/departments/", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    return await EmployeeService.get_all_departments(db)


@router.post(
    "/departments/",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return await EmployeeService.create_department(db, data)


@router.get("/me/profile", response_model=EmployeeDetailResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    employee = await EmployeeService.get_employee_by_id(db, current_user.id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.get("/{employee_id}", response_model=EmployeeDetailResponse)
async def get_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    employee = await EmployeeService.get_employee_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.post(
    "/",
    response_model=EmployeeDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    data: CreateEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await EmployeeService.create_employee(db, data)
    employee = await EmployeeService.get_employee_by_id(db, user.id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/{employee_id}", response_model=EmployeeDetailResponse)
async def update_employee(
    employee_id: UUID,
    data: UpdateEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr),
):
    user = await EmployeeService.update_employee(db, employee_id, data)
    employee = await EmployeeService.get_employee_by_id(db, user.id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    await EmployeeService.delete_employee(db, employee_id)
    return {
        "message": "Employee deactivated",
        "employee_id": str(employee_id),
    }


@router.post("/{employee_id}/avatar", response_model=EmployeeDetailResponse)
async def upload_avatar(
    employee_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_employee),
):
    is_self = current_user.id == employee_id
    is_privileged = current_user.role in (UserRole.admin, UserRole.hr)
    if not is_self and not is_privileged:
        raise HTTPException(
            status_code=403,
            detail="You can only upload your own avatar",
        )

    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Avatar must be a JPEG or PNG image",
        )

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Avatar must be under 2MB",
        )

    user = await db.get(User, employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    avatar_path = UPLOAD_DIR / f"{employee_id}.jpg"
    avatar_path.write_bytes(content)

    user.avatar_url = f"/static/{employee_id}.jpg"
    await db.commit()
    await db.refresh(user)

    employee = await EmployeeService.get_employee_by_id(db, user.id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee
