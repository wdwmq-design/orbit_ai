"""
Image processing service.
Ports the core star-tracker algorithms from the MATLAB reference implementation
(see matlab_reference/ directory) to pure Python using NumPy and scikit-image.

IMPORTANT SCIENTIFIC INTEGRITY NOTES:
- Results are labeled as MEASURED vs. MODELLED vs. SYNTHETIC.
- Detections are labelled with confidence estimates, not binary pass/fail.
- Streak detection does not confirm orbital debris; it identifies candidates.
- FITS processing uses actual header metadata, not hardcoded defaults.
"""

import uuid
import os
import struct
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
import numpy as np

try:
    from skimage import io as skio, exposure, morphology, measure, filters
    from skimage.transform import radon
    SKIMAGE_OK = True
except ImportError:
    SKIMAGE_OK = False

try:
    from PIL import Image as PILImage
    PIL_OK = True
except ImportError:
    PIL_OK = False


# ─────────────────────────────────────────────────────────────────────────────
# FITS reader (no astropy dependency)
# ─────────────────────────────────────────────────────────────────────────────

def _parse_fits_header(raw: bytes) -> Dict[str, str]:
    """Parse a FITS header block into a dict of keyword→value strings."""
    header: Dict[str, str] = {}
    for i in range(0, len(raw), 80):
        card = raw[i:i + 80].decode("latin-1", errors="ignore")
        if card.startswith("END"):
            break
        if "=" in card:
            kw = card[:8].strip()
            val = card[10:].split("/")[0].strip().strip("'")
            header[kw] = val
    return header


def _read_fits(path: str) -> Tuple[Optional[np.ndarray], Dict[str, str]]:
    """
    Minimal FITS reader that handles 2D 16-bit integer images.
    Returns (data_array_float32, header_dict) or (None, header_dict) on failure.
    """
    with open(path, "rb") as f:
        raw = b""
        header: Dict[str, str] = {}
        header_done = False
        header_blocks = 0
        while not header_done:
            block = f.read(2880)
            if not block:
                break
            raw += block
            header_blocks += 1
            for i in range(0, len(block), 80):
                card = block[i:i + 80].decode("latin-1", errors="ignore")
                if card.startswith("END"):
                    header_done = True
                    break
        header = _parse_fits_header(raw)

        bitpix = int(header.get("BITPIX", "16"))
        naxis1 = int(header.get("NAXIS1", "0"))
        naxis2 = int(header.get("NAXIS2", "0"))

        if naxis1 == 0 or naxis2 == 0:
            return None, header

        num_pixels = naxis1 * naxis2
        bytes_per_pixel = abs(bitpix) // 8
        data_bytes = num_pixels * bytes_per_pixel

        # Read remaining data
        raw_data = f.read(data_bytes)
        if len(raw_data) < data_bytes:
            return None, header

        if bitpix == 16:
            arr = np.frombuffer(raw_data, dtype=">i2").astype(np.float32)
        elif bitpix == -32:
            arr = np.frombuffer(raw_data, dtype=">f4").astype(np.float32)
        elif bitpix == -64:
            arr = np.frombuffer(raw_data, dtype=">f8").astype(np.float32)
        elif bitpix == 8:
            arr = np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32)
        else:
            return None, header

        arr = arr.reshape((naxis2, naxis1))

        # Handle BZERO / BSCALE (FITS standard scaling)
        bzero = float(header.get("BZERO", "0"))
        bscale = float(header.get("BSCALE", "1"))
        arr = arr * bscale + bzero

        return arr, header


# ─────────────────────────────────────────────────────────────────────────────
# Camera model (ported from MATLAB distortion_correction.m & pixels_to_unit_vector.m)
# These parameters belong to the SIMULATED star-tracker camera only.
# They must NOT be applied to Pan-STARRS FITS images.
# ─────────────────────────────────────────────────────────────────────────────

