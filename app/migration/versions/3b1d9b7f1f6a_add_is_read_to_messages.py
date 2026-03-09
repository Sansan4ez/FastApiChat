"""add is_read to messages

Revision ID: 3b1d9b7f1f6a
Revises: 6b2520ba62db
Create Date: 2026-03-10 00:35:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3b1d9b7f1f6a'
down_revision: Union[str, None] = '6b2520ba62db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('messages', sa.Column('is_read', sa.Boolean(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    op.drop_column('messages', 'is_read')
