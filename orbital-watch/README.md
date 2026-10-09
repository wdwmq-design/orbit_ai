# ORBITAL WATCH — Space Debris Detection & Tracking

**NASA SPACE-02 Hackathon Project**

A full-stack scientific workstation for optical space debris detection,
multi-epoch track association, initial orbit determination, simulation,
and performance benchmarking using Pan-STARRS astronomical imagery.

---

## Project Structure

```
orbital-watch/
├── backend/              FastAPI + Python scientific core
│   ├── app/
│   │   ├── api/routes/   REST endpoints (6 modules)
│   │   ├── core/         Configuration
│   │   ├── db/           SQLite schema + async DB helpers
│   │   ├── models/       Pydantic schemas (shared types)
│   │   ├── services/     Image processing algorithms
│   │   └── main.py       FastAPI application entry point
│   ├── tests/            Pytest tests
│   └── requirements.txt
├── frontend/             React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── api/          Centralized typed API client
│   │   ├── components/   Shared UI components
│   │   └── pages/        Six module pages
│   └── package.json
├── data/
│   ├── catalog/          gemini.csv star catalog
│   └── uploads/          Uploaded & generated images (git-ignored)
├── matlab_reference/     Original MATLAB star-tracker code (read-only reference)
└── README.md
```

---

## Scientific Data in This Repo

| Item | Description |
|------|-------------|
| `data/catalog/gemini.csv` | 65 Gemini constellation stars with RA, Dec, Magnitude |
| Pan-STARRS FITS (7 files, ~83 MB) | Real PS1 telescope images, 2025-02-20, RA~177°, Dec~7°, 45s exposures |
| `matlab_reference/images/bmp_4.bmp` | Synthetic 646×486 star-tracker test image |

**Scientific Integrity Notices:**
- Results are labelled MEASURED vs. MODELLED vs. SYNTHETIC
- Streak detections are *candidates*, not confirmed debris
- Orbit solutions are labelled with quality flags
- Metrics are only computed from actual algorithm outputs against known ground truth

---

## Prerequisites

- Python 3.12+ (tested on 3.14.3)
- Node.js 18+ (tested on v24.14.0)
- No MATLAB required — algorithms ported to Python

---

## Quick Start

### 1. Install backend dependencies

```bash
cd orbital-watch/backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 3. Start the backend

```bash
# From orbital-watch/backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/api/docs

### 4. Install frontend dependencies

```bash
cd orbital-watch/frontend
npm install
```

### 5. Start the frontend

```bash
npm run dev
```

App: http://localhost:5173

### 6. Run backend tests

```bash
cd orbital-watch/backend
pytest -v
```

---

## Six Modules

| Module | Route | Status |
|--------|-------|--------|
| Image Analysis | `/image-analysis` | Foundation: upload, detect sources & streaks |
| Track Explorer | `/tracks` | Foundation: multi-epoch track listing |
| Trajectory Analysis | `/trajectory` | Foundation: orbital elements display |
| Simulation Lab | `/simulation` | Foundation: synthetic debris generator |
| Performance | `/performance` | Foundation: metric computation engine |
| Reports | `/reports` | Foundation: JSON report generator |

---

## MATLAB Reference

The original MATLAB star-tracker code lives in `matlab_reference/` and is preserved read-only.
It implements spacecraft attitude determination — **not** debris detection.
The Python backend ports its centroiding, distortion correction, and pattern matching
algorithms and explicitly annotates which camera model each algorithm applies to.

---

## Data Attribution

Pan-STARRS 1 Science Consortium images (PS1). Observations from 2025-02-20 UTC.
Telescope: IfA Pan-STARRS 1 (PS1), Haleakalā Observatory, Maui, Hawaiʻi.
