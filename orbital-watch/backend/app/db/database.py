import sqlite3
import os
import asyncio
from app.core.config import settings

CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_format TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    upload_time TEXT NOT NULL,
    exposure_time_s REAL,
    obs_date TEXT,
    ra_deg REAL,
    dec_deg REAL,
    telescope TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded'
);

CREATE TABLE IF NOT EXISTS detection_jobs (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    FOREIGN KEY(image_id) REFERENCES images(id)
);

CREATE TABLE IF NOT EXISTS detections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    candidate_type TEXT NOT NULL,
    confidence REAL,
    pixel_x REAL,
    pixel_y REAL,
    pixel_x2 REAL,
    pixel_y2 REAL,
    length_px REAL,
    angle_deg REAL,
    snr REAL,
    magnitude REAL,
    centroid_x REAL,
    centroid_y REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES detection_jobs(id)
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    track_name TEXT,
    created_at TEXT NOT NULL,
    num_frames INTEGER NOT NULL DEFAULT 0,
    angular_velocity_arcsec_s REAL,
    position_angle_deg REAL,
    status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS track_points (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    detection_id TEXT,
    obs_time TEXT NOT NULL,
    ra_deg REAL,
    dec_deg REAL,
    pixel_x REAL,
    pixel_y REAL,
    FOREIGN KEY(track_id) REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS trajectories (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    method TEXT NOT NULL,
    semi_major_axis_km REAL,
    eccentricity REAL,
    inclination_deg REAL,
    raan_deg REAL,
    arg_perigee_deg REAL,
    true_anomaly_deg REAL,
    period_min REAL,
    perigee_km REAL,
    apogee_km REAL,
    orbital_regime TEXT,
    residual_arcsec REAL,
    solution_quality TEXT,
    notes TEXT,
    FOREIGN KEY(track_id) REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    output_image_id TEXT,
    ground_truth_json TEXT
);

CREATE TABLE IF NOT EXISTS eval_runs (
    id TEXT PRIMARY KEY,
    simulation_id TEXT,
    created_at TEXT NOT NULL,
    detection_job_id TEXT,
    true_positives INTEGER,
    false_positives INTEGER,
    false_negatives INTEGER,
    precision_score REAL,
    recall_score REAL,
    f1_score REAL,
    astrometric_rmse_px REAL,
    far REAL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
);
"""

class DBConnection:
    def __init__(self, path: str):
        self.path = path
        self._conn = None

    def __enter__(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        self._conn = sqlite3.connect(self.path)
        self._conn.row_factory = sqlite3.Row
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._conn:
            self._conn.close()

    def execute(self, sql: str, params: tuple = ()):
        cur = self._conn.cursor()
        cur.execute(sql, params)
        return cur

    def executescript(self, sql: str):
        return self._conn.executescript(sql)

    def commit(self):
        self._conn.commit()

    def fetchall(self, sql: str, params: tuple = ()):
        cur = self.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]

    def fetchone(self, sql: str, params: tuple = ()):
        cur = self.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def get_db():
    return DBConnection(settings.db_path)


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(settings.db_path)), exist_ok=True)
    with get_db() as db:
        db.executescript(CREATE_TABLES)
        db.commit()
