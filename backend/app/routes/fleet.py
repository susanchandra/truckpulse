from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.vehicle import VehicleModel
from app.models.diagnostic import DiagnosticEventModel
from app.schemas.schemas import VehicleSchema, FleetSummarySchema
from app.services.telemetry_service import is_simulation_running

router = APIRouter(prefix="/api", tags=["fleet"])


@router.get("/fleet", response_model=FleetSummarySchema)
def get_fleet_summary(db: Session = Depends(get_db)):
    vehicles = db.query(VehicleModel).all()
    active_faults_count = (
        db.query(DiagnosticEventModel)
        .filter(DiagnosticEventModel.is_resolved == False)
        .count()
    )
    return FleetSummarySchema(
        total_vehicles=len(vehicles),
        vehicles=[VehicleSchema.model_validate(v) for v in vehicles],
        active_faults_count=active_faults_count,
        simulation_running=is_simulation_running(),
    )


@router.get("/vehicles", response_model=List[VehicleSchema])
def list_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(VehicleModel).all()
    return [VehicleSchema.model_validate(v) for v in vehicles]


@router.get("/vehicles/{vehicle_id}", response_model=VehicleSchema)
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    veh = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return VehicleSchema.model_validate(veh)
