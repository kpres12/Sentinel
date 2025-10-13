"""Add missions table

Revision ID: 0002
Revises: 0001
Create Date: 2025-10-13 22:36:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'missions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mission_id', sa.String(length=100), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('radius', sa.Float(), nullable=True),
        sa.Column('waypoints', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('assets', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('estimated_duration', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mission_id')
    )
    op.create_index('idx_missions_status', 'missions', ['status'])
    op.create_index('idx_missions_created_at', 'missions', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_missions_created_at', table_name='missions')
    op.drop_index('idx_missions_status', table_name='missions')
    op.drop_table('missions')