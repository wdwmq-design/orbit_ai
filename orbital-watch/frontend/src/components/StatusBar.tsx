import { useQuery } from '@tanstack/react-query'
import { api, type HealthStatus } from '../api/client'

export default function StatusBar() {
  const { data, isError } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 10_000,
    retry: 0,
  })

  const connected = !!data && !isError

  return (
    <header className="h-14 bg-[#060914] border-b border-[#131d33] flex items-center justify-between px-5 select-none z-30">
      {/* Left: VIGIL Brand with ringed planet logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 text-white">
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]">
            {/* Planet Sphere */}
            <circle cx="18" cy="18" r="9" fill="url(#planetGrad)" stroke="#93c5fd" strokeWidth="1.2" />
            {/* Atmosphere bands */}
            <path d="M10 16c2.5 1 12 1 15-0.5" stroke="#60a5fa" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />
            <path d="M11 20c2.5 1 11 1 14-0.5" stroke="#60a5fa" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />
            {/* Orbital Ring tilted */}
            <ellipse
              cx="18"
              cy="18"
              rx="16"
              ry="5.5"
              transform="rotate(-25 18 18)"
              stroke="#bfdbfe"
              strokeWidth="1.5"
              strokeDasharray="40 1 15 1"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="planetGrad" x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1e3a8a" />
                <stop offset="0.6" stopColor="#0f172a" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-extrabold text-base tracking-wider text-white leading-tight">
            VIGIL
          </span>
          <span className="font-mono text-[9px] tracking-widest text-slate-400 uppercase leading-none mt-0.5">
            SPACE-02 <span className="text-slate-600">|</span> DEBRIS RADAR
          </span>
        </div>
      </div>

      {/* Center: Mission Telemetry */}
      <div className="hidden md:flex items-center gap-8 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider text-[11px]">STATION</span>
          <span className="text-slate-200 font-semibold tracking-wide">ON-PRIMARY-01</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider text-[11px]">CATALOG</span>
          <span className="text-slate-200 font-semibold tracking-wide">GEMINI (65 REF STARS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 uppercase tracking-wider text-[11px]">COORD</span>
          <span className="text-slate-200 font-semibold tracking-wide">J2000 / ICRS</span>
        </div>
      </div>

      {/* Right: Operational Status Indicator */}
      <div className="flex items-center gap-3">
        {connected ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#091222] border border-[#172744] text-slate-200 text-xs font-mono tracking-wide shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">SYSTEM ONLINE</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono tracking-wide">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">STANDBY / RECONNECTING</span>
          </div>
        )}
      </div>
    </header>
  )
}
