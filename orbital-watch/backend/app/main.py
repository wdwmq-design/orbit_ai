from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import health, images, tracks, trajectories, simulation, evaluation, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(settings.db_path)), exist_ok=True)
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title="ORBITAL WATCH API",
    description="Space Debris Detection & Tracking — NASA SPACE-02 Hackathon",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

# Static file mount for scientific image uploads / preview
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(trajectories.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
