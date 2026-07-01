from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core import security
from app.models.department import Department
from app.models.user import User, UserRole
from app.schemas.employee import CreateEmployeeRequest, DepartmentCreate, UpdateEmployeeRequest
from app.services.auth_service import AuthService


class EmployeeService:
    @staticmethod
    async def resolve_department_id(
        db: AsyncSession,
        department_id: UUID | str | None,
    ) -> UUID | None:
        if department_id is None or isinstance(department_id, UUID):
            return department_id

        department_name = department_id.strip()
        if not department_name:
            return None

        if department_name.upper().endswith("_DEPARTMENT_ID"):
            department_name = department_name[: -len("_DEPARTMENT_ID")].replace("_", " ")

        result = await db.execute(
            select(Department).where(func.lower(Department.name) == department_name.lower())
        )
        department = result.scalar_one_or_none()
        if not department:
            raise HTTPException(
                status_code=404,
                detail="Department not found. Use a valid department UUID or department name.",
            )
        return department.id

    @staticmethod
    async def get_all_employees(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
    ) -> list[dict]:
        query = (
            select(User, Department.name.label("department_name"))
            .outerjoin(Department, User.department_id == Department.id)
            .offset(skip)
            .limit(limit)
        )

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                )
            )
        if role:
            query = query.where(User.role == role)
        if department_id:
            query = query.where(User.department_id == department_id)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        result = await db.execute(query)
        return [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "employee_id": user.employee_id,
                "department_id": user.department_id,
                "department_name": department_name,
                "is_active": user.is_active,
                "avatar_url": user.avatar_url,
                "phone": user.phone,
            }
            for user, department_name in result.all()
        ]

    @staticmethod
    async def get_employee_by_id(
        db: AsyncSession,
        employee_id: UUID,
    ) -> Optional[dict]:
        Manager = aliased(User)
        query = (
            select(
                User,
                Department.name.label("department_name"),
                Manager.full_name.label("manager_name"),
            )
            .outerjoin(Department, User.department_id == Department.id)
            .outerjoin(Manager, User.manager_id == Manager.id)
            .where(User.id == employee_id)
        )

        result = await db.execute(query)
        row = result.one_or_none()
        if row is None:
            return None

        user, department_name, manager_name = row
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "employee_id": user.employee_id,
            "department_id": user.department_id,
            "department_name": department_name,
            "manager_id": user.manager_id,
            "manager_name": manager_name,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "phone": user.phone,
            "created_at": user.created_at,
        }

    @staticmethod
    async def create_employee(
        db: AsyncSession,
        data: CreateEmployeeRequest,
    ) -> User:
        email = AuthService.normalize_email(str(data.email))
        existing_user = await AuthService.get_user_by_email(db, email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        count_result = await db.execute(select(func.count(User.id)))
        employee_count = count_result.scalar_one()
        department_id = await EmployeeService.resolve_department_id(db, data.department_id)

        user = User(
            email=email,
            full_name=data.full_name,
            password_hash=security.hash_password(data.password),
            role=data.role,
            department_id=department_id,
            manager_id=data.manager_id,
            phone=data.phone,
            employee_id=f"EMP-{employee_count + 1:04d}",
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_employee(
        db: AsyncSession,
        employee_id: UUID,
        data: UpdateEmployeeRequest,
    ) -> User:
        user = await db.get(User, employee_id)
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")

        updates = data.model_dump(exclude_none=True)
        if "department_id" in updates:
            updates["department_id"] = await EmployeeService.resolve_department_id(
                db,
                updates["department_id"],
            )
        for field, value in updates.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def delete_employee(
        db: AsyncSession,
        employee_id: UUID,
    ) -> bool:
        user = await db.get(User, employee_id)
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")

        user.is_active = False
        await db.commit()
        return True

    @staticmethod
    async def get_all_departments(db: AsyncSession) -> list[Department]:
        result = await db.execute(select(Department).order_by(Department.name))
        return list(result.scalars().all())

    @staticmethod
    async def create_department(
        db: AsyncSession,
        data: DepartmentCreate,
    ) -> Department:
        existing = await db.scalar(select(Department).where(Department.name == data.name))
        if existing:
            raise HTTPException(status_code=409, detail="Department already exists")

        department = Department(
            name=data.name,
            description=data.description,
        )
        db.add(department)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Department already exists",
            ) from exc

        await db.refresh(department)
        return department