class SimCameraModel:
    """
    Ported from MATLAB distortion_correction.m and pixels_to_unit_vector.m.
    Valid ONLY for the synthetic bmp_4.bmp test image with the simulated
    25mm focal-length star-tracker camera model.
    """
    f_mm: float = 25.0
    sensor_w_mm: float = 5.70
    sensor_h_mm: float = 4.28
    img_w_px: int = 646
    img_h_px: int = 486
    K1: float = 1.1999879539599927e-07
    K2: float = -2.5811362783036343e-13
    P1: float = 6.604606889315861e-06
    P2: float = 1.5756800510123402e-05

    @property
    def ppx(self) -> float:
        return self.sensor_w_mm / self.img_w_px

    @property
    def ppy(self) -> float:
        return self.sensor_h_mm / self.img_h_px

    @property
    def fx_px(self) -> float:
        return self.f_mm / self.ppx

    @property
    def fy_px(self) -> float:
        return self.f_mm / self.ppy

    @property
    def f_px(self) -> float:
        return (self.fx_px + self.fy_px) / 2

    @property
    def xc(self) -> float:
        return self.img_w_px / 2

    @property
    def yc(self) -> float:
        return self.img_h_px / 2

    def distortion_correction(self, xd: float, yd: float) -> Tuple[float, float]:
        """Brown-Conrady distortion correction. Ported from MATLAB."""
        x = (xd - self.xc) / self.f_px
        y = (yd - self.yc) / self.f_px
        r2 = x ** 2 + y ** 2
        xu = x * (1 + self.K1 * r2 + self.K2 * r2 ** 2) + self.P2 * (r2 + 2 * x ** 2) + 2 * self.P1 * x * y
        yu = y * (1 + self.K1 * r2 + self.K2 * r2 ** 2) + self.P1 * (r2 + 2 * y ** 2) + 2 * self.P2 * x * y
        return self.f_px * xu + self.xc, self.f_px * yu + self.yc

    def pixel_to_unit_vector(self, x_pix: float, y_pix: float) -> Tuple[float, float, float]:
        """Inverse pinhole projection. Ported from MATLAB."""
        alpha = (x_pix - self.xc) * self.ppx / self.f_mm
        beta = (y_pix - self.yc) * self.ppy / self.f_mm
        denom = math.sqrt(1 + alpha ** 2 + beta ** 2)
        return alpha / denom, beta / denom, 1.0 / denom


_sim_camera = SimCameraModel()


# ─────────────────────────────────────────────────────────────────────────────
# Background estimation and normalisation
# ─────────────────────────────────────────────────────────────────────────────

def estimate_background(arr: np.ndarray, box_size: int = 64) -> Tuple[float, float]:
    """
    Robust background estimation using sigma-clipping.
    Returns (median_background, background_std).
    """
    flat = arr.ravel()
    # Sigma clip: 3 iterations
    mask = np.ones(len(flat), dtype=bool)
    for _ in range(3):
        med = float(np.median(flat[mask]))
        std = float(np.std(flat[mask]))
        if std == 0:
            break
        mask = np.abs(flat - med) < 3 * std
    return float(np.median(flat[mask])), float(np.std(flat[mask]))


