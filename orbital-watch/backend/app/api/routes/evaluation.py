from fastapi import APIRouter, HTTPException
from app.db.database import get_db
from app.models.schemas import EvalMetrics
import uuid
import json
from datetime import datetime, timezone
import numpy as np

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

@router.get("", response_model=list[EvalMetrics])
def list_evals():
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM eval_runs ORDER BY created_at DESC LIMIT 50")
        return rows


@router.post("/compute/{sim_id}/{job_id}", response_model=EvalMetrics)
def compute_evaluation(sim_id: str, job_id: str):
    with get_db() as db:
        sim_row = db.fetchone("SELECT * FROM simulations WHERE id=?", (sim_id,))
        if not sim_row:
            raise HTTPException(404, detail="Simulation not found")

        gt_json = sim_row.get("ground_truth_json")
        if not gt_json:
            raise HTTPException(400, detail="Simulation has no ground truth data yet")
        ground_truth = json.loads(gt_json)

        det_rows = db.fetchall("SELECT * FROM detections WHERE job_id=?", (job_id,))
        detections = det_rows

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
        precision = tp / (tp + fp) if (tp + fp) > 0 else None
        recall = tp / (tp + fn) if (tp + fn) > 0 else None
        f1 = 2 * precision * recall / (precision + recall) if (precision and recall) else None
        far = fp / max(1, len(streak_dets)) if streak_dets else None

        eval_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            """INSERT INTO eval_runs VALUES
               (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eval_id, sim_id, now, job_id, tp, fp, fn,
             precision, recall, f1, None, far,
             "Matched streak centroids within 30px threshold")
        )
        db.commit()

        return EvalMetrics(
            id=eval_id, simulation_id=sim_id, created_at=now,
            detection_job_id=job_id, true_positives=tp,
            false_positives=fp, false_negatives=fn,
            precision_score=precision, recall_score=recall, f1_score=f1,
            far=far,
            notes="Matched streak centroids within 30px threshold"
        )
