from sqlalchemy import Column, Integer, Float, String, Boolean
from app.database import Base


class TelemetryModel(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String, index=True, nullable=False)
    timestamp = Column(Integer, index=True, nullable=False)
    engine_rpm = Column(Integer, nullable=False)
    coolant_temp_c = Column(Float, nullable=False)
    oil_pressure_psi = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=False)
    fuel_level_pct = Column(Float, nullable=False)
    battery_voltage = Column(Float, nullable=False)
    engine_status = Column(String, default="RUNNING")
    frame_valid = Column(Boolean, default=True)
    frame_size = Column(Integer, default=44)
