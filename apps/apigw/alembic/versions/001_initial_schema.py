"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable PostGIS extension
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis;')
    op.execute('CREATE EXTENSION IF NOT EXISTS timescaledb;')
    
    # Create telemetry table
    op.create_table('telemetry',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('altitude', sa.Float(), nullable=True),
        sa.Column('yaw', sa.Float(), nullable=True),
        sa.Column('pitch', sa.Float(), nullable=True),
        sa.Column('roll', sa.Float(), nullable=True),
        sa.Column('speed', sa.Float(), nullable=True),
        sa.Column('battery_level', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('comms_rssi', sa.Float(), nullable=True),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('sensors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add PostGIS geometry column to telemetry
    op.execute('ALTER TABLE telemetry ADD COLUMN geom GEOMETRY(POINT, 4326);')
    op.execute('CREATE INDEX idx_telemetry_geom ON telemetry USING GIST (geom);')
    op.execute('CREATE INDEX idx_telemetry_device_timestamp ON telemetry (device_id, timestamp);')
    
    # Create detections table
    op.create_table('detections',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('bearing', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('media_ref', sa.String(length=500), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add PostGIS geometry column to detections
    op.execute('ALTER TABLE detections ADD COLUMN geom GEOMETRY(POINT, 4326);')
    op.execute('CREATE INDEX idx_detections_geom ON detections USING GIST (geom);')
    op.execute('CREATE INDEX idx_detections_device_timestamp ON detections (device_id, timestamp);')
    op.execute('CREATE INDEX idx_detections_type_confidence ON detections (type, confidence);')
    
    # Create alerts table
    op.create_table('alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=True),
        sa.Column('detection_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('acknowledged_by', sa.String(length=100), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add PostGIS geometry column to alerts
    op.execute('ALTER TABLE alerts ADD COLUMN geom GEOMETRY(POINT, 4326);')
    op.execute('CREATE INDEX idx_alerts_geom ON alerts USING GIST (geom);')
    op.execute('CREATE INDEX idx_alerts_timestamp ON alerts (timestamp);')
    op.execute('CREATE INDEX idx_alerts_severity_status ON alerts (severity, status);')
    
    # Add foreign key constraint for alerts
    op.create_foreign_key('fk_alerts_detection_id', 'alerts', 'detections', ['detection_id'], ['id'])
    
    # Create fire_lines table
    op.create_table('fire_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('width_meters', sa.Float(), nullable=True),
        sa.Column('effectiveness', sa.Float(), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add PostGIS geometry column to fire_lines
    op.execute('ALTER TABLE fire_lines ADD COLUMN geom GEOMETRY(LINESTRING, 4326);')
    op.execute('CREATE INDEX idx_fire_lines_geom ON fire_lines USING GIST (geom);')
    op.execute('CREATE INDEX idx_fire_lines_type_status ON fire_lines (type, status);')
    
    # Create env_cells table
    op.create_table('env_cells',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('h3_index', sa.String(length=20), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fuel_model', sa.Integer(), nullable=True),
        sa.Column('slope_deg', sa.Float(), nullable=True),
        sa.Column('aspect_deg', sa.Float(), nullable=True),
        sa.Column('canopy_cover', sa.Float(), nullable=True),
        sa.Column('soil_moisture', sa.Float(), nullable=True),
        sa.Column('fuel_moisture', sa.Float(), nullable=True),
        sa.Column('temperature_c', sa.Float(), nullable=True),
        sa.Column('relative_humidity', sa.Float(), nullable=True),
        sa.Column('wind_speed_mps', sa.Float(), nullable=True),
        sa.Column('wind_direction_deg', sa.Float(), nullable=True),
        sa.Column('elevation_m', sa.Float(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('h3_index')
    )
    
    # Add PostGIS geometry column to env_cells
    op.execute('ALTER TABLE env_cells ADD COLUMN geom GEOMETRY(POLYGON, 4326);')
    op.execute('CREATE INDEX idx_env_cells_geom ON env_cells USING GIST (geom);')
    op.execute('CREATE INDEX idx_env_cells_h3_timestamp ON env_cells (h3_index, timestamp);')
    op.execute('CREATE INDEX idx_env_cells_risk_score ON env_cells (risk_score);')
    
    # Create scenarios table
    op.create_table('scenarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_simulation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('results_ref', sa.String(length=500), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.execute('CREATE INDEX idx_scenarios_created_by ON scenarios (created_by);')
    op.execute('CREATE INDEX idx_scenarios_status ON scenarios (status);')
    
    # Create integrations table
    op.create_table('integrations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('target', sa.String(length=50), nullable=False),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('last_sync', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.execute('CREATE INDEX idx_integrations_target ON integrations (target);')
    op.execute('CREATE INDEX idx_integrations_status ON integrations (status);')
    
    # Create tasks table
    op.create_table('tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', sa.String(length=100), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=False),
        sa.Column('kind', sa.String(length=50), nullable=False),
        sa.Column('waypoints', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('assigned_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id')
    )
    
    op.execute('CREATE INDEX idx_tasks_device_status ON tasks (device_id, status);')
    op.execute('CREATE INDEX idx_tasks_kind ON tasks (kind);')
    
    # Convert telemetry to TimescaleDB hypertable
    op.execute("SELECT create_hypertable('telemetry', 'timestamp');")


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('tasks')
    op.drop_table('integrations')
    op.drop_table('scenarios')
    op.drop_table('env_cells')
    op.drop_table('fire_lines')
    op.drop_table('alerts')
    op.drop_table('detections')
    op.drop_table('telemetry')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS timescaledb;')
    op.execute('DROP EXTENSION IF EXISTS postgis;')
