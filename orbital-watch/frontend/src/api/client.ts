import axios, { AxiosError } from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor for consistent error shape
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    const msg =
      error.response?.data?.detail ??
      error.response?.data?.error ??
      error.message ??
      'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

// ─── Types ──────────────────────────────────────────────────────────────────

export type CandidateType = 'star' | 'streak' | 'point_mover' | 'cosmic_ray' | 'artifact' | 'unknown'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ImageMetadata {
  id: string
  filename: string
  original_filename: string
  file_size: number
  file_format: string
  width: number | null
  height: number | null
  upload_time: string
  exposure_time_s: number | null
  obs_date: string | null
  ra_deg: number | null
  dec_deg: number | null
  telescope: string | null
  status: string
}

export interface DetectionCandidate {
  id: string
  job_id: string
  image_id: string
  candidate_type: CandidateType
  confidence: number | null
  pixel_x: number | null
  pixel_y: number | null
  pixel_x2: number | null
  pixel_y2: number | null
  length_px: number | null
  angle_deg: number | null
  snr: number | null
  magnitude: number | null
  centroid_x: number | null
  centroid_y: number | null
  created_at: string
}

export interface DetectionJob {
  id: string
  image_id: string
  created_at: string
  completed_at: string | null
  status: JobStatus
  error_message: string | null
  detections: DetectionCandidate[]
}

export interface DetectionParams {
  image_id: string
  threshold?: number
  threshold_sigma?: number
  min_pixels?: number
  max_pixels?: number
  window_size?: number
  detect_streaks?: boolean
}

export interface Track {
  id: string
  track_name: string | null
  created_at: string
  num_frames: number
  angular_velocity_arcsec_s: number | null
  position_angle_deg: number | null
  status: string
  points: TrackPoint[]
}

export interface TrackPoint {
  id: string
  track_id: string
  image_id: string
  detection_id: string | null
  obs_time: string
  ra_deg: number | null
  dec_deg: number | null
  pixel_x: number | null
  pixel_y: number | null
}

export interface OrbitalElements {
  id: string
  track_id: string
  created_at: string
  method: string
  semi_major_axis_km: number | null
  eccentricity: number | null
  inclination_deg: number | null
  raan_deg: number | null
  arg_perigee_deg: number | null
  true_anomaly_deg: number | null
  period_min: number | null
  perigee_km: number | null
  apogee_km: number | null
  orbital_regime: string | null
  residual_arcsec: number | null
  solution_quality: string | null
  notes: string | null
}

export interface SimulationConfig {
  name?: string
  background_image_id?: string | null
  num_debris?: number
  streak_magnitude?: number
  velocity_px_s?: number
  streak_angle_deg?: number
  exposure_time_s?: number
  add_noise?: boolean
  noise_sigma?: number
  psf_fwhm_px?: number
}

export interface SimulationResult {
  id: string
  created_at: string
  name: string
  config: SimulationConfig
  status: string
  output_image_id: string | null
  ground_truth: Array<Record<string, unknown>> | null
}

export interface EvalMetrics {
  id: string
  simulation_id: string | null
  created_at: string
  detection_job_id: string | null
  true_positives: number | null
  false_positives: number | null
  false_negatives: number | null
  precision_score: number | null
  recall_score: number | null
  f1_score: number | null
  astrometric_rmse_px: number | null
  far: number | null
  notes: string | null
}

export interface HealthStatus {
  status: string
  version: string
  db_ok: boolean
  upload_dir_ok: boolean
  environment: string
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const api = {
  health: () => apiClient.get<HealthStatus>('/health').then((r) => r.data),

  images: {
    list: () => apiClient.get<ImageMetadata[]>('/images').then((r) => r.data),
    get: (id: string) => apiClient.get<ImageMetadata>(`/images/${id}`).then((r) => r.data),
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return apiClient.post<{ image: ImageMetadata; message: string }>('/images', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    delete: (id: string) => apiClient.delete(`/images/${id}`),
    analyse: (id: string, params: Omit<DetectionParams, 'image_id'>) =>
      apiClient.post<DetectionJob>(`/images/${id}/analyse`, { image_id: id, ...params }).then((r) => r.data),
    listJobs: (id: string) => apiClient.get<DetectionJob[]>(`/images/${id}/jobs`).then((r) => r.data),
    getJob: (jobId: string) => apiClient.get<DetectionJob>(`/images/jobs/${jobId}`).then((r) => r.data),
    loadSample: (sampleType: string) =>
      apiClient.post<{ image: ImageMetadata; message: string }>(`/images/samples/load/${sampleType}`).then((r) => r.data),
  },

  tracks: {
    list: () => apiClient.get<Track[]>('/tracks').then((r) => r.data),
    get: (id: string) => apiClient.get<Track>(`/tracks/${id}`).then((r) => r.data),
    associate: () => apiClient.post<Track[]>('/tracks/associate').then((r) => r.data),
  },

  trajectories: {
    list: () => apiClient.get<OrbitalElements[]>('/trajectories').then((r) => r.data),
    get: (id: string) => apiClient.get<OrbitalElements>(`/trajectories/${id}`).then((r) => r.data),
    solve: (trackId: string) => apiClient.post<OrbitalElements>(`/trajectories/solve/${trackId}`).then((r) => r.data),
  },

  simulation: {
    list: () => apiClient.get<SimulationResult[]>('/simulation').then((r) => r.data),
    get: (id: string) => apiClient.get<SimulationResult>(`/simulation/${id}`).then((r) => r.data),
    create: (config: SimulationConfig) =>
      apiClient.post<SimulationResult>('/simulation', config).then((r) => r.data),
  },

  evaluation: {
    list: () => apiClient.get<EvalMetrics[]>('/evaluation').then((r) => r.data),
    compute: (simId: string, jobId: string) =>
      apiClient.post<EvalMetrics>(`/evaluation/compute/${simId}/${jobId}`).then((r) => r.data),
  },

  reports: {
    list: () => apiClient.get<unknown[]>('/reports').then((r) => r.data),
    create: (req: {
      report_type: string
      title: string
      image_ids?: string[]
      track_ids?: string[]
      trajectory_ids?: string[]
      format?: string
    }) => apiClient.post('/reports', req).then((r) => r.data),
  },
}
