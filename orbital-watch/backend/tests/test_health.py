import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.core.config import settings
import os
import tempfile

settings.db_path = os.path.join(tempfile.gettempdir(), "test_orbital_watch.db")
settings.upload_dir = os.path.join(tempfile.gettempdir(), "test_uploads")

@pytest.fixture(autouse=True)
def setup_db():
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()
    yield

def test_health_ok():
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "version" in data
    assert "db_ok" in data

def test_upload_invalid_extension():
    client = TestClient(app)
    resp = client.post(
        "/api/images",
        files={"file": ("malicious.exe", b"MZfakeexe", "application/octet-stream")}
    )
    assert resp.status_code == 415

def test_upload_empty_file():
    client = TestClient(app)
    resp = client.post(
        "/api/images",
        files={"file": ("empty.bmp", b"", "image/bmp")}
    )
    assert resp.status_code == 400

def test_list_images_empty():
    client = TestClient(app)
    resp = client.get("/api/images")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_get_nonexistent_image():
    client = TestClient(app)
    resp = client.get("/api/images/does-not-exist")
    assert resp.status_code == 404

def test_upload_valid_bmp():
    from PIL import Image
    import io
    buf = io.BytesIO()
    img = Image.new("L", (64, 64), color=10)
    img.save(buf, format="BMP")
    bmp_bytes = buf.getvalue()

    client = TestClient(app)
    resp = client.post(
        "/api/images",
        files={"file": ("test.bmp", bmp_bytes, "image/bmp")}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "image" in data
    assert data["image"]["file_format"] == "bmp"
