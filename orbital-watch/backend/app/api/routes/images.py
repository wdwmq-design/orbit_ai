import uuid
import os
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from app.core.config import settings
from app.models.schemas import ImageMetadata, ImageUploadResponse, DetectionJob, DetectionJobCreate, JobStatus
from app.db.database import get_db
from app.services.image_processor import analyse_image, _read_fits

router = APIRouter(prefix="/images", tags=["images"])

def _ext_ok(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in settings.allowed_extensions

@router.get("", response_model=list[ImageMetadata])
def list_images(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    with get_db() as db:
        rows = db.fetchall(
            "SELECT * FROM images ORDER BY upload_time DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        return rows


@router.post("", response_model=ImageUploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, detail="No filename provided")
    if not _ext_ok(file.filename):
        raise HTTPException(
            415,
            detail=f"Unsupported format. Allowed: {', '.join(sorted(settings.allowed_extensions))}"
        )

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, detail=f"File exceeds {settings.max_upload_mb} MB limit")
    if len(content) == 0:
        raise HTTPException(400, detail="Uploaded file is empty")

    image_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    stored_name = f"{image_id}{ext}"
    os.makedirs(settings.upload_dir, exist_ok=True)
    dest = os.path.join(settings.upload_dir, stored_name)

    with open(dest, "wb") as f:
        f.write(content)

    width, height, exposure_s, obs_date, ra, dec, telescope = (None,) * 7
    if ext in (".fits", ".fit"):
        try:
            _, hdr = _read_fits(dest)
            width = int(hdr.get("NAXIS1", 0)) or None
            height = int(hdr.get("NAXIS2", 0)) or None
            exposure_s = _safe(hdr.get("EXPTIME"))
            obs_date = hdr.get("DATE-OBS")
            ra = _safe(hdr.get("RA")) if _safe(hdr.get("RA")) is not None else _safe(hdr.get("CRVAL1"))
            dec = _safe(hdr.get("DEC")) if _safe(hdr.get("DEC")) is not None else _safe(hdr.get("CRVAL2"))
            telescope = hdr.get("TELESCOP")
        except Exception:
            pass
    else:
        try:
            from PIL import Image as PILImage
            with PILImage.open(dest) as img:
                width, height = img.size
        except Exception:
            pass

    now = datetime.now(timezone.utc).isoformat()
    meta = ImageMetadata(
        id=image_id,
        filename=stored_name,
        original_filename=file.filename,
        file_size=len(content),
        file_format=ext.lstrip("."),
        width=width,
        height=height,
        upload_time=now,
        exposure_time_s=exposure_s,
        obs_date=obs_date,
        ra_deg=ra,
        dec_deg=dec,
        telescope=telescope,
        status="uploaded",
    )

    with get_db() as db:
        db.execute(
            """INSERT INTO images VALUES
               (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                meta.id, meta.filename, meta.original_filename, meta.file_size,
                meta.file_format, meta.width, meta.height, meta.upload_time,
                meta.exposure_time_s, meta.obs_date, meta.ra_deg, meta.dec_deg,
                meta.telescope, meta.status,
            )
        )
        db.commit()

    return ImageUploadResponse(image=meta, message="Image uploaded successfully")


@router.get("/{image_id}", response_model=ImageMetadata)
def get_image(image_id: str):
    with get_db() as db:
        row = db.fetchone("SELECT * FROM images WHERE id=?", (image_id,))
        if not row:
            raise HTTPException(404, detail="Image not found")
        return row


@router.delete("/{image_id}", status_code=204)
def delete_image(image_id: str):
    with get_db() as db:
        row = db.fetchone("SELECT filename FROM images WHERE id=?", (image_id,))
        if not row:
            raise HTTPException(404, detail="Image not found")
        path = os.path.join(settings.upload_dir, row["filename"])
        if os.path.exists(path):
            os.remove(path)
        db.execute("DELETE FROM images WHERE id=?", (image_id,))
        db.commit()


@router.post("/{image_id}/analyse", response_model=DetectionJob, status_code=202)
def start_analysis(image_id: str, params: DetectionJobCreate, background_tasks: BackgroundTasks):
    with get_db() as db:
        img_row = db.fetchone("SELECT * FROM images WHERE id=?", (image_id,))
        if not img_row:
            raise HTTPException(404, detail="Image not found")

        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO detection_jobs(id,image_id,created_at,status) VALUES(?,?,?,?)",
            (job_id, image_id, now, "pending")
        )
        db.commit()

    background_tasks.add_task(
        _run_analysis_job, job_id, image_id,
        img_row["filename"], params.model_dump()
    )

    return DetectionJob(id=job_id, image_id=image_id, created_at=now, status=JobStatus.PENDING)


def _run_analysis_job(job_id: str, image_id: str, filename: str, params: dict):
    with get_db() as db:
        try:
            db.execute("UPDATE detection_jobs SET status='running' WHERE id=?", (job_id,))
            db.commit()

            file_path = os.path.join(settings.upload_dir, filename)
            detections, metadata = analyse_image(file_path, job_id, image_id, params)

            for det in detections:
                db.execute(
                    """INSERT INTO detections VALUES
                       (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        det["id"], det["job_id"], det["image_id"], det["candidate_type"],
                        det["confidence"], det["pixel_x"], det["pixel_y"],
                        det["pixel_x2"], det["pixel_y2"], det["length_px"],
                        det["angle_deg"], det["snr"], det["magnitude"],
                        det["centroid_x"], det["centroid_y"], det["created_at"],
                    )
                )

            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                "UPDATE detection_jobs SET status='completed', completed_at=? WHERE id=?",
                (now, job_id)
            )
            db.execute(
                "UPDATE images SET status='analysed' WHERE id=?",
                (image_id,)
            )
            db.commit()
        except Exception as exc:
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                "UPDATE detection_jobs SET status='failed', completed_at=?, error_message=? WHERE id=?",
                (now, str(exc), job_id)
            )
            db.commit()


@router.get("/{image_id}/jobs", response_model=list[DetectionJob])
def list_jobs(image_id: str):
    with get_db() as db:
        rows = db.fetchall(
            "SELECT * FROM detection_jobs WHERE image_id=? ORDER BY created_at DESC",
            (image_id,)
        )
        return rows


@router.get("/jobs/{job_id}", response_model=DetectionJob)
def get_job(job_id: str):
    with get_db() as db:
        job_row = db.fetchone("SELECT * FROM detection_jobs WHERE id=?", (job_id,))
        if not job_row:
            raise HTTPException(404, detail="Job not found")
        det_rows = db.fetchall("SELECT * FROM detections WHERE job_id=?", (job_id,))
        job = dict(job_row)
        job["detections"] = det_rows
        return job


def _safe(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
