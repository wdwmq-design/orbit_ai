import uuid
import json
import numpy as np
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.db.database import get_db
from app.models.schemas import SimulationConfig, SimulationResult
from app.core.config import settings
import os

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.get("", response_model=list[SimulationResult])
def list_simulations():
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM simulations ORDER BY created_at DESC LIMIT 50")
        results = []
        for r in rows:
            d = dict(r)
            d["config"] = json.loads(d.get("config_json", "{}"))
            d["ground_truth"] = json.loads(d.get("ground_truth_json") or "null")
            results.append(d)
        return results


@router.post("", response_model=SimulationResult, status_code=202)
def create_simulation(config: SimulationConfig, background_tasks: BackgroundTasks):
    sim_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as db:
        db.execute(
            "INSERT INTO simulations(id,created_at,name,config_json,status) VALUES(?,?,?,?,?)",
            (sim_id, now, config.name, config.model_dump_json(), "pending")
        )
        db.commit()

    background_tasks.add_task(_run_simulation, sim_id, config.model_dump())
    return SimulationResult(
        id=sim_id, created_at=now, name=config.name,
        config=config.model_dump(), status="pending"
    )


@router.get("/{sim_id}", response_model=SimulationResult)
def get_simulation(sim_id: str):
    with get_db() as db:
        row = db.fetchone("SELECT * FROM simulations WHERE id=?", (sim_id,))
        if not row:
            raise HTTPException(404, detail="Simulation not found")
        d = dict(row)
        d["config"] = json.loads(d.get("config_json", "{}"))
        d["ground_truth"] = json.loads(d.get("ground_truth_json") or "null")
        return d


