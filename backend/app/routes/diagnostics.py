from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.diagnostic import DiagnosticEventModel
from app.schemas.schemas import DiagnosticEventSchema

router = APIRouter(prefix="/api/diagnostics", tags=["diagnostics"])


@router.get("", response_model=List[DiagnosticEventSchema])
def get_all_diagnostics(
    vehicle_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(DiagnosticEventModel)
    if vehicle_id:
        query = query.filter(DiagnosticEventModel.vehicle_id == vehicle_id)
    events = query.order_by(DiagnosticEventModel.timestamp.desc()).all()
    return [DiagnosticEventSchema.model_validate(e) for e in events]


@router.get("/active", response_model=List[DiagnosticEventSchema])
def get_active_diagnostics(
    vehicle_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(DiagnosticEventModel).filter(
        DiagnosticEventModel.is_resolved == False
    )
    if vehicle_id:
        query = query.filter(DiagnosticEventModel.vehicle_id == vehicle_id)
    events = query.order_by(DiagnosticEventModel.timestamp.desc()).all()
    return [DiagnosticEventSchema.model_validate(e) for e in events]


@router.get("/history", response_model=List[DiagnosticEventSchema])
def get_diagnostics_history(
    vehicle_id: Optional[str] = None,
    limit: Optional[int] = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(DiagnosticEventModel)
    if vehicle_id:
        query = query.filter(DiagnosticEventModel.vehicle_id == vehicle_id)
    events = query.order_by(DiagnosticEventModel.timestamp.desc()).limit(limit).all()
    return [DiagnosticEventSchema.model_validate(e) for e in events]
