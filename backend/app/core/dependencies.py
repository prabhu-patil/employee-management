from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Paste only the raw JWT access token. Do not include Bearer or quotes.",
)


def _normalize_bearer_token(credentials: HTTPAuthorizationCredentials) -> str:
    token = credentials.credentials.strip()

    if credentials.scheme.lower() != "bearer":
        return ""

    # Swagger UI already adds the Bearer scheme. If a user pastes
    # `Bearer "token"` anyway, normalize it before JWT verification.
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    if len(token) >= 2 and token[0] == token[-1] and token[0] in {'"', "'"}:
        token = token[1:-1].strip()

    return token


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = _normalize_bearer_token(credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_current_hr(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.admin, UserRole.hr]:
        raise HTTPException(status_code=403, detail="HR access required")
    return user


async def get_current_manager(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.admin, UserRole.hr, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Manager access required")
    return user


async def get_current_employee(user: User = Depends(get_current_user)) -> User:
    return user
