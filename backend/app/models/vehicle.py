from sqlalchemy import Column, String, Integer
from app.database import Base


class VehicleModel(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, index=True)
    fleet_tag = Column(String, nullable=False)
    model = Column(String, nullable=False)
    engine_status = Column(String, default="OFF")
    updated_at = Column(Integer, default=0)
