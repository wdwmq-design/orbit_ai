from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum


class CandidateType(str, Enum):
    STAR = "star"
    STREAK = "streak"
    POINT_MOVER = "point_mover"
    COSMIC_RAY = "cosmic_ray"
    ARTIFACT = "artifact"
    UNKNOWN = "unknown"


class SolutionQuality(str, Enum):
    GOOD = "good"
    MARGINAL = "marginal"
    POOR = "poor"
    UNCONSTRAINED = "unconstrained"


class OrbitalRegime(str, Enum):
    LEO = "LEO"
    MEO = "MEO"
    GEO = "GEO"
    HEO = "HEO"
    UNKNOWN = "unknown"


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ---- Image Metadata ----

class ImageMetadata(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_format: str
    width: Optional[int] = None
    height: Optional[int] = None
    upload_time: str
    exposure_time_s: Optional[float] = None
    obs_date: Optional[str] = None
    ra_deg: Optional[float] = None
    dec_deg: Optional[float] = None
    telescope: Optional[str] = None
    status: str = "uploaded"


class ImageUploadResponse(BaseModel):
    image: ImageMetadata
    message: str


# ---- Detection ----

class DetectionCandidate(BaseModel):
    id: str
    job_id: str
    image_id: str
    candidate_type: CandidateType
    confidence: Optional[float] = Field(None, description="Detection confidence 0-1")
    pixel_x: Optional[float] = None
    pixel_y: Optional[float] = None
    pixel_x2: Optional[float] = None
    pixel_y2: Optional[float] = None
    length_px: Optional[float] = None
    angle_deg: Optional[float] = None
    snr: Optional[float] = None
    magnitude: Optional[float] = None
    centroid_x: Optional[float] = None
    centroid_y: Optional[float] = None
    created_at: str


class DetectionJob(BaseModel):
    id: str
    image_id: str
    created_at: str
    completed_at: Optional[str] = None
    status: JobStatus = JobStatus.PENDING
    error_message: Optional[str] = None
    detections: List[DetectionCandidate] = []


class DetectionJobCreate(BaseModel):
    image_id: str
    threshold: float = Field(0.4, ge=0.0, le=1.0, description="Detection brightness threshold")
    min_pixels: int = Field(4, ge=1, description="Min pixels for valid detection")
    max_pixels: int = Field(500, ge=10, description="Max pixels for valid detection")
    window_size: int = Field(5, ge=3, le=21, description="Centroiding window size")
    detect_streaks: bool = True


# ---- Tracks ----

class TrackPoint(BaseModel):
    id: str
    track_id: str
    image_id: str
    detection_id: Optional[str] = None
    obs_time: str
    ra_deg: Optional[float] = None
    dec_deg: Optional[float] = None
    pixel_x: Optional[float] = None
    pixel_y: Optional[float] = None


class Track(BaseModel):
    id: str
    track_name: Optional[str] = None
    created_at: str
    num_frames: int = 0
    angular_velocity_arcsec_s: Optional[float] = None
    position_angle_deg: Optional[float] = None
    status: str = "active"
    points: List[TrackPoint] = []


# ---- Trajectory ----

class OrbitalElements(BaseModel):
    id: str
    track_id: str
    created_at: str
    method: str
    semi_major_axis_km: Optional[float] = None
    eccentricity: Optional[float] = None
    inclination_deg: Optional[float] = None
    raan_deg: Optional[float] = None
    arg_perigee_deg: Optional[float] = None
    true_anomaly_deg: Optional[float] = None
    period_min: Optional[float] = None
    perigee_km: Optional[float] = None
    apogee_km: Optional[float] = None
    orbital_regime: Optional[OrbitalRegime] = None
    residual_arcsec: Optional[float] = None
    solution_quality: Optional[SolutionQuality] = None
    notes: Optional[str] = None


# ---- Simulation ----

class SimulationConfig(BaseModel):
    name: str = "Synthetic Run"
    background_image_id: Optional[str] = None
    num_debris: int = Field(3, ge=1, le=20)
    streak_magnitude: float = Field(18.0, ge=10.0, le=25.0)
    velocity_px_s: float = Field(5.0, ge=0.1, le=200.0)
    streak_angle_deg: float = Field(45.0, ge=0.0, le=360.0)
    exposure_time_s: float = Field(45.0, ge=1.0, le=300.0)
    add_noise: bool = True
    noise_sigma: float = Field(0.02, ge=0.0, le=0.5)
    psf_fwhm_px: float = Field(2.0, ge=0.5, le=10.0)


class SimulationResult(BaseModel):
    id: str
    created_at: str
    name: str
    config: Dict[str, Any]
    status: str
    output_image_id: Optional[str] = None
    ground_truth: Optional[List[Dict[str, Any]]] = None


# ---- Evaluation ----

class EvalMetrics(BaseModel):
    id: str
    simulation_id: Optional[str] = None
    created_at: str
    detection_job_id: Optional[str] = None
    true_positives: Optional[int] = None
    false_positives: Optional[int] = None
    false_negatives: Optional[int] = None
    precision_score: Optional[float] = None
    recall_score: Optional[float] = None
    f1_score: Optional[float] = None
    astrometric_rmse_px: Optional[float] = None
    far: Optional[float] = None
    notes: Optional[str] = None


# ---- Reports ----

class ReportRequest(BaseModel):
    report_type: str = Field(..., description="summary | mpc | oem | tle | full")
    title: str
    image_ids: List[str] = []
    track_ids: List[str] = []
    trajectory_ids: List[str] = []
    format: str = Field("json", description="json | csv | pdf")


class ReportResult(BaseModel):
    id: str
    created_at: str
    report_type: str
    title: str
    format: str
    file_path: Optional[str] = None
    status: str
    content: Optional[Dict[str, Any]] = None


# ---- Generic ----

class HealthResponse(BaseModel):
    status: str
    version: str
    db_ok: bool
    upload_dir_ok: bool
    environment: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