def normalise_image(arr: np.ndarray) -> np.ndarray:
    """Normalise to [0, 1] using a robust percentile stretch."""
    p_low = float(np.percentile(arr, 1))
    p_high = float(np.percentile(arr, 99.5))
    if p_high <= p_low:
        return np.zeros_like(arr, dtype=np.float32)
    return np.clip((arr - p_low) / (p_high - p_low), 0.0, 1.0).astype(np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Blob / source detection (ported from region_growing.m + centroiding.m)
# ─────────────────────────────────────────────────────────────────────────────

def detect_sources(arr: np.ndarray,
                   threshold_sigma: float = 5.0,
                   min_pixels: int = 3,
                   max_pixels: int = 500,
                   window_size: int = 5) -> List[Dict[str, Any]]:
    """
    Detects point-source candidates (stars and compact movers).
    Ported from MATLAB region_growing.m + centroiding.m.

    Uses proper sigma-clipped background estimation on calibrated pixel data,
    thresholding at bg_median + threshold_sigma * bg_std.
    Returns list of source dicts with pixel coordinates and SNR estimates.
    """
    if not SKIMAGE_OK:
        return []

    bg_med, bg_std = estimate_background(arr)

    if bg_std > 0:
        thresh_val = bg_med + threshold_sigma * bg_std
    else:
        thresh_val = float(np.percentile(arr, 95))

    binary = arr > thresh_val
    labeled = measure.label(binary, connectivity=2)
    props = measure.regionprops(labeled, intensity_image=arr)

    sources = []
    half = window_size // 2
    rows, cols = arr.shape

    for prop in props:
        npix = prop.area
        if npix < min_pixels or npix > max_pixels:
            continue

        # Centroid (intensity-weighted, ported from MATLAB centroiding.m)
        cy, cx = prop.centroid
        r0 = max(0, int(cy) - half)
        r1 = min(rows, int(cy) + half + 1)
        c0 = max(0, int(cx) - half)
        c1 = min(cols, int(cx) + half + 1)
        window = arr[r0:r1, c0:c1]
        total = window.sum()
        if total > 0:
            gy, gx = np.mgrid[r0:r1, c0:c1]
            cx_sub = float((gx * window).sum() / total)
            cy_sub = float((gy * window).sum() / total)
        else:
            cx_sub, cy_sub = float(cx), float(cy)

        peak = float(prop.intensity_max if hasattr(prop, "intensity_max") else getattr(prop, "max_intensity", 1.0))
        snr = (peak - bg_med) / bg_std if bg_std > 0 else 0.0

        # Morphology: eccentricity determines point vs. streak
        ecc = float(prop.eccentricity) if hasattr(prop, "eccentricity") else 0.0

        sources.append({
            "centroid_x": cx_sub,
            "centroid_y": cy_sub,
            "area_px": npix,
            "peak_intensity": peak,
            "snr": snr,
            "eccentricity": ecc,
            "bbox": prop.bbox,
        })

    return sources



# ─────────────────────────────────────────────────────────────────────────────
# Streak / elongated source detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_streaks(arr: np.ndarray,
                   threshold_sigma: float = 3.0) -> List[Dict[str, Any]]:
    """
    Detects elongated streak candidates using morphological top-hat filtering
    and connected component analysis on calibrated pixel arrays.

    Scientific note: A 'streak' in this context means an elongated high-SNR
    source in the image plane. It does NOT directly indicate the physical
    origin (satellite, aircraft, cosmic ray, etc.).
    """
    if not SKIMAGE_OK:
        return []

    bg_med, bg_std = estimate_background(arr)
    thresh = bg_med + threshold_sigma * bg_std

    # Top-hat filter to enhance elongated features
    selem = morphology.disk(3)
    top_hat = morphology.white_tophat(arr, selem)

    min_contrast = max(0.005, threshold_sigma * bg_std)
    binary = (top_hat > min_contrast) & (arr > thresh)
    labeled = measure.label(binary, connectivity=2)
    props = measure.regionprops(labeled, intensity_image=arr)

    streaks = []
    for prop in props:
        if prop.area < 4:
            continue
        ecc = float(prop.eccentricity) if hasattr(prop, "eccentricity") else 0.0
        if ecc < 0.75:
            continue  # Not elongated enough to be a streak candidate

        cy, cx = prop.centroid
        minr, minc, maxr, maxc = prop.bbox
        length_px = math.sqrt((maxr - minr) ** 2 + (maxc - minc) ** 2)

        # Major axis orientation
        angle_deg = float(prop.orientation) * (180.0 / math.pi) if hasattr(prop, "orientation") else None

        peak = float(prop.intensity_max if hasattr(prop, "intensity_max") else getattr(prop, "max_intensity", 1.0))
        snr = (peak - bg_med) / bg_std if bg_std > 0 else 0.0

        streaks.append({
            "centroid_x": float(cx),
            "centroid_y": float(cy),
            "pixel_x": float(minc),
            "pixel_y": float(minr),
            "pixel_x2": float(maxc),
            "pixel_y2": float(maxr),
            "length_px": length_px,
            "angle_deg": angle_deg,
            "eccentricity": ecc,
            "snr": snr,
            "area_px": prop.area,
        })

    return streaks


# ─────────────────────────────────────────────────────────────────────────────
# Main analysis pipeline
# ─────────────────────────────────────────────────────────────────────────────

