"""
Shared enumerations for mission and task statuses.
"""
from enum import Enum


class MissionStatus(str, Enum):
    PROPOSED = "proposed"
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    PATROL = "patrol"
    HOLD = "hold"
    SURVEY_SMOKE = "survey_smoke"
    BUILD_LINE = "build_line"
    EMBER_DAMP = "ember_damp"
    SURVEILLANCE = "surveillance"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
