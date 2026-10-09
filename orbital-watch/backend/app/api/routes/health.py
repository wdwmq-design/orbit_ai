from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.core.config import settings
from app.db.database import get_db
import os

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint. Reports DB connectivity and upload directory availability."""
    db_ok = False
    try:
        with get_db() as db:
            db.execute("SELECT 1")
            db_ok = True
    except Exception:
        pass

    upload_dir_ok = os.path.isdir(settings.upload_dir)

    return HealthResponse(
        status="ok" if (db_ok and upload_dir_ok) else "degraded",
        version="0.1.0",
        db_ok=db_ok,
        upload_dir_ok=upload_dir_ok,
        environment=settings.app_env,
    )