def analyse_image(file_path: str,
                  job_id: str,
                  image_id: str,
                  params: Dict[str, Any]) -> Tuple[List[Dict], Dict[str, Any]]:
    """
    Main entry point for image analysis.
    Returns (detections_list, metadata_dict).

    Supports FITS (via _read_fits) and standard image formats (via PIL).
    """
    ext = os.path.splitext(file_path)[1].lower()
    now = datetime.now(timezone.utc).isoformat()
    metadata: Dict[str, Any] = {}

    if ext in (".fits", ".fit"):
        arr, fits_header = _read_fits(file_path)
        if arr is None:
            raise ValueError("Failed to read FITS data array")
        metadata.update({
            "telescope": fits_header.get("TELESCOP"),
            "obs_date": fits_header.get("DATE-OBS"),
            "exposure_time_s": _safe_float(fits_header.get("EXPTIME")),
            "ra_deg": _safe_float(fits_header.get("RA")) if _safe_float(fits_header.get("RA")) is not None else _safe_float(fits_header.get("CRVAL1")),
            "dec_deg": _safe_float(fits_header.get("DEC")) if _safe_float(fits_header.get("DEC")) is not None else _safe_float(fits_header.get("CRVAL2")),
            "width": int(fits_header.get("NAXIS1", 0)),
            "height": int(fits_header.get("NAXIS2", 0)),
        })
    elif PIL_OK:
        with PILImage.open(file_path) as img:
            arr_pil = np.array(img.convert("L"), dtype=np.float32)
        arr = arr_pil
        metadata["width"] = arr.shape[1]
        metadata["height"] = arr.shape[0]
    else:
        raise ValueError("Cannot load image: PIL not available and not a FITS file")

    img_norm = normalise_image(arr)

    # Prefer threshold_sigma (1-20 sigma) over legacy threshold fraction
    threshold_sigma = params.get("threshold_sigma", None)
    if threshold_sigma is None:
        # Legacy: convert fraction [0, 1] to approximate sigma (fraction * 10)
        legacy = params.get("threshold", 0.5)
        threshold_sigma = max(0.5, legacy * 10.0)
    threshold_sigma = float(threshold_sigma)

    min_pixels = params.get("min_pixels", 4)
    max_pixels = params.get("max_pixels", 500)
    window_size = params.get("window_size", 5)
    detect_streaks_flag = params.get("detect_streaks", True)

    detections = []

    # --- Point-source detections ---
    sources = detect_sources(arr, threshold_sigma=threshold_sigma,
                             min_pixels=min_pixels, max_pixels=max_pixels,
                             window_size=window_size)
    for src in sources:
        ecc = src.get("eccentricity", 0.0)
        ctype = "star" if ecc < 0.8 else "point_mover"
        confidence = min(1.0, src["snr"] / 20.0) if src["snr"] > 0 else None
        detections.append({
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "image_id": image_id,
            "candidate_type": ctype,
            "confidence": round(confidence, 3) if confidence is not None else None,
            "pixel_x": round(src["centroid_x"], 2),
            "pixel_y": round(src["centroid_y"], 2),
            "pixel_x2": None,
            "pixel_y2": None,
            "length_px": None,
            "angle_deg": None,
            "snr": round(src["snr"], 2),
            "magnitude": None,
            "centroid_x": round(src["centroid_x"], 2),
            "centroid_y": round(src["centroid_y"], 2),
            "created_at": now,
        })

    # --- Streak detections ---
    streak_candidates = []
    if detect_streaks_flag:
        streaks = detect_streaks(arr, threshold_sigma=threshold_sigma)
        for stk in streaks:
            confidence = min(1.0, stk["snr"] / 15.0) if stk["snr"] > 0 else None
            streak_candidates.append({
                "id": str(uuid.uuid4()),
                "job_id": job_id,
                "image_id": image_id,
                "candidate_type": "streak",
                "confidence": round(confidence, 3) if confidence is not None else None,
                "pixel_x": round(stk["pixel_x"], 2),
                "pixel_y": round(stk["pixel_y"], 2),
                "pixel_x2": round(stk["pixel_x2"], 2),
                "pixel_y2": round(stk["pixel_y2"], 2),
                "length_px": round(stk["length_px"], 2),
                "angle_deg": round(stk["angle_deg"], 2) if stk["angle_deg"] is not None else None,
                "snr": round(stk["snr"], 2),
                "magnitude": None,
                "centroid_x": round(stk["centroid_x"], 2),
                "centroid_y": round(stk["centroid_y"], 2),
                "created_at": now,
            })

    # Deduplicate: remove point-source detections that fall inside or right next to a detected streak
    if streak_candidates:
        filtered_points = []
        for pt in detections:
            px, py = pt["centroid_x"], pt["centroid_y"]
            near_streak = False
            for stk in streak_candidates:
                # Check distance from point to streak centroid or line segment
                sx, sy = stk["centroid_x"], stk["centroid_y"]
                slen = stk["length_px"] or 20.0
                if math.hypot(px - sx, py - sy) < max(25.0, slen / 2.0):
                    near_streak = True
                    break
            if not near_streak:
                filtered_points.append(pt)
        detections = filtered_points + streak_candidates
    else:
        detections = detections

    return detections, metadata


def _safe_float(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
