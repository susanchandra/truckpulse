from sqlalchemy import Column, Integer, Float, String, Boolean
from app.database import Base


class DiagnosticEventModel(Base):
    __tablename__ = "diagnostic_events"

    id = Column(String, primary_key=True, index=True)
    vehicle_id = Column(String, index=True, nullable=False)
    fault_code = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(String, nullable=False)
    observed_value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    timestamp = Column(Integer, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_timestamp = Column(Integer, default=0)
