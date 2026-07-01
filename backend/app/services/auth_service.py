from datetime import datetime, timezone
from random import randint
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.models.login_session import LoginSession
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest


class AuthService:
    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(
            select(User).where(User.email == AuthService.normalize_email(email))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(db: AsyncSession, register_data: RegisterRequest) -> User:
        user = User(
            email=AuthService.normalize_email(register_data.email),
            full_name=register_data.full_name,
            password_hash=security.hash_password(register_data.password),
            role=register_data.role,
            employee_id=f"EMP-{randint(1000, 9999)}",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate_user(
        db: AsyncSession, email: str, password: str
    ) -> Optional[User]:
        user = await AuthService.get_user_by_email(db, email)
        if not user or not user.password_hash:
            return None
        if not security.verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    async def save_login_session(
        db: AsyncSession,
        user_id: str,
        login_data: LoginRequest,
        ip_address: str,
        device_info: str,
    ) -> None:
        session = LoginSession(
            user_id=user_id,
            ip_address=ip_address,
            latitude=login_data.latitude,
            longitude=login_data.longitude,
            city=login_data.city,
            country=login_data.country,
            device_info=device_info,
        )
        db.add(session)
        await db.commit()

    @staticmethod
    async def save_refresh_token(
        db: AsyncSession, user_id: str, token: str, expires_at: datetime
    ) -> None:
        refresh_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
        db.add(refresh_token)
        await db.commit()

    @staticmethod
    async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        refresh_token = result.scalar_one_or_none()
        if refresh_token:
            refresh_token.is_revoked = True
            await db.commit()

    @staticmethod
    async def get_valid_refresh_token(
        db: AsyncSession, token: str
    ) -> Optional[RefreshToken]:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        refresh_token = result.scalar_one_or_none()
        if not refresh_token or refresh_token.is_revoked:
            return None
        if refresh_token.expires_at < datetime.now(timezone.utc):
            return None
        return refresh_token
