import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu, Play, Sliders, Database, FileCode } from 'lucide-react'
import { api, type SimulationResult, type SimulationConfig } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { formatNum } from '../lib/utils'

export default function SimulationPage() {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [selectedSim, setSelectedSim] = useState<SimulationResult | null>(null)

  const [config, setConfig] = useState<SimulationConfig>({
    name: 'PS1-SYNTH-LEO-RUN-01',
    num_debris: 3,
    streak_magnitude: 18.0,
    velocity_px_s: 6.5,
    streak_angle_deg: 42.0,
    exposure_time_s: 45.0,
    add_noise: true,
    noise_sigma: 0.02,
    psf_fwhm_px: 2.2,
  })

  const { data: sims = [], isLoading } = useQuery({
    queryKey: ['simulations'],
    queryFn: api.simulation.list,
    refetchInterval: (query) => {
      const data = query.state.data as SimulationResult[] | undefined
      if (!data) return 5000
      const hasRunning = data.some((s) => s.status === 'pending' || s.status === 'running')
      return hasRunning ? 1500 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: () => api.simulation.create(config),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['simulations'] })
      setSelectedSim(data)
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const setProp = <K extends keyof SimulationConfig>(k: K, v: SimulationConfig[K]) =>
    setConfig((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 04
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Simulation Lab
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Physics Benchmark Injector & Ground-Truth Coordinate Synthesizer
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0b1224] border border-[#1b2b4a] px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-2">GROUND TRUTH:</span>
            <span className="text-emerald-400 font-bold">SUB-PIXEL LOGGING</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Config Form | Center Ground Truth Matrix | Right Simulation Runs History */}
      <div className="grid grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Simulation Configuration Form (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl flex flex-col space-y-3.5 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-[#142038] pb-2.5">
            <Sliders size={13} className="text-blue-400" />
            <span className="font-bold text-white tracking-wide">Physical Streak Parameters</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">EXPERIMENT RUN ID</label>
              <input
                className="w-full bg-[#050811] border border-[#1b2b4a] focus:border-blue-500 rounded-lg px-3 py-1.5 text-white outline-none transition-all"
                value={config.name}
                onChange={(e) => setProp('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">DEBRIS COUNT</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={1}
                  max={20}
                  value={config.num_debris}
                  onChange={(e) => setProp('num_debris', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">MAGNITUDE (V)</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={10}
                  max={25}
                  step={0.5}
                  value={config.streak_magnitude}
                  onChange={(e) => setProp('streak_magnitude', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">VELOCITY (px/s)</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={0.1}
                  max={100}
                  step={0.5}
                  value={config.velocity_px_s}
                  onChange={(e) => setProp('velocity_px_s', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">ANGLE (°)</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={0}
                  max={360}
                  value={config.streak_angle_deg}
                  onChange={(e) => setProp('streak_angle_deg', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">EXP TIME (s)</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={1}
                  max={300}
                  value={config.exposure_time_s}
                  onChange={(e) => setProp('exposure_time_s', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">NOISE SIGMA</label>
                <input
                  type="number"
                  className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                  min={0}
                  max={0.5}
                  step={0.005}
                  value={config.noise_sigma}
                  onChange={(e) => setProp('noise_sigma', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#142038]">
              <label htmlFor="chk-noise" className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                <input
                  id="chk-noise"
                  type="checkbox"
                  checked={config.add_noise}
                  onChange={(e) => setProp('add_noise', e.target.checked)}
                  className="accent-blue-600 rounded"
                />
                Simulate Shot & Readout Noise (Poisson / Gaussian)
              </label>
            </div>

            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

            <button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Synthesizing Array...</>
              ) : (
                <><Play size={13} fill="currentColor" /> Inject Debris & Log Ground Truth</>
              )}
            </button>
          </div>
        </div>

        {/* Center & Right: Ground Truth Inspector & History (Col 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3.5">
          {/* History Panel */}
          <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                <Database size={13} className="text-blue-400" />
                Synthetic Simulation Runs
              </span>
              <span className="text-xs font-mono text-blue-400 font-semibold">{sims.length} RUNS</span>
            </div>

            <div className="divide-y divide-[#121c33] max-h-60 overflow-y-auto p-1.5">
              {isLoading ? (
                <div className="p-8 flex justify-center"><LoadingSpinner size="sm" /></div>
              ) : sims.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  <Cpu size={28} className="mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">NO SYNTHETIC RUNS RECORDED</p>
                  <p className="mt-1 text-[11px] text-slate-500">Configure parameters and inject debris to synthesize verified benchmark frames.</p>
                </div>
              ) : (
                sims.map((sim) => {
                  const isSelected = selectedSim?.id === sim.id
                  return (
                    <button
                      key={sim.id}
                      onClick={() => setSelectedSim(sim)}
                      className={`w-full text-left p-3 rounded-xl transition-all font-mono text-xs ${
                        isSelected
                          ? 'bg-[#0f1934] border border-blue-500/40 text-white shadow-md'
                          : 'text-slate-300 hover:bg-[#0c1326]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white tracking-wider">{sim.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          sim.status === 'completed'
                            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}>
                          {sim.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400">
                        <div>DEBRIS: <span className="text-slate-200 font-semibold">{(sim.config as SimulationConfig).num_debris}</span></div>
                        <div>VEL: <span className="text-slate-200 font-semibold">{(sim.config as SimulationConfig).velocity_px_s} px/s</span></div>
                        <div>EXP: <span className="text-slate-200 font-semibold">{(sim.config as SimulationConfig).exposure_time_s}s</span></div>
                        <div>GT: <span className="text-cyan-400 font-semibold">{sim.ground_truth?.length ?? 0} LOGGED</span></div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Selected Run Ground-Truth Coordinates Inspector */}
          {selectedSim && selectedSim.ground_truth && selectedSim.ground_truth.length > 0 && (
            <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                  <FileCode size={13} className="text-blue-400" />
                  Ground Truth Coordinate Log (Verified)
                </span>
                <span className="text-xs font-mono text-slate-400">UUID: {selectedSim.id.slice(0, 18)}...</span>
              </div>
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
                  <thead className="bg-[#070b17] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-[#142038] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Debris ID</th>
                      <th className="py-2.5 px-3">Start (X₀, Y₀)</th>
                      <th className="py-2.5 px-3">End (X₁, Y₁)</th>
                      <th className="py-2.5 px-3">Length</th>
                      <th className="py-2.5 px-3">Angle</th>
                      <th className="py-2.5 px-3">Velocity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121c33]">
                    {selectedSim.ground_truth.map((gt: Record<string, unknown>, i) => (
                      <tr key={i} className="hover:bg-[#0c1326] transition-colors">
                        <td className="py-2 px-3 text-cyan-400 font-bold">#{String(gt['debris_id'] ?? i + 1)}</td>
                        <td className="py-2 px-3 text-slate-200">{formatNum(gt['x0'] as number, 1)}, {formatNum(gt['y0'] as number, 1)}</td>
                        <td className="py-2 px-3 text-slate-200">{formatNum(gt['x1'] as number, 1)}, {formatNum(gt['y1'] as number, 1)}</td>
                        <td className="py-2 px-3 text-amber-400">{formatNum(gt['streak_length_px'] as number, 1)} px</td>
                        <td className="py-2 px-3 text-slate-400">{formatNum(gt['angle_deg'] as number, 1)}°</td>
                        <td className="py-2 px-3 text-slate-400">{formatNum(gt['velocity_px_s'] as number, 1)} px/s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
