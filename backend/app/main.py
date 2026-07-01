import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.api.routers import attendance, auth, dashboard, employees, holidays, leaves, projects
from app.core.config import settings
from app.core.scheduler import start_scheduler, stop_scheduler


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    logger.info("Application started")
    yield
    stop_scheduler()


app = FastAPI(
    title="Employee Management API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

os.makedirs("uploads", exist_ok=True)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.include_router(auth.router, prefix="/api/auth")
app.include_router(employees.router, prefix="/api/employees")
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(attendance.router, prefix="/api/attendance")
app.include_router(leaves.router, prefix="/api/leaves")
app.include_router(holidays.router, prefix="/api/holidays", tags=["holidays"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "employee-management-api"}
