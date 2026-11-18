import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.vehicle import VehicleModel
from app.models.telemetry import TelemetryModel
from app.models.diagnostic import DiagnosticEventModel
from app.services.telemetry_service import init_db, process_tick_data
from app.simulator_bridge import bridge


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Ensure fresh DB tables and initial fleet
    init_db()
    yield
    bridge.stop()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "simulator_bridge" in data


def test_fleet_endpoint(client):
    res = client.get("/api/fleet")
    assert res.status_code == 200
    data = res.json()
    assert data["total_vehicles"] >= 3
    vehicle_ids = [v["id"] for v in data["vehicles"]]
    assert "TRK-101" in vehicle_ids
    assert "TRK-102" in vehicle_ids
    assert "TRK-103" in vehicle_ids


def test_vehicles_list(client):
    res = client.get("/api/vehicles")
    assert res.status_code == 200
    vehicles = res.json()
    assert len(vehicles) >= 3


def test_vehicle_details_valid(client):
    res = client.get("/api/vehicles/TRK-101")
    assert res.status_code == 200
    v = res.json()
    assert v["id"] == "TRK-101"
    assert v["fleet_tag"] == "DTICI-FLEET-A"
    assert "Actros" in v["model"]


def test_vehicle_details_invalid(client):
    res = client.get("/api/vehicles/NON_EXISTENT_999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_simulation_start_stop(client):
    # Start
    res_start = client.post("/api/simulation/start")
    assert res_start.status_code == 200
    assert res_start.json()["running"] is True

    # Stop
    res_stop = client.post("/api/simulation/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["running"] is False


def test_telemetry_flow_and_query(client):
    # Trigger a real C++ tick and process it into the database
    tick_data = bridge.tick()
    assert tick_data.get("type") == "telemetry_tick"
    assert len(tick_data.get("telemetry", [])) >= 3

    db = SessionLocal()
    try:
        process_tick_data(tick_data, db)
    finally:
        db.close()

    res = client.get("/api/vehicles/TRK-101/telemetry?limit=10")
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 1
    sample = history[0]
    assert sample["vehicle_id"] == "TRK-101"
    assert "engine_rpm" in sample
    assert "coolant_temp_c" in sample
    assert "oil_pressure_psi" in sample
    assert sample["frame_valid"] is True
    assert sample["frame_size"] == 44


def test_telemetry_invalid_vehicle(client):
    res = client.get("/api/vehicles/GHOST_TRUCK/telemetry")
    assert res.status_code == 404


def test_fault_injection_and_diagnostic_resolution(client):
    # 1. Inject overheating into TRK-102
    fault_res = client.post(
        "/api/simulation/inject-fault",
        json={"vehicle_id": "TRK-102", "fault_type": "overheating"},
    )
    assert fault_res.status_code == 200
    assert fault_res.json()["status"] == "ok"

    # 2. Tick C++ simulator — verify sensor actually generates > 105 C and triggers fault
    tick1 = bridge.tick()
    db = SessionLocal()
    try:
        process_tick_data(tick1, db)
    finally:
        db.close()

    # Verify active diagnostics endpoint shows ENGINE_OVERHEATING on TRK-102
    active_res = client.get("/api/diagnostics/active")
    assert active_res.status_code == 200
    active_faults = active_res.json()
    trk102_overheat = [
        f for f in active_faults
        if f["vehicle_id"] == "TRK-102" and f["fault_code"] == "ENGINE_OVERHEATING"
    ]
    assert len(trk102_overheat) >= 1
    assert trk102_overheat[0]["observed_value"] > 105.0
    assert trk102_overheat[0]["severity"] == "CRITICAL"

    # 3. Clear fault on TRK-102
    clear_res = client.post(
        "/api/simulation/inject-fault",
        json={"vehicle_id": "TRK-102", "fault_type": "none"},
    )
    assert clear_res.status_code == 200

    # 4. Tick again — readings normalize, fault should resolve
    tick2 = bridge.tick()
    db = SessionLocal()
    try:
        process_tick_data(tick2, db)
    finally:
        db.close()

    # Active diagnostics should no longer show TRK-102 overheating
    active_after = client.get("/api/diagnostics/active?vehicle_id=TRK-102").json()
    trk102_active_after = [
        f for f in active_after if f["fault_code"] == "ENGINE_OVERHEATING"
    ]
    assert len(trk102_active_after) == 0

    # History should contain the resolved event
    history_res = client.get("/api/diagnostics/history?vehicle_id=TRK-102")
    assert history_res.status_code == 200
    history = history_res.json()
    resolved_events = [e for e in history if e["is_resolved"] is True]
    assert len(resolved_events) >= 1


def test_fault_injection_invalid_vehicle(client):
    res = client.post(
        "/api/simulation/inject-fault",
        json={"vehicle_id": "UNKNOWN_ID", "fault_type": "overheating"},
    )
    assert res.status_code == 404


def test_fault_injection_invalid_fault_type(client):
    res = client.post(
        "/api/simulation/inject-fault",
        json={"vehicle_id": "TRK-101", "fault_type": "warp_drive_failure"},
    )
    assert res.status_code == 400
    assert "unsupported fault" in res.json()["detail"].lower()


def test_websocket_telemetry(client):
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.send_text("PING")
        pong = ws.receive_text()
        assert pong == "PONG"