def _run_simulation(sim_id: str, config: dict):
    with get_db() as db:
        try:
            db.execute("UPDATE simulations SET status='running' WHERE id=?", (sim_id,))
            db.commit()

            rng = np.random.default_rng()
            h, w = 512, 512
            background = rng.normal(0.05, 0.01, (h, w)).clip(0, 1).astype(np.float32)

            n_stars = 40
            ground_truth = []
            img = background.copy()

            for _ in range(n_stars):
                sx, sy = rng.integers(10, w - 10), rng.integers(10, h - 10)
                brightness = rng.uniform(0.3, 0.9)
                for dy in range(-3, 4):
                    for dx in range(-3, 4):
                        d2 = dx ** 2 + dy ** 2
                        if 0 <= sy + dy < h and 0 <= sx + dx < w:
                            img[sy + dy, sx + dx] += brightness * np.exp(-d2 / 2.0)

            num_debris = int(config.get("num_debris", 3))
            angle_deg = float(config.get("streak_angle_deg", 45.0))
            vel = float(config.get("velocity_px_s", 5.0))
            exp_t = float(config.get("exposure_time_s", 45.0))
            brightness_mag = float(config.get("streak_magnitude", 18.0))
            brightness = max(0.1, 1.0 - (brightness_mag - 10.0) / 20.0)

            import math
            angle_rad = math.radians(angle_deg)
            streak_len = vel * exp_t
            dx_unit = math.cos(angle_rad)
            dy_unit = math.sin(angle_rad)

            for i in range(num_debris):
                x0 = rng.integers(50, w - 50)
                y0 = rng.integers(50, h - 50)
                x1 = x0 + dx_unit * streak_len
                y1 = y0 + dy_unit * streak_len

                n_steps = max(int(streak_len * 2), 10)
                xs = np.linspace(x0, x1, n_steps)
                ys = np.linspace(y0, y1, n_steps)

                for xi, yi in zip(xs, ys):
                    for dy in range(-1, 2):
                        for dx in range(-1, 2):
                            px, py = int(round(xi)) + dx, int(round(yi)) + dy
                            if 0 <= py < h and 0 <= px < w:
                                img[py, px] = min(1.0, img[py, px] + brightness * np.exp(-(dx**2 + dy**2) / 1.5))

                ground_truth.append({
                    "debris_id": i + 1,
                    "type": "synthetic_streak",
                    "x0": float(x0), "y0": float(y0),
                    "x1": float(np.clip(x1, 0, w)), "y1": float(np.clip(y1, 0, h)),
                    "streak_length_px": float(np.sqrt((x1-x0)**2 + (y1-y0)**2)),
                    "angle_deg": angle_deg,
                    "velocity_px_s": vel,
                    "exposure_time_s": exp_t,
                    "synthetic": True,
                })

            if config.get("add_noise", True):
                sigma = float(config.get("noise_sigma", 0.02))
                img = (img + rng.normal(0, sigma, img.shape)).clip(0, 1)

            try:
                from PIL import Image as PILImage
                arr_8 = (img * 255).clip(0, 255).astype(np.uint8)
                pil_img = PILImage.fromarray(arr_8, mode="L")
                os.makedirs(settings.upload_dir, exist_ok=True)
                out_path = os.path.join(settings.upload_dir, f"sim_{sim_id}.png")
                pil_img.save(out_path)

                import uuid as uuidlib
                from datetime import datetime, timezone
                img_id = str(uuidlib.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                img_meta = (
                    img_id, f"sim_{sim_id}.png", f"sim_{sim_id}.png",
                    os.path.getsize(out_path), "png", w, h, now,
                    exp_t, None, None, None, "synthetic", "uploaded"
                )
                db.execute(
                    "INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", img_meta
                )

                db.execute(
                    "UPDATE simulations SET status='completed', output_image_id=?, ground_truth_json=? WHERE id=?",
                    (img_id, json.dumps(ground_truth), sim_id)
                )

                # Execute detection pipeline on synthetic benchmark image
                from app.services.image_processor import analyse_image
                job_id = str(uuidlib.uuid4())
                db.execute(
                    "INSERT INTO detection_jobs(id,image_id,created_at,completed_at,status) VALUES(?,?,?,?,?)",
                    (job_id, img_id, now, now, "completed")
                )
                detections, _ = analyse_image(out_path, job_id, img_id, {
                    "threshold_sigma": 3.0,
                    "detect_streaks": True,
                    "min_pixels": 4,
                    "max_pixels": 500,
                })
                for det in detections:
                    db.execute(
                        """INSERT INTO detections VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (
                            det["id"], det["job_id"], det["image_id"], det["candidate_type"],
                            det["confidence"], det["pixel_x"], det["pixel_y"],
                            det["pixel_x2"], det["pixel_y2"], det["length_px"],
                            det["angle_deg"], det["snr"], det["magnitude"],
                            det["centroid_x"], det["centroid_y"], det["created_at"],
                        )
                    )

                # Compute empirical ground truth cross-match metrics
                streak_dets = [d for d in detections if d["candidate_type"] == "streak"]
                gt_streaks = [g for g in ground_truth if g.get("type") == "synthetic_streak"]

                iou_threshold_px = 30.0
                tp = 0
                matched_gt = set()
                for det in streak_dets:
                    dx = det.get("centroid_x") or det.get("pixel_x") or 0
                    dy = det.get("centroid_y") or det.get("pixel_y") or 0
                    for j, gt in enumerate(gt_streaks):
                        if j in matched_gt:
                            continue
                        gx = (gt["x0"] + gt["x1"]) / 2
                        gy = (gt["y0"] + gt["y1"]) / 2
                        dist = np.sqrt((dx - gx) ** 2 + (dy - gy) ** 2)
                        if dist < iou_threshold_px:
                            tp += 1
                            matched_gt.add(j)
                            break

                fp = len(streak_dets) - tp
                fn = len(gt_streaks) - tp
                precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
                far = fp / max(1, len(streak_dets)) if streak_dets else 0.0

                eval_id = str(uuidlib.uuid4())
                db.execute(
                    """INSERT INTO eval_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (eval_id, sim_id, now, job_id, tp, fp, fn,
                     round(precision, 4), round(recall, 4), round(f1, 4), None, round(far, 4),
                     "Automated benchmark evaluation on synthetic frame")
                )
            except Exception as e:
                db.execute(
                    "UPDATE simulations SET status='completed', ground_truth_json=? WHERE id=?",
                    (json.dumps(ground_truth), sim_id)
                )

            db.commit()
        except Exception as exc:
            db.execute(
                "UPDATE simulations SET status='failed' WHERE id=?", (sim_id,)
            )
            db.commit()
