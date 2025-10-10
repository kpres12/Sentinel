"""
Shared schemas and data models for wildfire operations platform.
"""

from .telemetry import (
    TelemetryData,
    Detection,
    Task,
    Alert,
    Point,
    SensorReading,
    DeviceStatus,
    DetectionType,
    TaskKind,
    TaskStatus,
    AlertType,
    AlertSeverity,
    AlertStatus,
)

from .triangulation import (
    BearingObservation,
    TriangulationResult,
    TriangulateRequest,
    TriangulateResponse,
    TriangulationMethod,
)

from .prediction import (
    EnvironmentalConditions,
    FireLine,
    SpreadParameters,
    Isochrone,
    SpreadConfidence,
    SpreadResult,
    ScenarioModification,
    WhatIfRequest,
    ScenarioComparison,
    WhatIfResult,
    FireLineType,
    FireLineStatus,
    ScenarioModificationType,
)

__all__ = [
    # Telemetry
    "TelemetryData",
    "Detection",
    "Task",
    "Alert",
    "Point",
    "SensorReading",
    "DeviceStatus",
    "DetectionType",
    "TaskKind",
    "TaskStatus",
    "AlertType",
    "AlertSeverity",
    "AlertStatus",
    # Triangulation
    "BearingObservation",
    "TriangulationResult",
    "TriangulateRequest",
    "TriangulateResponse",
    "TriangulationMethod",
    # Prediction
    "EnvironmentalConditions",
    "FireLine",
    "SpreadParameters",
    "Isochrone",
    "SpreadConfidence",
    "SpreadResult",
    "ScenarioModification",
    "WhatIfRequest",
    "ScenarioComparison",
    "WhatIfResult",
    "FireLineType",
    "FireLineStatus",
    "ScenarioModificationType",
]
