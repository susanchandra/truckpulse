import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.routes.fleet import router as fleet_router
from app.routes.telemetry import router as telemetry_router
from app.routes.diagnostics import router as diagnostics_router
from app.routes.simulation import router as simulation_router
from app.services.telemetry_service import (
    init_db,
    stop_simulation,
    register_websocket,
    unregister_websocket,
)
from app.simulator_bridge import bridge

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("truckpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TruckPulse Backend & Database...")
    init_db()
    yield
    logger.info("Shutting down TruckPulse Backend...")
    stop_simulation()
    bridge.stop()


# Ensure tables exist immediately on import
init_db()

app = FastAPI(
    title="TruckPulse API",
    description="Automotive Diagnostics & Fleet Health Platform — DTICI Portfolio",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(fleet_router)
app.include_router(telemetry_router)
app.include_router(diagnostics_router)
app.include_router(simulation_router)


@app.get("/health", tags=["system"])
def health_check():
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "TruckPulse Backend",
        "version": "1.0.0",
        "database": "connected" if db_ok else "error",
        "simulator_bridge": "alive" if bridge.is_alive() else "ready",
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    register_websocket(websocket)
    logger.info("Client connected to /ws/telemetry")
    try:
        while True:
            # Keep connection open; telemetry is broadcast by telemetry_service
            data = await websocket.receive_text()
            # Client can send "PING" to receive "PONG"
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/telemetry")
    finally:
        unregister_websocket(websocket)
