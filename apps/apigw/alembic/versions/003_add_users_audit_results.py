"""Add users, audit, triangulation/prediction results, ingest, weather tables

Revision ID: 0003
Revises: 0002
Create Date: 2025-02-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='observer'),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('oidc_sub', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('oidc_sub'),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])

    # ── triangulation_results ──
    op.create_table(
        'triangulation_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('observation_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result_lat', sa.Float(), nullable=False),
        sa.Column('result_lon', sa.Float(), nullable=False),
        sa.Column('result_alt', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('uncertainty_m', sa.Float(), nullable=True),
        sa.Column('method', sa.String(length=50), nullable=True),
        sa.Column('quality_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.execute('ALTER TABLE triangulation_results ADD COLUMN geom GEOMETRY(POINT, 4326);')
    op.execute('CREATE INDEX idx_triangulation_results_geom ON triangulation_results USING GIST (geom);')
    op.execute('CREATE INDEX idx_triangulation_results_created ON triangulation_results (created_at);')

    # ── prediction_results ──
    op.create_table(
        'prediction_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('simulation_id', sa.String(length=100), nullable=False),
        sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('perimeter', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('isochrones', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('total_area_ha', sa.Float(), nullable=True),
        sa.Column('max_spread_mph', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('statistics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('simulation_id'),
    )
    op.execute('CREATE INDEX idx_prediction_results_sim_id ON prediction_results (simulation_id);')
    op.execute('CREATE INDEX idx_prediction_results_created ON prediction_results (created_at);')

    # ── audit_log ──
    op.create_table(
        'audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_foreign_key('fk_audit_log_user_id', 'audit_log', 'users', ['user_id'], ['id'])
    op.execute('CREATE INDEX idx_audit_log_user ON audit_log (user_id);')
    op.execute('CREATE INDEX idx_audit_log_action ON audit_log (action);')
    op.execute('CREATE INDEX idx_audit_log_created ON audit_log (created_at);')

    # ── ingest_runs ──
    op.create_table(
        'ingest_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='running'),
        sa.Column('records_fetched', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.execute('CREATE INDEX idx_ingest_runs_source ON ingest_runs (source);')
    op.execute('CREATE INDEX idx_ingest_runs_status ON ingest_runs (status);')

    # ── weather_observations ──
    op.create_table(
        'weather_observations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('station_id', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('temperature_c', sa.Float(), nullable=True),
        sa.Column('relative_humidity', sa.Float(), nullable=True),
        sa.Column('wind_speed_mps', sa.Float(), nullable=True),
        sa.Column('wind_direction_deg', sa.Float(), nullable=True),
        sa.Column('precipitation_mm', sa.Float(), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.execute('ALTER TABLE weather_observations ADD COLUMN geom GEOMETRY(POINT, 4326);')
    op.execute('CREATE INDEX idx_weather_obs_geom ON weather_observations USING GIST (geom);')
    op.execute('CREATE INDEX idx_weather_obs_timestamp ON weather_observations (timestamp);')
    op.execute('CREATE INDEX idx_weather_obs_station ON weather_observations (station_id);')

    # Add source column to env_cells if not present
    try:
        op.add_column('env_cells', sa.Column('source', sa.String(length=50), nullable=True))
    except Exception:
        pass  # Column may already exist


def downgrade() -> None:
    try:
        op.drop_column('env_cells', 'source')
    except Exception:
        pass
    op.drop_table('weather_observations')
    op.drop_table('ingest_runs')
    op.drop_table('audit_log')
    op.drop_table('prediction_results')
    op.drop_table('triangulation_results')
    op.drop_table('users')
