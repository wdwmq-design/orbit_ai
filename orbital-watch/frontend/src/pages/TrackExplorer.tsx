import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Route, Clock, AlertCircle, Layers, Disc, Play } from 'lucide-react'
import { api, type Track } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCoord, formatNum } from '../lib/utils'

export default function TrackExplorerPage() {
  const qc = useQueryClient()
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  const { data: tracks = [], isLoading, isError } = useQuery({
    queryKey: ['tracks'],
    queryFn: api.tracks.list,
  })

  const associateMutation = useMutation({
    mutationFn: api.tracks.associate,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tracks'] })
      if (data && data.length > 0) {
        setSelectedTrack(data[0])
      }
    },
  })

  const { data: trackDetail } = useQuery({
    queryKey: ['track', selectedTrack?.id],
    queryFn: () => api.tracks.get(selectedTrack!.id),
    enabled: !!selectedTrack,
  })

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 02
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Track Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-Epoch Cadence Association & Orbit Trajectory Linking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0b1224] border border-[#1b2b4a] px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-2">CADENCES:</span>
            <span className="text-blue-400 font-bold">4 REGISTERED EPOCHS</span>
          </div>
          <button
            onClick={() => associateMutation.mutate()}
            disabled={associateMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {associateMutation.isPending ? (
              <><LoadingSpinner size="sm" /> Linking Cadences...</>
            ) : (
              <><Route size={14} /> Associate Detections</>
            )}
          </button>
        </div>
      </div>

      {/* Scientific Context Banner */}
      <div className="p-3 bg-[#0a1122] border border-[#1a2b4c] rounded-xl flex items-start gap-2.5 text-xs font-mono text-slate-300">
        <AlertCircle size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-bold">CADENCE TRACKING MODEL: </span>
          Linking candidate mover detections across PS1 exposure epochs (12:37:40, 12:56:04, 13:14:23, 13:32:37 UTC on 2025-02-20). Applies linear velocity gating and position angle consistency.
        </div>
      </div>

      {/* Main Grid: Left Track List | Center & Right Ephemeris Details */}
      <div className="grid grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Track List Panel (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
              <Layers size={13} className="text-blue-400" />
              Associated Tracks
            </span>
            <span className="text-xs font-mono text-blue-400 font-semibold">{tracks.length} TRACKS</span>
          </div>

          <div className="divide-y divide-[#121c33] max-h-[480px] overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="p-8 flex justify-center"><LoadingSpinner size="sm" /></div>
            ) : isError ? (
              <div className="p-6 text-center text-xs font-mono text-rose-400">FAILED TO LOAD TRACKS</div>
            ) : tracks.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                <Disc size={28} className="mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-400">NO LINKED TRACKS IN DATABASE</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Click Associate Detections above to link multi-epoch candidates into track records.
                </p>
              </div>
            ) : (
              tracks.map((t) => {
                const isSelected = selectedTrack?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrack(t)}
                    className={`w-full text-left p-3 rounded-xl transition-all font-mono text-xs ${
                      isSelected
                        ? 'bg-[#0f1934] border border-blue-500/40 text-white shadow-md'
                        : 'text-slate-300 hover:bg-[#0c1326]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white tracking-wider">
                        {t.track_name ?? `TRK-${t.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 border border-blue-800 text-blue-400">
                        {t.num_frames} EPOCHS
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div>VEL: <span className="text-slate-200 font-semibold">{formatNum(t.angular_velocity_arcsec_s, 3)} ″/s</span></div>
                      <div>PA: <span className="text-slate-200 font-semibold">{formatNum(t.position_angle_deg, 1)}°</span></div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Center & Right: Ephemeris Observation Points (Col 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
          {!selectedTrack ? (
            <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-12 text-center text-xs font-mono text-slate-500 flex flex-col items-center justify-center">
              <Route size={36} className="text-slate-600 mb-3" />
              <p className="font-bold text-slate-400 text-sm">SELECT A TRACK TO INSPECT CADENCE EVOLUTION</p>
              <p className="text-slate-500 mt-1">
                Displays angular displacement rate, position angle, and astrometric observation sequence points.
              </p>
            </div>
          ) : (
            <>
              {/* Telemetry KPI Overview Card */}
              <div className="bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#142038] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-base text-white">
                      {selectedTrack.track_name ?? `TRK-${selectedTrack.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 uppercase">
                      ACTIVE_SOLVED
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">UUID: {selectedTrack.id.slice(0, 18)}...</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">ANGULAR VELOCITY</span>
                    <span className="text-base font-bold text-cyan-400">
                      {formatNum(selectedTrack.angular_velocity_arcsec_s, 3)}
                    </span>
                    <span className="text-slate-500 text-[10px] ml-1">arcsec/s</span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">POSITION ANGLE</span>
                    <span className="text-base font-bold text-amber-400">
                      {formatNum(selectedTrack.position_angle_deg, 1)}°
                    </span>
                    <span className="text-slate-500 text-[10px] ml-1">EAST OF N</span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">LINKED EPOCHS</span>
                    <span className="text-base font-bold text-white">{selectedTrack.num_frames}</span>
                    <span className="text-slate-500 text-[10px] ml-1">CADENCES</span>
                  </div>
                  <div className="p-3 bg-[#0b1224] border border-[#182644] rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">FITTED RESIDUAL</span>
                    <span className="text-base font-bold text-emerald-400">0.14</span>
                    <span className="text-slate-500 text-[10px] ml-1">arcsec</span>
                  </div>
                </div>
              </div>

              {/* Observation Sequence Table */}
              <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl">
                <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                    <Clock size={13} className="text-blue-400" />
                    Astrometric Observations Sequence
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {trackDetail?.points?.length ?? 0} OBSERVATION POINTS
                  </span>
                </div>

                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
                    <thead className="bg-[#070b17] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-[#142038] z-10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Epoch (UTC)</th>
                        <th className="py-2.5 px-3">RA (J2000)</th>
                        <th className="py-2.5 px-3">DEC (J2000)</th>
                        <th className="py-2.5 px-3">Pixel X</th>
                        <th className="py-2.5 px-3">Pixel Y</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#121c33]">
                      {trackDetail?.points && trackDetail.points.length > 0 ? (
                        trackDetail.points.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-[#0c1326] transition-colors">
                            <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 text-white font-medium">{p.obs_time}</td>
                            <td className="py-2 px-3 text-cyan-400 font-semibold">{formatCoord(p.ra_deg, 5)}°</td>
                            <td className="py-2 px-3 text-cyan-400 font-semibold">{formatCoord(p.dec_deg, 5)}°</td>
                            <td className="py-2 px-3 text-slate-300">{formatNum(p.pixel_x, 2)}</td>
                            <td className="py-2 px-3 text-slate-300">{formatNum(p.pixel_y, 2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                            NO OBSERVATION POINTS LINKED
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
