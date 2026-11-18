from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class VehicleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    fleet_tag: str
    model: str
    engine_status: str
    updated_at: Optional[int] = 0


class TelemetrySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_id: str
    timestamp: int
    engine_rpm: int
    coolant_temp_c: float
    oil_pressure_psi: float
    speed_kmh: float
    fuel_level_pct: float
    battery_voltage: float
    engine_status: str = "RUNNING"
    frame_valid: bool = True
    frame_size: int = 44


class DiagnosticEventSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vehicle_id: str
    fault_code: str
    severity: str
    description: str
    observed_value: float
    threshold: float
    timestamp: int
    is_resolved: bool = False
    resolved_timestamp: Optional[int] = 0


class FleetSummarySchema(BaseModel):
    total_vehicles: int
    vehicles: List[VehicleSchema]
    active_faults_count: int
    simulation_running: bool


class FaultInjectionRequest(BaseModel):
    vehicle_id: str
    fault_type: str  # "overheating", "low_oil_pressure", "high_rpm", "low_battery", "low_fuel", "none"


class SimulationControlResponse(BaseModel):
    status: str
    message: str
    running: bool
