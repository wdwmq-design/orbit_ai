import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Plus, Download, FileCode } from 'lucide-react'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const REPORT_TYPES = [
  { value: 'summary',  label: 'Mission Observation Summary (JSON/CSV)' },
  { value: 'mpc',      label: 'Minor Planet Center (MPC) 80-Column Astrometry' },
  { value: 'oem',      label: 'CCSDS Orbit Ephemeris Message (OEM)' },
  { value: 'tle',      label: 'NORAD / SGP4 Two-Line Element (TLE) Format' },
]

export default function ReportsPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('VIGIL-PS1-OBSERVATION-LOG')
  const [reportType, setReportType] = useState('summary')
  const [format, setFormat] = useState('json')
  const [error, setError] = useState<string | null>(null)
  const [lastReport, setLastReport] = useState<Record<string, unknown> | null>(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: api.reports.list,
  })

  const createMutation = useMutation({
    mutationFn: () => api.reports.create({ report_type: reportType, title, format }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      setLastReport(data as Record<string, unknown>)
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="flex flex-col gap-3 min-h-full">
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            MODULE 06
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Reports & Astronomical Export
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            IAU Minor Planet Center (MPC 80-Col), CCSDS OEM & NORAD SGP4 TLE Compiler
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0b1224] border border-[#1b2b4a] px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-2">STANDARDS:</span>
            <span className="text-cyan-400 font-bold">IAU / CCSDS / NORAD</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Export Builder | Center & Right Report Viewer & History */}
      <div className="grid grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Left Form: Generate Report (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-[#080d1c] border border-[#162442] rounded-2xl p-4 shadow-xl flex flex-col space-y-3.5 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-[#142038] pb-2.5">
            <Plus size={13} className="text-blue-400" />
            <span className="font-bold text-white tracking-wide">Export Generator</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">REPORT TITLE / IDENTIFIER</label>
              <input
                className="w-full bg-[#050811] border border-[#1b2b4a] focus:border-blue-500 rounded-lg px-3 py-1.5 text-white outline-none transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">STANDARDIZED SPECIFICATION</label>
              <select
                className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">EXPORT FORMAT</label>
              <select
                className="w-full bg-[#050811] border border-[#1b2b4a] rounded-lg px-3 py-1.5 text-white outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="json">Structured JSON (RFC 8259)</option>
                <option value="csv">Standard CSV Table</option>
              </select>
            </div>

            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

            <button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
              disabled={createMutation.isPending || !title}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Compiling Astronomical Export...</>
              ) : (
                <><Plus size={13} /> Generate & Sign Report</>
              )}
            </button>

            <div className="p-3 bg-[#0a1122] border border-[#162442] rounded-xl space-y-1 text-slate-400 text-[11px]">
              <div className="font-bold text-slate-200">EXPORT CAPABILITIES:</div>
              <div>• MPC: 80-col astrometric optical observations</div>
              <div>• OEM: CCSDS 502.0-B-2 state vector ephemeris</div>
              <div>• TLE: Two-line Keplerian mean element sets</div>
            </div>
          </div>
        </div>

        {/* Center & Right: Report Terminal & History (Col 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3.5">
          {/* Last Generated Report Terminal */}
          {lastReport && (
            <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                  <FileCode size={13} className="text-blue-400" />
                  Generated Output Stream
                </span>
                <button
                  className="bg-[#0b1224] hover:bg-[#121c38] border border-[#1b2b4a] hover:border-slate-500 text-slate-300 text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${(lastReport['title'] as string ?? 'report').replace(/ /g, '_')}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download size={12} />
                  <span>Download Artifact</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-cyan-300 bg-[#050811] overflow-auto max-h-60 whitespace-pre-wrap select-text">
                {lastReport['content'] && typeof lastReport['content'] === 'object' && 'mpc_80_col_stream' in (lastReport['content'] as Record<string, unknown>)
                  ? String((lastReport['content'] as Record<string, unknown>)['mpc_80_col_stream'])
                  : lastReport['content'] && typeof lastReport['content'] === 'object' && 'tle_blocks' in (lastReport['content'] as Record<string, unknown>)
                  ? String((lastReport['content'] as Record<string, unknown>)['tle_blocks'])
                  : lastReport['content'] && typeof lastReport['content'] === 'object' && 'oem_stream' in (lastReport['content'] as Record<string, unknown>)
                  ? String((lastReport['content'] as Record<string, unknown>)['oem_stream'])
                  : JSON.stringify(lastReport, null, 2)}
              </pre>
            </div>
          )}

          {/* Historical Generated Reports Table */}
          <div className="bg-[#080d1c] border border-[#162442] rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-3.5 border-b border-[#142038] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                <FileSpreadsheet size={13} className="text-blue-400" />
                Export Archive & Signature Records
              </span>
              <span className="text-xs font-mono text-blue-400 font-semibold">{reports.length} ARCHIVED</span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center"><LoadingSpinner size="sm" /></div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  <FileSpreadsheet size={28} className="mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">NO EXPORTS COMPILED YET</p>
                  <p className="mt-1 text-[11px] text-slate-500">Select a specification format and click Generate & Sign Report.</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
                  <thead className="bg-[#070b17] text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-[#142038] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Spec Type</th>
                      <th className="py-2.5 px-3">Format</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Generated (UTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121c33]">
                    {(reports as Record<string, unknown>[]).map((r, i) => (
                      <tr key={i} className="hover:bg-[#0c1326] transition-colors">
                        <td className="py-2 px-3 text-white font-medium">{String(r['title'] ?? '—')}</td>
                        <td className="py-2 px-3 text-cyan-400 font-semibold">{String(r['report_type'] ?? '—').toUpperCase()}</td>
                        <td className="py-2 px-3 text-slate-400 uppercase">{String(r['format'] ?? '—')}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 border border-emerald-800 text-emerald-400 uppercase">
                            {String(r['status'] ?? '—')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{String(r['created_at'] ?? '—').slice(0, 19).replace('T', ' ')}</td>
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
