import { useState, useRef, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import type { DetectionCandidate } from '../api/client'

interface ScientificImageViewerProps {
  imageSrc: string | null
  imageName?: string
  width?: number | null
  height?: number | null
  detections?: DetectionCandidate[]
  selectedDetectionId?: string | null
  onSelectDetection?: (id: string | null) => void
  isLoading?: boolean
  obsDate?: string | null
  telescope?: string | null
}

export default function ScientificImageViewer({
  imageSrc,
  imageName,
  width = 646,
  height = 486,
  detections = [],
  selectedDetectionId = null,
  onSelectDetection,
  isLoading = false,
}: ScientificImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Overlay filter mode: 'all' | 'streaks' | 'stars' | 'none'
  const [overlayMode, setOverlayMode] = useState<'all' | 'streaks' | 'stars' | 'none'>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }, [imageSrc])

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 10.0))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.2))

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 0.85
    setZoom((z) => Math.min(Math.max(z * factor, 0.2), 10.0))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  const showStars = overlayMode === 'all' || overlayMode === 'stars'
  const showStreaks = overlayMode === 'all' || overlayMode === 'streaks'

  const filteredDetections = detections.filter((d) => {
    if (d.candidate_type === 'streak' && !showStreaks) return false
    if (d.candidate_type === 'star' && !showStars) return false
    return true
  })

  // Separate streak detections and index them T-001, T-002, ...
  const streaksList = detections.filter((d) => d.candidate_type === 'streak')
  const streakIdMap = new Map<string, string>()
  streaksList.forEach((stk, idx) => {
    streakIdMap.set(stk.id, `T-${String(idx + 1).padStart(3, '0')}`)
  })

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[380px] lg:h-[420px] bg-[#050811] border border-[#162340] rounded-2xl overflow-hidden select-none cursor-crosshair flex items-center justify-center shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : ''
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Subtle Starry Canvas Background Pattern */}
      <div className="absolute inset-0 bg-[#050811] opacity-95 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* TOP OVERLAYS */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
        {/* Left Filter Dropdown Pill */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-[#0c1426]/90 backdrop-blur-md border border-[#1b2b4a] hover:border-blue-500/50 text-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-lg transition-all"
          >
            <Layers size={13} className="text-blue-400" />
            <span>
              {overlayMode === 'all'
                ? 'Stars + Streaks'
                : overlayMode === 'streaks'
                ? 'Streaks Only'
                : overlayMode === 'stars'
                ? 'Stars Only'
                : 'Raw Sensor Only'}
            </span>
            <ChevronDown size={13} className="text-slate-400 ml-0.5" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-44 bg-[#0a1122] border border-[#1e2f50] rounded-xl shadow-2xl py-1 z-30 font-mono text-xs">
              <button
                onClick={() => { setOverlayMode('all'); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-white"
              >
                Stars + Streaks
              </button>
              <button
                onClick={() => { setOverlayMode('streaks'); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-white"
              >
                Streaks Only
              </button>
              <button
                onClick={() => { setOverlayMode('stars'); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-white"
              >
                Stars Only
              </button>
              <button
                onClick={() => { setOverlayMode('none'); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-white"
              >
                Raw Sensor Only
              </button>
            </div>
          )}
        </div>

        {/* Right Zoom & Fullscreen Controls Pill */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-[#0c1426]/90 backdrop-blur-md border border-[#1b2b4a] hover:border-slate-400 text-slate-300 hover:text-white rounded-lg shadow-lg transition-all"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-[#0c1426]/90 backdrop-blur-md border border-[#1b2b4a] hover:border-slate-400 text-slate-300 hover:text-white rounded-lg shadow-lg transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-[#0c1426]/90 backdrop-blur-md border border-[#1b2b4a] hover:border-slate-400 text-slate-300 hover:text-white rounded-lg shadow-lg transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Image & SVG Overlays Canvas */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-2 text-xs font-mono text-slate-400 z-10">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <span>INGESTING SENSOR STREAM...</span>
        </div>
      ) : imageSrc ? (
        <div
          className="relative transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Main Astronomical Sensor Image */}
          <img
            src={imageSrc}
            alt="Observation Frame"
            className="max-w-none select-none pointer-events-none rounded shadow-2xl"
            style={{
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
            }}
            draggable={false}
          />

          {/* SVG Bounding Box Overlays */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${width || 646} ${height || 486}`}
          >
            {filteredDetections.map((det) => {
              const isSelected = selectedDetectionId === det.id
              const isStreak = det.candidate_type === 'streak'
              const cx = det.centroid_x ?? det.pixel_x ?? 0
              const cy = det.centroid_y ?? det.pixel_y ?? 0

              if (isStreak) {
                const label = streakIdMap.get(det.id) ?? 'T-001'
                const x1 = det.pixel_x ?? cx - 15
                const y1 = det.pixel_y ?? cy - 15
                const x2 = det.pixel_x2 ?? cx + 15
                const y2 = det.pixel_y2 ?? cy + 15

                const dx = x2 - x1
                const dy = y2 - y1
                const len = Math.max(Math.sqrt(dx * dx + dy * dy), 20)
                const angleRad = Math.atan2(dy, dx)
                const angleDeg = angleRad * (180 / Math.PI)
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2

                return (
                  <g
                    key={det.id}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => onSelectDetection?.(det.id)}
                  >
                    {/* Rotated Red Bounding Box around Streak */}
                    <g transform={`rotate(${angleDeg} ${midX} ${midY})`}>
                      <rect
                        x={midX - len / 2 - 6}
                        y={midY - 7}
                        width={len + 12}
                        height={14}
                        rx={2}
                        fill="rgba(239, 68, 68, 0.08)"
                        stroke="#ef4444"
                        strokeWidth={isSelected ? 2 : 1.25}
                        className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      />
                      {/* Trail central line */}
                      <line
                        x1={midX - len / 2}
                        y1={midY}
                        x2={midX + len / 2}
                        y2={midY}
                        stroke="#ffffff"
                        strokeWidth={1}
                        strokeDasharray="3 2"
                        strokeOpacity={0.8}
                      />
                    </g>

                    {/* Red Label Text e.g. T-001 */}
                    <text
                      x={midX}
                      y={midY - 14}
                      fill="#f87171"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                    >
                      {label}
                    </text>
                  </g>
                )
              }

              // Star Point Source: Green Square Box [ ]
              return (
                <g
                  key={det.id}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => onSelectDetection?.(det.id)}
                >
                  <rect
                    x={cx - 7}
                    y={cy - 7}
                    width={14}
                    height={14}
                    rx={1.5}
                    fill="rgba(52, 211, 153, 0.05)"
                    stroke="#34d399"
                    strokeWidth={isSelected ? 1.75 : 1}
                    className="drop-shadow-[0_0_6px_rgba(52,211,153,0.45)]"
                  />
                  {/* Subtle center point */}
                  <circle cx={cx} cy={cy} r={1} fill="#a7f3d0" />
                </g>
              )
            })}
          </svg>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono z-10">
          <Sparkles size={28} className="mb-2 text-slate-600" />
          <p className="text-xs uppercase tracking-wider text-slate-400">NO SENSOR FRAME LOADED</p>
          <p className="text-[11px] text-slate-600 mt-1">Select or upload a FITS / BMP image to inspect</p>
        </div>
      )}

      {/* BOTTOM-LEFT OVERLAY PILL */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
        <div className="bg-[#0c1426]/90 backdrop-blur-md border border-[#1b2b4a] text-slate-300 text-[11px] font-mono px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-slate-400 font-semibold">
            Image: <span className="text-slate-200">{imageName ?? 'sensor_001.fits'}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {width || 646} × {height || 486} px
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400 font-semibold">
            {Math.round(zoom * 100)}% zoom
          </span>
        </div>
      </div>
    </div>
  )
}
