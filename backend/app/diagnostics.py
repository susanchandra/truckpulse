"""
diagnostics.py
Diagnostic rule metadata and threshold constants corresponding to the
C++ DiagnosticEngine ECU rules for documentation, validation, and API helpers.
"""

from enum import Enum
from typing import Dict, Any


class DiagnosticSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class DiagnosticRule:
    def __init__(
        self,
        code: str,
        name: str,
        severity: DiagnosticSeverity,
        threshold: float,
        unit: str,
        description: str,
    ):
        self.code = code
        self.name = name
        self.severity = severity
        self.threshold = threshold
        self.unit = unit
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "severity": self.severity.value,
            "threshold": self.threshold,
            "unit": self.unit,
            "description": self.description,
        }


DIAGNOSTIC_RULES = {
    "ENGINE_OVERHEATING": DiagnosticRule(
        code="ENGINE_OVERHEATING",
        name="Engine Overheating",
        severity=DiagnosticSeverity.CRITICAL,
        threshold=105.0,
        unit="C",
        description="Coolant temperature exceeded 105 C threshold",
    ),
    "LOW_OIL_PRESSURE": DiagnosticRule(
        code="LOW_OIL_PRESSURE",
        name="Low Oil Pressure",
        severity=DiagnosticSeverity.CRITICAL,
        threshold=15.0,
        unit="PSI",
        description="Oil pressure dropped below 15 PSI threshold",
    ),
    "HIGH_ENGINE_RPM": DiagnosticRule(
        code="HIGH_ENGINE_RPM",
        name="High Engine RPM",
        severity=DiagnosticSeverity.WARNING,
        threshold=3500.0,
        unit="RPM",
        description="Engine speed exceeded 3500 RPM threshold",
    ),
    "LOW_BATTERY_VOLTAGE": DiagnosticRule(
        code="LOW_BATTERY_VOLTAGE",
        name="Low Battery Voltage",
        severity=DiagnosticSeverity.WARNING,
        threshold=11.5,
        unit="V",
        description="Battery voltage dropped below 11.5 V threshold",
    ),
    "LOW_FUEL": DiagnosticRule(
        code="LOW_FUEL",
        name="Low Fuel Level",
        severity=DiagnosticSeverity.WARNING,
        threshold=5.0,
        unit="%",
        description="Fuel level dropped below 5% reserve threshold",
    ),
}
