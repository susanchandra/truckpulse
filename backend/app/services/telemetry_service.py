import time
import json
import logging
import threading
from collections import deque, defaultdict
from typing import Dict, List, Any, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.vehicle import VehicleModel
from app.models.telemetry import TelemetryModel
from app.models.diagnostic import DiagnosticEventModel
from app.simulator_bridge import bridge

logger = logging.getLogger("truckpulse.service")

# In-memory bounded history: max 100 entries per vehicle
_telemetry_cache: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
# Active connected WebSockets
_active_websockets: Set[WebSocket] = set()
_ws_lock = threading.Lock()

_simulation_running: bool = False
_simulation_thread: threading.Thread = None
_stop_event = threading.Event()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bridge.start()
        vehicles = bridge.get_fleet()
        for v in vehicles:
            existing = db.query(VehicleModel).filter(VehicleModel.id == v["id"]).first()
            if not existing:
                truck = VehicleModel(
                    id=v["id"],
                    fleet_tag=v["fleetTag"],
                    model=v["model"],
                    engine_status="RUNNING",
                    updated_at=int(time.time()),
                )
                db.add(truck)
            else:
                existing.fleet_tag = v["fleetTag"]
                existing.model = v["model"]
        db.commit()
    except Exception as e:
        logger.error(f"Error initializing vehicles in DB: {e}")
    finally:
        db.close()


def process_tick_data(data: Dict[str, Any], db: Session):
    """
    Ingests one C++ tick: saves bounded telemetry to memory/DB,
    updates vehicle engine status, and persists diagnostic transitions.
    """
    telemetry_list = data.get("telemetry", [])
    new_events = data.get("newEvents", [])

    # 1. Store telemetry & update vehicle models
    for item in telemetry_list:
        vid = item["vehicleId"]
        _telemetry_cache[vid].append(item)

        # Update vehicle status in DB
        veh = db.query(VehicleModel).filter(VehicleModel.id == vid).first()
        if veh:
            veh.engine_status = item.get("engineStatus", "RUNNING")
            veh.updated_at = item.get("timestamp", int(time.time()))

        # Save telemetry row to DB
        tel_record = TelemetryModel(
            vehicle_id=vid,
            timestamp=item.get("timestamp", int(time.time())),
            engine_rpm=item.get("engineRPM", 0),
            coolant_temp_c=item.get("coolantTempC", 0.0),
            oil_pressure_psi=item.get("oilPressurePSI", 0.0),
            speed_kmh=item.get("speedKmh", 0.0),
            fuel_level_pct=item.get("fuelLevelPct", 0.0),
            battery_voltage=item.get("batteryVoltage", 0.0),
            engine_status=item.get("engineStatus", "RUNNING"),
            frame_valid=item.get("frameValid", True),
            frame_size=item.get("frameSize", 44),
        )
        db.add(tel_record)

    # 2. Persist newly detected / resolved diagnostic events
    for ev in new_events:
        is_res = ev.get("isResolved", False)
        if is_res:
            # Mark previously active events for this vehicle + faultCode as resolved
            prior_active = (
                db.query(DiagnosticEventModel)
                .filter(
                    DiagnosticEventModel.vehicle_id == ev["vehicleId"],
                    DiagnosticEventModel.fault_code == ev["faultCode"],
                    DiagnosticEventModel.is_resolved == False,
                )
                .all()
            )
            for a in prior_active:
                a.is_resolved = True
                a.resolved_timestamp = ev.get("resolvedTimestamp", int(time.time()))

        existing = db.query(DiagnosticEventModel).filter(DiagnosticEventModel.id == ev["id"]).first()
        if not existing:
            evt_record = DiagnosticEventModel(
                id=ev["id"],
                vehicle_id=ev["vehicleId"],
                fault_code=ev["faultCode"],
                severity=ev["severity"],
                description=ev["description"],
                observed_value=ev["observedValue"],
                threshold=ev["threshold"],
                timestamp=ev["timestamp"],
                is_resolved=is_res,
                resolved_timestamp=ev.get("resolvedTimestamp", 0),
            )
            db.add(evt_record)
        else:
            existing.is_resolved = is_res
            existing.resolved_timestamp = ev.get("resolvedTimestamp", 0)

    db.commit()


def _run_simulation_thread():
    logger.info("Background simulation worker started (1 Hz)")
    while not _stop_event.is_set():
        try:
            tick_data = bridge.tick()
            if tick_data.get("type") == "telemetry_tick":
                db = SessionLocal()
                try:
                    process_tick_data(tick_data, db)
                finally:
                    db.close()

                # Broadcast to active WebSockets (sync safely)
                with _ws_lock:
                    ws_list = list(_active_websockets)
                if ws_list:
                    import asyncio
                    try:
                        # Schedule coroutine on running loop if available
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            for ws in ws_list:
                                asyncio.run_coroutine_threadsafe(ws.send_json(tick_data), loop)
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")

        # Sleep in small increments for responsive stop
        for _ in range(10):
            if _stop_event.is_set():
                break
            time.sleep(0.1)

    logger.info("Background simulation worker stopped")


def start_simulation() -> bool:
    global _simulation_running, _simulation_thread
    if _simulation_running:
        return True
    _simulation_running = True
    _stop_event.clear()
    bridge.start()
    _simulation_thread = threading.Thread(target=_run_simulation_thread, daemon=True)
    _simulation_thread.start()
    return True


def stop_simulation() -> bool:
    global _simulation_running, _simulation_thread
    _simulation_running = False
    _stop_event.set()
    if _simulation_thread and _simulation_thread.is_alive():
        _simulation_thread.join(timeout=2.0)
    _simulation_thread = None
    return True


def is_simulation_running() -> bool:
    return _simulation_running


def get_cached_telemetry(vehicle_id: str) -> List[Dict[str, Any]]:
    return list(_telemetry_cache.get(vehicle_id, []))


def register_websocket(ws: WebSocket):
    with _ws_lock:
        _active_websockets.add(ws)


def unregister_websocket(ws: WebSocket):
    with _ws_lock:
        _active_websockets.discard(ws)
