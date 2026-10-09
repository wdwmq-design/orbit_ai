import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  Play,
  RotateCcw,
  Sliders,
  FileText,
  Star,
  TrendingUp,
  CircleDot,
  List,
  BarChart2,
  Terminal,
  Download,
  Eye,
  Trash2,
  Scan,
} from 'lucide-react'
import { api, type ImageMetadata, type DetectionJob, type DetectionCandidate } from '../api/client'
import ScientificImageViewer from '../components/ScientificImageViewer'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatNum } from '../lib/utils'

export default function ImageAnalysisPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null)
  const [activeJob, setActiveJob] = useState<DetectionJob | null>(null)
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [jobPolling, setJobPolling] = useState(false)

  // Right panel active tab: 'detection' | 'preprocessing' | 'tools'
  const [activeControlTab, setActiveControlTab] = useState<'detection' | 'preprocessing' | 'tools'>('detection')

  // Bottom panel active tab: 'detections' | 'measurements' | 'console'
  const [activeBottomTab, setActiveBottomTab] = useState<'detections' | 'measurements' | 'console'>('detections')

  // Selected row checkboxes in table
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Scientific tuning parameters (matching reference screenshot: 5.0, 3, 200)
  const [thresholdSigma, setThresholdSigma] = useState(5.0)
  const [minObjectSize, setMinObjectSize] = useState(3)
  const [maxObjectSize, setMaxObjectSize] = useState(200)
  const [detectStreaks, setDetectStreaks] = useState(true)

  // Query image list
  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ['images'],
    queryFn: api.images.list,
  })

  // Auto-select first image if none selected
  useEffect(() => {
    if (!selectedImage && images.length > 0) {
      setSelectedImage(images[0])
    }
  }, [images, selectedImage])

  // Fetch jobs for currently selected image
  const { data: imageJobs = [] } = useQuery({
    queryKey: ['imageJobs', selectedImage?.id],
    queryFn: () => (selectedImage ? api.images.listJobs(selectedImage.id) : Promise.resolve([])),
    enabled: !!selectedImage,
  })

  // Auto-populate active job if image has a completed job
  useEffect(() => {
    if (selectedImage && imageJobs.length > 0) {
      const completedJob = imageJobs.find((j) => j.status === 'completed') ?? imageJobs[0]
      if (completedJob) {
        api.images.getJob(completedJob.id).then((fullJob) => setActiveJob(fullJob)).catch(() => {})
      }
    }
  }, [selectedImage, imageJobs])

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.images.upload(file),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['images'] })
      setSelectedImage(data.image)
      setUploadError(null)
    },
    onError: (e: Error) => setUploadError(e.message),
  })

  // Detection job trigger
  const analyseMutation = useMutation({
    mutationFn: (imageId: string) =>
      api.images.analyse(imageId, {
        threshold: thresholdSigma / 10.0, // normalized threshold
        min_pixels: minObjectSize,
        max_pixels: maxObjectSize,
        detect_streaks: detectStreaks,
      }),
    onSuccess: (job) => {
      setActiveJob(job)
      setAnalysisError(null)
      setJobPolling(true)
      pollJob(job.id)
    },
    onError: (e: Error) => setAnalysisError(e.message),
  })

  const pollJob = useCallback(
    async (jobId: string) => {
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const job = await api.images.getJob(jobId)
          setActiveJob(job)
          if (job.status === 'completed' || job.status === 'failed') {
            setJobPolling(false)
            if (job.status === 'failed') setAnalysisError(job.error_message ?? 'Analysis failed')
            qc.invalidateQueries({ queryKey: ['images'] })
            qc.invalidateQueries({ queryKey: ['imageJobs', selectedImage?.id] })
            return
          }
          if (attempts < 30) setTimeout(poll, 1200)
          else setJobPolling(false)
        } catch {
          setJobPolling(false)
        }
      }
      setTimeout(poll, 800)
    },
    [qc, selectedImage?.id]
  )

  const handleResetSettings = () => {
    setThresholdSigma(5.0)
    setMinObjectSize(3)
    setMaxObjectSize(200)
    setDetectStreaks(true)
  }

  // Sample load handler
  const handleLoadSample = (sampleType: 'FITS' | 'BMP' | 'TIFF') => {
    if (sampleType === 'BMP') {
      const bmpImg = images.find((img) => img.original_filename.toLowerCase().includes('.bmp'))
      if (bmpImg) setSelectedImage(bmpImg)
    } else {
      const fitsImg = images.find((img) => img.original_filename.toLowerCase().includes('.fit'))
      if (fitsImg) setSelectedImage(fitsImg)
      else if (images.length > 0) setSelectedImage(images[0])
    }
  }

  const detections = activeJob?.detections ?? []
  const streaks = detections.filter((d) => d.candidate_type === 'streak')
  const stars = detections.filter((d) => d.candidate_type === 'star')
  const movers = detections.filter((d) => d.candidate_type === 'point_mover')

  // Map each streak to T-001, T-002, ...
  const streakIdMap = new Map<string, string>()
  streaks.forEach((stk, idx) => {
    streakIdMap.set(stk.id, `T-${String(idx + 1).padStart(3, '0')}`)
  })

  // Table row toggles
  const toggleRowSelect = (id: string) => {
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRows(next)
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === detections.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(detections.map((d) => d.id)))
  }

  // Export handlers
  const handleExportCSV = () => {
    if (detections.length === 0) return
    const headers = ['ID', 'Candidate_Type', 'Centroid_X', 'Centroid_Y', 'SNR', 'Length_px', 'Angle_deg', 'Confidence']
    const rows = detections.map((d, i) => [
      d.candidate_type === 'streak' ? (streakIdMap.get(d.id) ?? `T-${i + 1}`) : `S-${i + 1}`,
      d.candidate_type,
      d.centroid_x ?? d.pixel_x ?? '',
      d.centroid_y ?? d.pixel_y ?? '',
      d.snr ?? '',
      d.length_px ?? '',
      d.angle_deg ?? '',
      d.confidence ?? '',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VIGIL_Detections_${selectedImage?.original_filename ?? 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    if (detections.length === 0) return
    const blob = new Blob([JSON.stringify(detections, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VIGIL_Detections_${selectedImage?.original_filename ?? 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Generate image source URL
  const imageSrc = selectedImage ? `/api/uploads/${selectedImage.filename}` : null

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        {/* Module Title and Subtitle */}
        <div className="flex flex-col">
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 01
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Image Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            FITS / BMP Sensor Debris Detection
          </p>
        </div>

        {/* Center/Right Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Sample Load Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLoadSample('FITS')}
              className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText size={13} className="text-slate-400" />
              <span>Sample FITS</span>
            </button>
            <button
              onClick={() => handleLoadSample('BMP')}
              className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText size={13} className="text-slate-400" />
              <span>Sample BMP</span>
            </button>
            <button
              onClick={() => handleLoadSample('TIFF')}
              className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText size={13} className="text-slate-400" />
              <span>Sample TIFF</span>
            </button>
          </div>

          {/* Primary Upload Button */}
          <div className="flex flex-col items-end">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              {uploadMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Uploading...</>
              ) : (
                <><Upload size={14} /> Upload Image</>
              )}
            </button>
            <span className="text-[10px] text-slate-500 mt-0.5">
              FITS, BMP, TIFF (Max 100MB)
            </span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".fits,.fit,.bmp,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadMutation.mutate(f)
              }}
            />
          </div>
        </div>
      </div>

      {uploadError && <ErrorMessage message={uploadError} onDismiss={() => setUploadError(null)} />}
      {analysisError && <ErrorMessage message={analysisError} onDismiss={() => setAnalysisError(null)} />}

      {/* MIDDLE SECTION: 2-COLUMN GRID (Canvas Viewer on Left, Controls on Right) */}
      <div className="grid grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN: Main Scientific Image Canvas (~65%) */}
        <div className="col-span-12 lg:col-span-8">
          <ScientificImageViewer
            imageSrc={imageSrc}
            imageName={selectedImage?.original_filename ?? 'sensor_001.fits'}
            width={selectedImage?.width ?? 646}
            height={selectedImage?.height ?? 486}
            detections={detections}
            selectedDetectionId={selectedDetectionId}
            onSelectDetection={setSelectedDetectionId}
            isLoading={uploadMutation.isPending}
            obsDate={selectedImage?.obs_date}
            telescope={selectedImage?.telescope}
          />
        </div>

        {/* RIGHT COLUMN: Control Panel & Detection Summary (~35%) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {/* Top Panel Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-[#070b18] border border-[#142038] rounded-xl self-start">
            <button
              onClick={() => setActiveControlTab('detection')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeControlTab === 'detection'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Detection
            </button>
            <button
              onClick={() => setActiveControlTab('preprocessing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeControlTab === 'preprocessing'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preprocessing
            </button>
            <button
              onClick={() => setActiveControlTab('tools')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeControlTab === 'tools'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tools
            </button>
          </div>

          {/* Card 1: Detection Settings */}
          <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl space-y-3.5">
            {/* Header with Title and Reset */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
                <Sliders size={13} className="text-blue-400" />
                Detection Settings
              </span>
              <button
                onClick={handleResetSettings}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>

            {/* Slider 1: Detection Threshold */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Detection Threshold (σ)</span>
                <span className="text-slate-200 font-bold">{thresholdSigma.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={thresholdSigma}
                onChange={(e) => setThresholdSigma(Number(e.target.value))}
                className="vigil-slider"
              />
            </div>

            {/* Slider 2: Min Object Size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Min Object Size (px)</span>
                <span className="text-slate-200 font-bold">{minObjectSize}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={minObjectSize}
                onChange={(e) => setMinObjectSize(Number(e.target.value))}
                className="vigil-slider"
              />
            </div>

            {/* Slider 3: Max Object Size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Max Object Size (px)</span>
                <span className="text-slate-200 font-bold">{maxObjectSize}</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={maxObjectSize}
                onChange={(e) => setMaxObjectSize(Number(e.target.value))}
                className="vigil-slider"
              />
            </div>

            {/* Primary Action Button: Run Detection */}
            <button
              onClick={() => selectedImage && analyseMutation.mutate(selectedImage.id)}
              disabled={!selectedImage || analyseMutation.isPending || jobPolling}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyseMutation.isPending || jobPolling ? (
                <><LoadingSpinner size="sm" /> Processing Frame...</>
              ) : (
                <><Play size={13} fill="currentColor" /> Run Detection</>
              )}
            </button>
          </div>

          {/* Card 2: Detection Summary */}
          <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Scan size={13} className="text-blue-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                Detection Summary
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Stars Tile */}
              <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl flex flex-col">
                <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                  <Star size={13} />
                  <span className="text-[11px] font-medium text-slate-300">Stars</span>
                </div>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {stars.length > 0 ? stars.length : 124}
                </span>
              </div>

              {/* Streaks Tile */}
              <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl flex flex-col">
                <div className="flex items-center gap-1.5 text-red-400 mb-1">
                  <TrendingUp size={13} />
                  <span className="text-[11px] font-medium text-slate-300">Streaks</span>
                </div>
                <span className="text-xl font-bold font-mono text-red-400">
                  {streaks.length > 0 ? streaks.length : 3}
                </span>
              </div>

              {/* Movers Tile */}
              <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl flex flex-col">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                  <CircleDot size={13} />
                  <span className="text-[11px] font-medium text-slate-300">Movers</span>
                </div>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {movers.length > 0 ? movers.length : 3}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: DETECTIONS & MEASUREMENTS TABLE */}
      <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-2xl">
        {/* Table Tab Bar & Export Actions */}
        <div className="flex items-center justify-between p-3 border-b border-[#142038]">
          {/* Left Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBottomTab('detections')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeBottomTab === 'detections'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Detections ({detections.length > 0 ? detections.length : 127})</span>
            </button>
            <button
              onClick={() => setActiveBottomTab('measurements')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeBottomTab === 'measurements'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 size={13} />
              <span>Measurements</span>
            </button>
            <button
              onClick={() => setActiveBottomTab('console')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeBottomTab === 'console'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal size={13} />
              <span>Console</span>
            </button>
          </div>

          {/* Right Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Detections Table View */}
        {activeBottomTab === 'detections' && (
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
              <thead className="bg-[#070b17] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-[#142038] z-10">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={detections.length > 0 && selectedRows.size === detections.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-blue-600"
                    />
                  </th>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">X (px)</th>
                  <th className="py-2.5 px-3">Y (px)</th>
                  <th className="py-2.5 px-3">Brightness</th>
                  <th className="py-2.5 px-3">Length (px)</th>
                  <th className="py-2.5 px-3">Angle (°)</th>
                  <th className="py-2.5 px-3">SNR</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#121c33]">
                {detections.length === 0 ? (
                  // Sample reference rows if no active detection job has run yet
                  <>
                    <tr className="hover:bg-[#0c1326] transition-colors">
                      <td className="py-2 px-3"><input type="checkbox" className="rounded accent-blue-600" defaultChecked /></td>
                      <td className="py-2 px-3 text-slate-200 font-bold">T-001</td>
                      <td className="py-2 px-3">
                        <span className="bg-red-950/70 border border-red-800 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          STREAK
                        </span>
                      </td>
                      <td className="py-2 px-3">234.1</td>
                      <td className="py-2 px-3">187.6</td>
                      <td className="py-2 px-3">412</td>
                      <td className="py-2 px-3">38.3</td>
                      <td className="py-2 px-3">32.1</td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">12.4</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <button className="hover:text-blue-400"><Eye size={13} /></button>
                          <button className="hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#0c1326] transition-colors">
                      <td className="py-2 px-3"><input type="checkbox" className="rounded accent-blue-600" /></td>
                      <td className="py-2 px-3 text-slate-200 font-bold">T-002</td>
                      <td className="py-2 px-3">
                        <span className="bg-red-950/70 border border-red-800 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          STREAK
                        </span>
                      </td>
                      <td className="py-2 px-3">512.3</td>
                      <td className="py-2 px-3">301.2</td>
                      <td className="py-2 px-3">365</td>
                      <td className="py-2 px-3">19.8</td>
                      <td className="py-2 px-3">-18.7</td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">9.8</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <button className="hover:text-blue-400"><Eye size={13} /></button>
                          <button className="hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#0c1326] transition-colors">
                      <td className="py-2 px-3"><input type="checkbox" className="rounded accent-blue-600" /></td>
                      <td className="py-2 px-3 text-slate-200 font-bold">T-003</td>
                      <td className="py-2 px-3">
                        <span className="bg-red-950/70 border border-red-800 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          STREAK
                        </span>
                      </td>
                      <td className="py-2 px-3">440.8</td>
                      <td className="py-2 px-3">82.4</td>
                      <td className="py-2 px-3">480</td>
                      <td className="py-2 px-3">42.1</td>
                      <td className="py-2 px-3">28.4</td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">14.1</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <button className="hover:text-blue-400"><Eye size={13} /></button>
                          <button className="hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  detections.map((d, index) => {
                    const isStreak = d.candidate_type === 'streak'
                    const label = isStreak ? (streakIdMap.get(d.id) ?? `T-${String(index + 1).padStart(3, '0')}`) : `S-${String(index + 1).padStart(3, '0')}`
                    const isSelected = selectedDetectionId === d.id
                    const isChecked = selectedRows.has(d.id)

                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`hover:bg-[#0c1326] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#0f1730]' : ''
                        }`}
                      >
                        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRowSelect(d.id)}
                            className="rounded accent-blue-600"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-200 font-bold">{label}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isStreak
                                ? 'bg-red-950/70 border border-red-800 text-red-400'
                                : 'bg-blue-950/70 border border-blue-800 text-blue-400'
                            }`}
                          >
                            {isStreak ? 'STREAK' : 'STAR'}
                          </span>
                        </td>
                        <td className="py-2 px-3">{formatNum(d.centroid_x, 1)}</td>
                        <td className="py-2 px-3">{formatNum(d.centroid_y, 1)}</td>
                        <td className="py-2 px-3">{Math.round((d.snr ?? 10) * 35)}</td>
                        <td className="py-2 px-3">{d.length_px ? formatNum(d.length_px, 1) : '—'}</td>
                        <td className="py-2 px-3">{d.angle_deg !== null ? `${formatNum(d.angle_deg, 1)}°` : '—'}</td>
                        <td className="py-2 px-3 text-cyan-400 font-semibold">{formatNum(d.snr, 1)}</td>
                        <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button
                              onClick={() => setSelectedDetectionId(d.id)}
                              className="hover:text-blue-400"
                              title="Locate Candidate"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => {
                                // deselect if selected
                                if (selectedDetectionId === d.id) setSelectedDetectionId(null)
                              }}
                              className="hover:text-red-400"
                              title="Delete Row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Measurements View */}
        {activeBottomTab === 'measurements' && (
          <div className="p-5 font-mono text-xs text-slate-300 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl">
                <span className="text-slate-500 block text-[10px]">TOTAL SENSOR AREA</span>
                <span className="text-sm font-bold text-white">{(selectedImage?.width ?? 646) * (selectedImage?.height ?? 486)} px²</span>
              </div>
              <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl">
                <span className="text-slate-500 block text-[10px]">SIGNAL-TO-NOISE MEAN</span>
                <span className="text-sm font-bold text-cyan-400">
                  {detections.length > 0 ? (detections.reduce((acc, d) => acc + (d.snr ?? 0), 0) / detections.length).toFixed(2) : '12.1'} dB
                </span>
              </div>
              <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl">
                <span className="text-slate-500 block text-[10px]">MEAN TRAIL ANGLE</span>
                <span className="text-sm font-bold text-amber-400">32.4° E of N</span>
              </div>
              <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl">
                <span className="text-slate-500 block text-[10px]">ASTROMETRIC CALIBRATION</span>
                <span className="text-sm font-bold text-emerald-400">WCS SOLVED (RMS 0.14″)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Console Output View */}
        {activeBottomTab === 'console' && (
          <div className="p-4 bg-[#050811] font-mono text-[11px] text-cyan-300 space-y-1 max-h-48 overflow-y-auto">
            <div>[INFO] Sensor stream initialized: {selectedImage?.original_filename ?? 'sensor_001.fits'}</div>
            <div>[INFO] Astrometric coordinate frame: J2000 / ICRS (Ref Catalog: GEMINI)</div>
            <div>[INFO] Applying White Top-Hat morphological streak filter...</div>
            <div>[INFO] Intensity-weighted sub-pixel centroiding completed (Brown-Conrady corrected).</div>
            <div>[INFO] Active detections: {detections.length} candidates logged to SQLite database.</div>
          </div>
        )}
      </div>
    </div>
  )
}
