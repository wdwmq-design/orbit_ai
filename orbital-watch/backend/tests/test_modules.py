import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.core.config import settings
import os
import tempfile

settings.db_path = os.path.join(tempfile.gettempdir(), "test_orbital_watch_modules.db")
settings.upload_dir = os.path.join(tempfile.gettempdir(), "test_uploads_modules")

@pytest.fixture(autouse=True)
def setup_db():
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()
    yield

def test_tracks_associate_and_list():
    client = TestClient(app)
    # Associate tracks (seeds sample tracks if none exist)
    resp = client.post("/api/tracks/associate")
    assert resp.status_code == 200
    tracks = resp.json()
    assert len(tracks) >= 2
    track_id = tracks[0]["id"]

    # Get track detail
    resp_detail = client.get(f"/api/tracks/{track_id}")
    assert resp_detail.status_code == 200
    data = resp_detail.json()
    assert len(data["points"]) > 0

def test_trajectory_solve():
    client = TestClient(app)
    # First ensure a track exists with >= 3 observations
    resp = client.post("/api/tracks/associate")
    tracks = resp.json()
    track_id = tracks[0]["id"]

    # Solve orbit
    resp_solve = client.post(f"/api/trajectories/solve/{track_id}")
    assert resp_solve.status_code == 200
    orbit = resp_solve.json()
    assert orbit["semi_major_axis_km"] > 6000
    assert orbit["orbital_regime"] in ("LEO", "MEO", "GEO", "HEO")

    # List trajectories
    resp_list = client.get("/api/trajectories")
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

def test_simulation_creation():
    client = TestClient(app)
    config = {
        "name": "TEST-SYNTH-RUN",
        "num_debris": 2,
        "streak_magnitude": 17.5,
        "velocity_px_s": 5.0,
        "streak_angle_deg": 45.0,
        "exposure_time_s": 45.0,
        "add_noise": False
    }
    resp = client.post("/api/simulation", json=config)
    assert resp.status_code == 202
    data = resp.json()
    assert "id" in data
    assert data["name"] == "TEST-SYNTH-RUN"

def test_reports_generation():
    client = TestClient(app)
    # Create MPC report
    mpc_req = {
        "report_type": "mpc",
        "title": "TEST-MPC-EXPORT",
        "format": "json"
    }
    resp = client.post("/api/reports", json=mpc_req)
    assert resp.status_code == 201
    rep = resp.json()
    assert rep["title"] == "TEST-MPC-EXPORT"
    assert "mpc_80_col_stream" in rep["content"]
