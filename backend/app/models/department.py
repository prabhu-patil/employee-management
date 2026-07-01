from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    head_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
