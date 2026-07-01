"""add_attendance_work_mode

Revision ID: 4c6d1f90e2ab
Revises: 0bed2e37d68b
Create Date: 2026-05-08 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4c6d1f90e2ab"
down_revision: Union[str, Sequence[str], None] = "0bed2e37d68b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("attendance", sa.Column("work_mode", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("attendance", "work_mode")
