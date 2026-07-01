from datetime import date
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ProjectStatus(str, PyEnum):
    new = "new"
    running = "running"
    finished = "finished"
    on_hold = "on_hold"


class ProjectPriority(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"


class ProjectTag(str, PyEnum):
    web = "web"
    android = "android"
    ios = "ios"
    backend = "backend"
    testing = "testing"
    design = "design"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    tag: Mapped[ProjectTag] = mapped_column(
        Enum(ProjectTag), default=ProjectTag.web, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_leader: Mapped[str] = mapped_column(String(120), nullable=False)
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority), default=ProjectPriority.medium, nullable=False
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.new, nullable=False
    )
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bugs_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
