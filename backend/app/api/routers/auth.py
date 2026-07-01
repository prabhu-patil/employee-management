from datetime import datetime, timedelta, timezone
from random import randint
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()

oauth = OAuth()

if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing_user = await AuthService.get_user_by_email(db, register_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await AuthService.create_user(db, register_data)
    return user


@router.post("/token", response_model=TokenResponse)
async def login_form(
    username: str = Form(),
    password: str = Form(),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 compatible token login for Swagger UI"""
    email = AuthService.normalize_email(username)
    user = await AuthService.authenticate_user(db, email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ip_address = request.client.host if request and request.client else "unknown"
    device_info = request.headers.get("user-agent", "unknown") if request else "unknown"

    login_data = LoginRequest(email=email, password=password)
    await AuthService.save_login_session(db, user.id, login_data, ip_address, device_info)

    access_token = security.create_access_token({"sub": str(user.id)})
    refresh_token = security.create_refresh_token({"sub": str(user.id)})

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await AuthService.save_refresh_token(db, user.id, refresh_token, expires_at)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user = await AuthService.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ip_address = request.client.host if request.client else "unknown"
    device_info = request.headers.get("user-agent", "unknown")

    await AuthService.save_login_session(db, user.id, login_data, ip_address, device_info)

    access_token = security.create_access_token({"sub": str(user.id)})
    refresh_token = security.create_refresh_token({"sub": str(user.id)})

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await AuthService.save_refresh_token(db, user.id, refresh_token, expires_at)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(
            refresh_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    valid_token = await AuthService.get_valid_refresh_token(db, refresh_data.refresh_token)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Token revoked or expired")

    await AuthService.revoke_refresh_token(db, refresh_data.refresh_token)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = security.create_access_token({"sub": user_id})
    new_refresh_token = security.create_refresh_token({"sub": user_id})

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await AuthService.save_refresh_token(db, user_id, new_refresh_token, expires_at)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user_id=user_id,
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/logout")
async def logout(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    await AuthService.revoke_refresh_token(db, refresh_data.refresh_token)
    return {"message": "logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.get("/google")
async def google_login(request: Request):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")
    redirect_uri = str(request.url_for("google_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get("userinfo")
        if not userinfo:
            raise HTTPException(status_code=400, detail="OAuth authentication failed")

        email = userinfo.get("email")
        full_name = userinfo.get("name", email)

        user = await AuthService.get_user_by_email(db, email)
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                password_hash=None,
                role="employee",
                employee_id=f"EMP-{randint(1000, 9999)}",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        access_token = security.create_access_token({"sub": str(user.id)})
        refresh_token = security.create_refresh_token({"sub": str(user.id)})

        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await AuthService.save_refresh_token(db, user.id, refresh_token, expires_at)

        callback_params = urlencode(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "role": user.role.value,
                "full_name": user.full_name,
            }
        )
        return RedirectResponse(f"{settings.FRONTEND_URL}/oauth/callback?{callback_params}")
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?oauth_error=1")
