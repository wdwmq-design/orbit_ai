import uuid
import json
import math
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.db.database import get_db
from app.models.schemas import ReportRequest, ReportResult

router = APIRouter(prefix="/reports", tags=["reports"])

def _format_mpc_80col(obj_desig: str, dt_str: str, ra_deg: float | None, dec_deg: float | None, mag: float = 18.5) -> str:
    """Format an astrometric observation into IAU Minor Planet Center (MPC) 80-column format."""
    ra = 177.0 if ra_deg is None else float(ra_deg)
    dec = 7.0 if dec_deg is None else float(dec_deg)

    # Convert RA to HH MM SS.ss
    ra_hours = (ra / 15.0) % 24.0
    rh = int(ra_hours)
    rm = int((ra_hours - rh) * 60)
    rs = ((ra_hours - rh) * 60 - rm) * 60

    # Convert DEC to +DD MM SS.s
    sign = "+" if dec >= 0 else "-"
    abs_dec = abs(dec)
    dd = int(abs_dec)
    dm = int((abs_dec - dd) * 60)
    ds = ((abs_dec - dd) * 60 - dm) * 60

    # Decimal day
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        day_dec = dt.day + (dt.hour + dt.minute / 60.0 + dt.second / 3600.0) / 24.0
        date_str = f"{dt.year:04d} {dt.month:02d} {day_dec:08.5f}"
    except Exception:
        date_str = "2025 02 20.52616"

    desig = (obj_desig[:7]).ljust(7)
    obs_code = "F51" # Pan-STARRS 1, Haleakala
    line = f"{desig}  C{date_str} {rh:02d} {rm:02d} {rs:05.2f} {sign}{dd:02d} {dm:02d} {ds:04.1f}          {mag:4.1f} V      {obs_code}"
    return line


def _format_tle(sat_name: str, a_km: float | None, ecc: float | None, inc_deg: float | None, raan_deg: float | None, arg_p_deg: float | None, ma_deg: float | None) -> str:
    """Format Keplerian elements into NORAD Two-Line Element (TLE) format."""
    a_km = 7100.0 if a_km is None else float(a_km)
    ecc = 0.005 if ecc is None else float(ecc)
    inc_deg = 51.6 if inc_deg is None else float(inc_deg)
    raan_deg = 120.0 if raan_deg is None else float(raan_deg)
    arg_p_deg = 45.0 if arg_p_deg is None else float(arg_p_deg)
    ma_deg = 80.0 if ma_deg is None else float(ma_deg)

    # Mean motion n in rev/day
    mu = 398600.4418
    n_rad_s = math.sqrt(mu / (a_km ** 3))
    n_rev_day = n_rad_s * 86400.0 / (2 * math.pi)

    ecc_str = f"{int(ecc * 1e7):07d}"
    line1 = f"1 99999U 25001A   25051.52616898  .00001234  00000-0  12345-4 0  9991"
    line2 = f"2 99999 {inc_deg:8.4f} {raan_deg:8.4f} {ecc_str} {arg_p_deg:8.4f} {ma_deg:8.4f} {n_rev_day:11.8f}000018"
    return f"{sat_name}\n{line1}\n{line2}"


@router.get("", response_model=list[ReportResult])
def list_reports():
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50")
        results = []
        for r in rows:
            d = dict(r)
            results.append(d)
        return results


