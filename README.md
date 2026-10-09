# VIGIL — SPACE-02
### Ground-Based Optical Detection and Tracking of Orbital Debris

VIGIL is a space-debris detection and tracking project designed to analyze ground-based optical telescope imagery and identify potential orbital debris through image processing, streak detection, and motion analysis.

The project aims to distinguish potential debris streaks from stars, background noise, and image artifacts while providing a platform for visualizing detections and evaluating detection performance using synthetic observations.

## 🚀 Project Overview

Space debris poses a growing challenge to satellites, spacecraft, and future space missions. Detecting and tracking these objects is important for understanding the orbital environment and supporting space situational awareness.

VIGIL explores how optical image processing and computational analysis can help identify potential debris signatures in telescope images.

The system combines a web-based interface with a Python backend to support image analysis, visualization, and simulation-based evaluation.

## 🎯 Objectives

- Detect potential debris streaks in optical telescope images.
- Distinguish streak-like candidates from stars and image artifacts.
- Analyze the geometric and photometric properties of detected candidates.
- Explore apparent motion estimation across multiple observations.
- Generate synthetic star fields and simulated debris streaks.
- Evaluate detection performance against known synthetic ground truth.
- Provide an interactive interface for analyzing images and visualizing results.

## ✨ Key Features

### 1. Optical Image Analysis
Upload supported telescope images for processing and analysis. The system is intended to identify candidate streaks and other image features that may be relevant to space-debris detection.

### 2. Streak Detection
Analyze image structures using image-processing techniques to identify elongated features that may correspond to moving objects.

### 3. Candidate Analysis
Examine detected candidates using properties such as position, length, orientation, and signal characteristics, depending on the implemented processing pipeline.

### 4. Multi-Frame Tracking
Explore associations between detections from different frames to estimate apparent motion over time.

### 5. Simulation Lab
Generate synthetic star fields and simulated streaks under configurable noise conditions to test detection behavior in controlled scenarios.

### 6. Detection Evaluation
Compare detected candidates against known synthetic ground truth using metrics such as precision, recall, F1-score, and localization error, where supported by the implementation.

### 7. Visualization
Use the web interface to inspect images and view detection results.

> **Scientific note:** A detected streak is a candidate, not definitive proof of orbital debris. Image-plane motion does not by itself establish a physical orbit. Reliable orbital determination requires calibrated observations, accurate timestamps, observer location, and appropriate geometric and dynamical modelling.

## 🛠️ Technology Stack

The project is designed around the following technologies:

- **Frontend:** React, TypeScript
- **Backend:** Python, FastAPI
- **Image Processing:** Python image-processing and numerical-computing libraries
- **Data Handling:** Image data and application data storage
- **Version Control:** Git and GitHub

The exact dependencies and versions are defined by the project's configuration files.

## 📁 Project Structure

The intended high-level organization is:

```text
VIGIL/
├── frontend/          # Web interface
├── backend/           # FastAPI application and image processing
├── README.md
└── .gitignore
```

The actual folder names may differ depending on the current repository layout.

## ⚙️ Getting Started

### Prerequisites

Install the following tools:

- Git
- Python 3.10 or a compatible version required by the backend
- Node.js and npm
- A code editor such as Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/wdwmq-design/orbit_ai.git
cd orbit_ai
```

### 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

**Windows:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies using the repository's dependency file. For example, if the project contains `requirements.txt`:

```bash
pip install -r requirements.txt
```

Start the FastAPI application using the entry point configured in the project. For example, if the application is exposed as `app.main:app`:

```bash
uvicorn app.main:app --reload
```

The API will typically be available at:

```text
http://127.0.0.1:8000
```

If enabled, interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### 3. Set Up the Frontend

Open a second terminal and navigate to the frontend directory.

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite typically serves the frontend at:

```text
http://localhost:5173
```

**Important:** These commands and paths are examples. Check the repository's actual folder structure, package scripts, backend entry point, and dependency files before running them.

## 🧪 Testing and Evaluation

Testing should cover the main components of the detection workflow:

- Image loading and input validation.
- Detection of synthetic streaks.
- Distinction between streak candidates and point-like sources.
- Robustness under varying background and noise conditions.
- Association of detections across multiple frames.
- Comparison of detections with synthetic ground truth.
- API behavior and frontend-backend integration.

Useful evaluation metrics include:

| Metric | Purpose |
|---|---|
| Precision | Measures how many reported detections match actual targets in the test data. |
| Recall | Measures how many known targets are detected. |
| F1-score | Combines precision and recall into one metric. |
| Localization Error | Measures the positional difference between a detection and its ground-truth target. |
| False Positives | Measures detections that do not correspond to known targets. |
| Missed Detections | Measures known targets that the system fails to detect. |

Synthetic test results should not be treated as proof of real-world performance. Validation with representative real telescope observations is also important.

## 🔭 Future Improvements

Potential areas for further development include:

- Improved streak detection under challenging noise conditions.
- More robust rejection of stars, cosmic-ray artifacts, and sensor defects.
- Better association of detections across successive frames.
- Calibrated confidence estimates for candidate detections.
- Evaluation using real and synthetic astronomical observations.
- Astrometric calibration and physically grounded orbit estimation.
- Performance optimization for large astronomical images.
- Reproducible benchmarks and expanded automated tests.

These are development goals and should not be interpreted as features already implemented.

## ⚠️ Limitations

- Detection performance depends on image quality, noise, exposure settings, and the detection algorithm.
- Elongated image features may have causes other than orbital debris.
- A single image generally cannot establish an object's motion or orbital parameters.
- Synthetic simulations may not capture all the conditions present in real telescope observations.
- Quantitative results depend on the accuracy of ground-truth annotations and matching procedures.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and add appropriate tests.
4. Submit a pull request describing the changes.

Please avoid committing API keys, credentials, private datasets, generated build files, or local environment files.

## 📄 License

A license has not yet been specified. Until a license is added to the repository, do not assume that others have permission to redistribute or modify the project.

## 👨‍🚀 Project

**Project Name:** VIGIL — SPACE-02  
**Focus:** Ground-Based Optical Detection and Tracking of Orbital Debris  
**Repository:** https://github.com/wdwmq-design/orbit_ai
