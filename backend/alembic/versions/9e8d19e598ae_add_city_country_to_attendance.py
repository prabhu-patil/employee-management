"""add_city_country_to_attendance

Revision ID: 9e8d19e598ae
Revises: 4c6d1f90e2ab
Create Date: 2026-05-09 20:23:59.507058

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '9e8d19e598ae'
down_revision: Union[str, Sequence[str], None] = '4c6d1f90e2ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('attendance', sa.Column('city', sa.String(), nullable=True))
    op.add_column('attendance', sa.Column('country', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('attendance', 'country')
    op.drop_column('attendance', 'city')