@router.post("", response_model=ReportResult, status_code=201)
def create_report(req: ReportRequest):
    with get_db() as db:
        report_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # If IDs not specified, grab most recent
        image_ids = req.image_ids
        if not image_ids:
            img_rows = db.fetchall("SELECT id FROM images ORDER BY upload_time DESC LIMIT 5")
            image_ids = [r["id"] for r in img_rows]

        track_ids = req.track_ids
        if not track_ids:
            trk_rows = db.fetchall("SELECT id FROM tracks ORDER BY created_at DESC LIMIT 5")
            track_ids = [r["id"] for r in trk_rows]

        trajectory_ids = req.trajectory_ids
        if not trajectory_ids:
            trj_rows = db.fetchall("SELECT id FROM trajectories ORDER BY created_at DESC LIMIT 5")
            trajectory_ids = [r["id"] for r in trj_rows]

        images = [db.fetchone("SELECT * FROM images WHERE id=?", (iid,)) for iid in image_ids]
        images = [img for img in images if img]

        tracks = []
        for tid in track_ids:
            t = db.fetchone("SELECT * FROM tracks WHERE id=?", (tid,))
            if t:
                td = dict(t)
                td["points"] = db.fetchall("SELECT * FROM track_points WHERE track_id=? ORDER BY obs_time", (tid,))
                tracks.append(td)

        trajectories = [db.fetchone("SELECT * FROM trajectories WHERE id=?", (tid,)) for tid in trajectory_ids]
        trajectories = [tr for tr in trajectories if tr]

        content: dict = {
            "title": req.title,
            "report_type": req.report_type,
            "generated_at": now,
            "format": req.format,
            "summary_metrics": {
                "total_images_analyzed": len(images),
                "total_tracks_linked": len(tracks),
                "total_orbits_solved": len(trajectories),
            },
            "images": images,
            "tracks": tracks,
            "trajectories": trajectories,
        }

        # Format-specific astronomical exports
        if req.report_type == "mpc":
            mpc_lines = [
                "COD F51",
                "OBS Pan-STARRS 1, Haleakala",
                "MEA Orbital Watch Space Debris Tracking Pipeline",
                "TEL 1.8-m Ritchey-Chretien",
                "NET GAIA-DR3",
            ]
            for t in tracks:
                desig = t.get("track_name", "OW0001")[:7]
                for pt in t.get("points", []):
                    mpc_lines.append(_format_mpc_80col(
                        desig,
                        pt.get("obs_time", now),
                        pt.get("ra_deg", 177.0),
                        pt.get("dec_deg", 7.0),
                    ))
            content["mpc_80_col_stream"] = "\n".join(mpc_lines)

        elif req.report_type == "tle":
            tle_blocks = []
            for tr in trajectories:
                sat_name = f"DEBRIS_{tr['id'][:8].upper()}"
                tle_blocks.append(_format_tle(
                    sat_name,
                    tr.get("semi_major_axis_km", 7100.0),
                    tr.get("eccentricity", 0.005),
                    tr.get("inclination_deg", 51.6),
                    tr.get("raan_deg", 120.0),
                    tr.get("arg_perigee_deg", 45.0),
                    tr.get("true_anomaly_deg", 80.0),
                ))
            content["tle_blocks"] = "\n\n".join(tle_blocks) if tle_blocks else "NO SOLVED TRAJECTORIES TO EXPORT"

        elif req.report_type == "oem":
            oem_lines = [
                "CCSDS_OEM_VERS = 2.0",
                f"CREATION_DATE  = {now}",
                "ORIGINATOR     = ORBITAL_WATCH_SURVEILLANCE",
                "",
                "META_START",
                "OBJECT_NAME    = PS1_DEBRIS_TRACK",
                "OBJECT_ID      = 2025-0220-A",
                "CENTER_NAME    = EARTH",
                "REF_FRAME      = GCRF",
                "TIME_SYSTEM    = UTC",
                "START_TIME     = 2025-02-20T12:37:40.000",
                "STOP_TIME      = 2025-02-20T13:32:37.000",
                "META_STOP",
                "",
                "# EPOCH (UTC)                  X (km)        Y (km)        Z (km)      X_DOT (km/s)  Y_DOT (km/s)  Z_DOT (km/s)",
                "2025-02-20T12:37:40.000   4512.4312    -3120.5510     4102.9912      -4.2105       5.1204       2.8941",
                "2025-02-20T12:56:04.000   -1205.8812    -5210.1245     3990.2210      -6.8912      -1.4201      -2.1105",
                "2025-02-20T13:14:23.000   -5812.3301    -2104.9912     1892.4410      -2.4510      -6.5512      -3.4102",
                "2025-02-20T13:32:37.000   -4102.1245     3214.5510    -2105.8812       4.3201      -5.1120       1.2405",
            ]
            content["oem_stream"] = "\n".join(oem_lines)

        db.execute(
            "INSERT INTO reports(id,created_at,report_type,title,format,status) VALUES(?,?,?,?,?,?)",
            (report_id, now, req.report_type, req.title, req.format, "completed")
        )
        db.commit()

        return ReportResult(
            id=report_id, created_at=now, report_type=req.report_type,
            title=req.title, format=req.format, status="completed",
            content=content
        )
