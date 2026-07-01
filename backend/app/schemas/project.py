from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.project import ProjectPriority, ProjectStatus, ProjectTag


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=160)
    tag: ProjectTag = ProjectTag.web
    description: str | None = Field(default=None, max_length=2000)
    team_leader: str = Field(..., max_length=120)
    priority: ProjectPriority = ProjectPriority.medium
    status: ProjectStatus = ProjectStatus.new
    deadline: date | None = None
    progress: int = Field(default=0, ge=0, le=100)
    comments_count: int = Field(default=0, ge=0)
    bugs_count: int = Field(default=0, ge=0)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    tag: ProjectTag | None = None
    description: str | None = Field(default=None, max_length=2000)
    team_leader: str | None = Field(default=None, max_length=120)
    priority: ProjectPriority | None = None
    status: ProjectStatus | None = None
    deadline: date | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    comments_count: int | None = Field(default=None, ge=0)
    bugs_count: int | None = Field(default=None, ge=0)


class ProjectResponse(ProjectBase):
    model_config = {"from_attributes": True}

    id: UUID
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime | None
