import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gauge, Play, AlertCircle, BarChart2 } from 'lucide-react'
import { api, type EvalMetrics } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatNum } from '../lib/utils'

export default function PerformancePage() {
  const qc = useQueryClient()
  const [simId, setSimId] = useState('')
  const [jobId, setJobId] = useState('')
  const [evalError, setEvalError] = useState<string | null>(null)

  const { data: evals = [], isLoading } = useQuery({
    queryKey: ['evals'],
    queryFn: api.evaluation.list,
  })

  const evalMutation = useMutation({
    mutationFn: () => api.evaluation.compute(simId, jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evals'] })
      setEvalError(null)
    },
    onError: (e: Error) => setEvalError(e.message),
  })

  const latest = evals[0] ?? null

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 05
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Performance & Evaluation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical Centroid Cross-Matching & Precision-Recall Benchmarks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0b1224] border border-[#1b2b4a] px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-2">GATE:</span>
            <span className="text-cyan-400 font-bold">≤ 30.0 PX RESIDUAL</span>
          </div>
        </div>
      </div>

      {/* Scientific Integrity Disclaimer */}
      <div className="p-3 bg-[#0a1122] border border-[#1a2b4c] rounded-xl flex items-start gap-2.5 text-xs font-mono text-slate-300">
        <AlertCircle size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-bold">EMPIRICAL BENCHMARK INTEGRITY: </span>
          All Precision, Recall, F1, and False Alarm Rates (FAR) are computed by cross-matching measured detector outputs against exact simulation ground truth. Zero fabricated numbers.
        </div>
      </div>

      {/* Main Grid: Left Compute Form | Center & Right Summary Cards & Log Table */}
      <div className="grid grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Metric Execution Form (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl flex flex-col space-y-3.5 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-[#142038] pb-2.5">
            <Play size={13} className="text-blue-400" />
            <span className="font-bold text-white tracking-wide">Run Evaluation Cross-Match</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">SIMULATION ID (GROUND TRUTH)</label>
              <input
                className="w-full bg-[#050811] border border-[#1b2b4a] focus:border-blue-500 rounded-lg px-3 py-1.5 text-white outline-none transition-all"
                placeholder="Paste Simulation UUID..."
                value={simId}
                onChange={(e) => setSimId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">DETECTION JOB ID (MEASURED)</label>
              <input
                className="w-full bg-[#050811] border border-[#1b2b4a] focus:border-blue-500 rounded-lg px-3 py-1.5 text-white outline-none transition-all"
                placeholder="Paste Job UUID..."
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
              />
            </div>

            {evalError && <div className="text-rose-400 text-[11px]">{evalError}</div>}

            <button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
              disabled={!simId || !jobId || evalMutation.isPending}
              onClick={() => evalMutation.mutate()}
            >
              {evalMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Matching Centroids...</>
              ) : (
                <><Play size={13} fill="currentColor" /> Execute Metric Benchmark</>
              )}
            </button>

            <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl space-y-1 text-slate-400 text-[11px]">
              <div className="font-bold text-slate-200">METRIC FORMULATIONS:</div>
              <div>• Precision = TP / (TP + FP)</div>
              <div>• Recall = TP / (TP + FN)</div>
              <div>• F1 Score = 2 × (P × R) / (P + R)</div>
              <div>• FAR = FP / Max(1, Total Detections)</div>
            </div>
          </div>
        </div>

        {/* Center & Right: Metric KPI Matrix Cards & Log Table (Col 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3.5">
          {/* Latest Metric Matrix Cards */}
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              <div className="bg-[#080d1c] border border-[#162442] p-3 rounded-xl text-center font-mono">
                <span className="text-[10px] text-slate-500 block uppercase">TRUE POS</span>
                <span className="text-xl font-bold text-emerald-400">{latest.true_positives ?? '—'}</span>
              </div>
              <div className="bg-[#080d1c] border border-[#162442] p-3 rounded-xl text-center font-mono">
                <span className="text-[10px] text-slate-500 block uppercase">FALSE POS</span>
                <span className="text-xl font-bold text-amber-400">{latest.false_positives ?? '—'}</span>
              </div>
              <div className="bg-[#080d1c] border border-[#162442] p-3 rounded-xl text-center font-mono">
                <span className="text-[10px] text-slate-500 block uppercase">FALSE NEG</span>
                <span className="text-xl font-bold text-rose-400">{latest.false_negatives ?? '—'}</span>
              </div>
              <div className="bg-[#080d1c] border border-blue-500/40 p-3 rounded-xl text-center font-mono shadow-md">
                <span className="text-[10px] text-slate-400 block uppercase">PRECISION</span>
                <span className="text-xl font-bold text-cyan-400">
                  {latest.precision_score !== null ? `${(latest.precision_score * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="bg-[#080d1c] border border-blue-500/40 p-3 rounded-xl text-center font-mono shadow-md">
                <span className="text-[10px] text-slate-400 block uppercase">RECALL</span>
                <span className="text-xl font-bold text-cyan-400">
                  {latest.recall_score !== null ? `${(latest.recall_score * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="bg-[#080d1c] border border-emerald-500/40 p-3 rounded-xl text-center font-mono shadow-md">
                <span className="text-[10px] text-slate-400 block uppercase">F1 SCORE</span>
                <span className="text-xl font-bold text-emerald-400">
                  {latest.f1_score !== null ? formatNum(latest.f1_score, 3) : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Historical Evaluations Table */}
          <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                <BarChart2 size={13} className="text-blue-400" />
                Empirical Evaluation Log
              </span>
              <span className="text-xs font-mono text-blue-400 font-semibold">{evals.length} BENCHMARKS</span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center"><LoadingSpinner size="sm" /></div>
              ) : evals.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  <Gauge size={28} className="mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">NO EVALUATIONS COMPUTED</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Run a simulation and analyse it in Image Analysis, then paste the IDs above to execute cross-matching.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
                  <thead className="bg-[#070b17] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-[#142038] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp (UTC)</th>
                      <th className="py-2.5 px-3">TP</th>
                      <th className="py-2.5 px-3">FP</th>
                      <th className="py-2.5 px-3">FN</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                      <th className="py-2.5 px-3">F1</th>
                      <th className="py-2.5 px-3">FAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121c33]">
                    {evals.map((e) => (
                      <tr key={e.id} className="hover:bg-[#0c1326] transition-colors">
                        <td className="py-2 px-3 text-white font-medium">{e.created_at.slice(0, 19).replace('T', ' ')}</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">{e.true_positives ?? '—'}</td>
                        <td className="py-2 px-3 text-amber-400">{e.false_positives ?? '—'}</td>
                        <td className="py-2 px-3 text-rose-400">{e.false_negatives ?? '—'}</td>
                        <td className="py-2 px-3 text-cyan-400 font-semibold">{formatNum(e.precision_score, 3)}</td>
                        <td className="py-2 px-3 text-cyan-400 font-semibold">{formatNum(e.recall_score, 3)}</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">{formatNum(e.f1_score, 3)}</td>
                        <td className="py-2 px-3 text-slate-400">{formatNum(e.far, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
