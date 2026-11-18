from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.vehicle import VehicleModel
from app.models.telemetry import TelemetryModel
from app.schemas.schemas import TelemetrySchema

router = APIRouter(prefix="/api/vehicles", tags=["telemetry"])


@router.get("/{vehicle_id}/telemetry", response_model=List[TelemetrySchema])
def get_vehicle_telemetry(
    vehicle_id: str,
    limit: Optional[int] = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    veh = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")

    records = (
        db.query(TelemetryModel)
        .filter(TelemetryModel.vehicle_id == vehicle_id)
        .order_by(TelemetryModel.timestamp.desc())
        .limit(limit)
        .all()
    )
    # Return chronologically ascending for graphing / charting ease
    return [TelemetrySchema.model_validate(r) for r in reversed(records)]
