from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.vehicle import VehicleModel
from app.schemas.schemas import FaultInjectionRequest, SimulationControlResponse
from app.services.telemetry_service import (
    start_simulation,
    stop_simulation,
    is_simulation_running,
)
from app.simulator_bridge import bridge

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

SUPPORTED_FAULTS = {
    "overheating",
    "low_oil_pressure",
    "high_rpm",
    "low_battery",
    "low_fuel",
    "none",
}


@router.post("/start", response_model=SimulationControlResponse)
def api_start_simulation():
    start_simulation()
    return SimulationControlResponse(
        status="ok",
        message="Simulation started successfully",
        running=is_simulation_running(),
    )


@router.post("/stop", response_model=SimulationControlResponse)
def api_stop_simulation():
    stop_simulation()
    return SimulationControlResponse(
        status="ok",
        message="Simulation stopped successfully",
        running=is_simulation_running(),
    )


@router.post("/inject-fault")
def api_inject_fault(
    req: FaultInjectionRequest,
    db: Session = Depends(get_db),
):
    veh = db.query(VehicleModel).filter(VehicleModel.id == req.vehicle_id).first()
    if not veh:
        raise HTTPException(
            status_code=404, detail=f"Vehicle '{req.vehicle_id}' not found"
        )

    fault = req.fault_type.lower()
    if fault not in SUPPORTED_FAULTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported fault type '{req.fault_type}'. Supported: {sorted(list(SUPPORTED_FAULTS))}",
        )

    if fault == "none":
        res = bridge.clear_fault(req.vehicle_id)
    else:
        res = bridge.inject_fault(req.vehicle_id, fault)

    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message", "Bridge error"))

    return {
        "status": "ok",
        "vehicle_id": req.vehicle_id,
        "fault_type": fault,
        "message": f"Fault '{fault}' injected into '{req.vehicle_id}'",
    }
