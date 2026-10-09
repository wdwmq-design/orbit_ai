import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Orbit, AlertCircle, Layers, Globe2, Play } from 'lucide-react'
import { api, type OrbitalElements } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatNum } from '../lib/utils'

const REGIME_STYLES: Record<string, { badge: string; text: string }> = {
  LEO: { badge: 'bg-emerald-950/70 border-emerald-800 text-emerald-400', text: 'Low Earth Orbit (h < 2000 km)' },
  MEO: { badge: 'bg-blue-950/70 border-blue-800 text-blue-400', text: 'Medium Earth Orbit (Navigation / GPS)' },
  GEO: { badge: 'bg-amber-950/70 border-amber-800 text-amber-400', text: 'Geostationary Belt (r ~ 42,164 km)' },
  HEO: { badge: 'bg-purple-950/70 border-purple-800 text-purple-400', text: 'Highly Elliptical / Molniya Orbit' },
  unknown: { badge: 'bg-slate-900 border-slate-700 text-slate-400', text: 'Unclassified Regime' },
}

export default function TrajectoryPage() {
  const qc = useQueryClient()
  const [selectedTraj, setSelectedTraj] = useState<OrbitalElements | null>(null)
  const [solveError, setSolveError] = useState<string | null>(null)

  const { data: trajectories = [], isLoading } = useQuery({
    queryKey: ['trajectories'],
    queryFn: api.trajectories.list,
  })

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: api.tracks.list,
  })

  const solveMutation = useMutation({
    mutationFn: (trackId: string) => api.trajectories.solve(trackId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['trajectories'] })
      setSelectedTraj(data)
      setSolveError(null)
    },
    onError: (e: Error) => setSolveError(e.message),
  })

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 03
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Trajectory Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Initial Orbit Determination (IOD) & Keplerian State Estimation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0b1224] border border-[#1b2b4a] px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-2">GRAVITY:</span>
            <span className="text-blue-400 font-bold">WGS-84 / EGM96 J2</span>
          </div>
          {tracks.length > 0 && (
            <button
              onClick={() => {
                const trk = tracks.find((t) => (t.points?.length ?? t.num_frames) >= 3) ?? tracks[0]
                if (trk) solveMutation.mutate(trk.id)
              }}
              disabled={solveMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {solveMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Solving Gauss IOD...</>
              ) : (
                <><Play size={13} fill="currentColor" /> Run Gauss Solver</>
              )}
            </button>
          )}
        </div>
      </div>

      {solveError && <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono rounded-xl">{solveError}</div>}

      {/* Scientific Accuracy Alert */}
      <div className="p-3 bg-[#0a1122] border border-[#1a2b4c] rounded-xl flex items-start gap-2.5 text-xs font-mono text-slate-300">
        <AlertCircle size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-bold">INITIAL ORBIT DETERMINATION RULES: </span>
          Requires minimum 3 lines-of-sight observations with known observer geocentric topocentric vectors. Solutions without convergence are flagged UNCONSTRAINED.
        </div>
      </div>

      {/* Main Grid: Left Trajectory List | Center & Right Keplerian Elements */}
      <div className="grid grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Trajectories List (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
              <Layers size={13} className="text-blue-400" />
              Solved Trajectories
            </span>
            <span className="text-xs font-mono text-blue-400 font-semibold">{trajectories.length} SOLUTIONS</span>
          </div>

          <div className="divide-y divide-[#121c33] max-h-[480px] overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="p-8 flex justify-center"><LoadingSpinner size="sm" /></div>
            ) : trajectories.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                <Globe2 size={28} className="mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-400">NO TRAJECTORIES COMPUTED</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Trajectory solutions are solved once multi-epoch tracks reach ≥3 confirmed observations.
                </p>
              </div>
            ) : (
              trajectories.map((t) => {
                const isSelected = selectedTraj?.id === t.id
                const regime = t.orbital_regime ?? 'unknown'
                const rStyle = REGIME_STYLES[regime] ?? REGIME_STYLES.unknown
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTraj(t)}
                    className={`w-full text-left p-3 rounded-xl transition-all font-mono text-xs ${
                      isSelected
                        ? 'bg-[#0f1934] border border-blue-500/40 text-white shadow-md'
                        : 'text-slate-300 hover:bg-[#0c1326]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white tracking-wider">
                        ORB-{t.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rStyle.badge}`}>
                        {regime}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>SOLVER: {t.method}</span>
                      <span className="text-slate-200 font-semibold">QUAL: {t.solution_quality?.toUpperCase() ?? '—'}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Center & Right: Keplerian Orbital Telemetry (Col 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
          {!selectedTraj ? (
            <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-12 text-center text-xs font-mono text-slate-500 flex flex-col items-center justify-center">
              <Orbit size={36} className="text-slate-600 mb-3" />
              <p className="font-bold text-slate-400 text-sm">SELECT A TRAJECTORY TO VIEW KEPLERIAN STATE</p>
              <p className="text-slate-500 mt-1">
                Inspects semi-major axis (a), eccentricity (e), inclination (i), RAAN, and orbital period.
              </p>
            </div>
          ) : (
            <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl space-y-4 font-mono text-xs">
              {/* Header Row */}
              <div className="flex items-center justify-between border-b border-[#142038] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-base text-white">
                    SOLUTION: ORB-{selectedTraj.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                    REGIME_STYLES[selectedTraj.orbital_regime ?? 'unknown']?.badge ?? ''
                  }`}>
                    {selectedTraj.orbital_regime ?? 'UNCLASSIFIED'}
                  </span>
                </div>
                <span className="text-slate-400 text-xs">METHOD: {selectedTraj.method}</span>
              </div>

              {/* 6 Classical Keplerian Elements */}
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-2">
                  Classical Keplerian Orbital Elements (J2000 ICRS)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">SEMI-MAJOR AXIS (a)</span>
                    <span className="text-base font-bold text-cyan-400">
                      {formatNum(selectedTraj.semi_major_axis_km, 2)}
                    </span>
                    <span className="text-slate-500 text-[10px] ml-1">km</span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">ECCENTRICITY (e)</span>
                    <span className="text-base font-bold text-white">
                      {formatNum(selectedTraj.eccentricity, 5)}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">INCLINATION (i)</span>
                    <span className="text-base font-bold text-amber-400">
                      {formatNum(selectedTraj.inclination_deg, 3)}°
                    </span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">RAAN (Ω)</span>
                    <span className="text-base font-bold text-slate-200">
                      {formatNum(selectedTraj.raan_deg, 3)}°
                    </span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">ARG OF PERIGEE (ω)</span>
                    <span className="text-base font-bold text-slate-200">
                      {formatNum(selectedTraj.arg_perigee_deg, 3)}°
                    </span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">TRUE ANOMALY (ν)</span>
                    <span className="text-base font-bold text-slate-200">
                      {formatNum(selectedTraj.true_anomaly_deg, 3)}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Derived Ephemeris Telemetry */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Derived Orbital Parameters & Altitudes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">ORBITAL PERIOD</span>
                    <span className="text-sm font-bold text-white">{formatNum(selectedTraj.period_min, 2)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">min</span>
                  </div>
                  <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">PERIGEE ALTITUDE</span>
                    <span className="text-sm font-bold text-emerald-400">{formatNum(selectedTraj.perigee_km, 1)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">km</span>
                  </div>
                  <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">APOGEE ALTITUDE</span>
                    <span className="text-sm font-bold text-emerald-400">{formatNum(selectedTraj.apogee_km, 1)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">km</span>
                  </div>
                  <div className="p-2.5 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">ASTROMETRIC RESIDUAL</span>
                    <span className="text-sm font-bold text-cyan-400">{formatNum(selectedTraj.residual_arcsec, 2)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">arcsec</span>
                  </div>
                </div>
              </div>

              {selectedTraj.notes && (
                <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl text-slate-400 text-xs">
                  <span className="text-slate-200 font-bold block mb-1">IOD DIAGNOSTIC LOG:</span>
                  {selectedTraj.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
