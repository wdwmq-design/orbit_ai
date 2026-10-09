import { NavLink } from 'react-router-dom'
import {
  Image as ImageIcon,
  Route,
  BarChart3,
  FlaskConical,
  Gauge,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/image-analysis', icon: ImageIcon,    label: 'Image Analysis',      code: 'IMG-01' },
  { to: '/tracks',         icon: Route,        label: 'Track Explorer',      code: 'TRK-02' },
  { to: '/trajectory',     icon: BarChart3,    label: 'Trajectory Analysis', code: 'ORB-03' },
  { to: '/simulation',     icon: FlaskConical, label: 'Simulation Lab',      code: 'SIM-04' },
  { to: '/performance',    icon: Gauge,        label: 'Performance',          code: 'EVL-05' },
  { to: '/reports',        icon: FileText,     label: 'Reports & Export',    code: 'RPT-06' },
]

function EarthSatelliteGraphic() {
  return (
    <div className="relative w-full h-44 overflow-hidden mt-auto select-none pointer-events-none">
      {/* Background space with subtle stars */}
      <div className="absolute inset-0 bg-transparent">
        <div className="absolute w-1 h-1 bg-white/70 rounded-full top-4 left-6" />
        <div className="absolute w-1.5 h-1.5 bg-blue-200/80 rounded-full top-8 right-12" />
        <div className="absolute w-0.5 h-0.5 bg-white/50 rounded-full top-12 left-20" />
        <div className="absolute w-1 h-1 bg-cyan-300/80 rounded-full top-2 right-24" />
      </div>

      {/* Satellite floating above Earth */}
      <div className="absolute top-6 right-10 z-20 flex items-center justify-center transform -rotate-12 hover:scale-110 transition-transform">
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
          {/* Main Bus */}
          <rect x="20" y="18" width="8" height="12" rx="1.5" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1" />
          {/* Solar Panel Left */}
          <rect x="2" y="21" width="15" height="6" rx="1" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.8" />
          <line x1="7" y1="21" x2="7" y2="27" stroke="#93c5fd" strokeWidth="0.6" />
          <line x1="12" y1="21" x2="12" y2="27" stroke="#93c5fd" strokeWidth="0.6" />
          {/* Solar Panel Right */}
          <rect x="31" y="21" width="15" height="6" rx="1" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.8" />
          <line x1="36" y1="21" x2="36" y2="27" stroke="#93c5fd" strokeWidth="0.6" />
          <line x1="41" y1="21" x2="41" y2="27" stroke="#93c5fd" strokeWidth="0.6" />
          {/* Panel Struts */}
          <line x1="17" y1="24" x2="20" y2="24" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="28" y1="24" x2="31" y2="24" stroke="#94a3b8" strokeWidth="1.2" />
          {/* High Gain Antenna Dish */}
          <circle cx="24" cy="14" r="3" fill="#cbd5e1" stroke="#0369a1" strokeWidth="0.8" />
          <line x1="24" y1="16" x2="24" y2="18" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>

      {/* Photorealistic Earth Curvature SVG */}
      <svg
        viewBox="0 0 240 180"
        fill="none"
        className="absolute -bottom-8 -left-12 w-[340px] h-[220px] z-10 overflow-visible"
      >
        <defs>
          {/* Atmospheric Glow */}
          <radialGradient id="earthAtmosphere" cx="40%" cy="80%" r="70%">
            <stop offset="60%" stopColor="#0284c7" stopOpacity="0" />
            <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="95%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
          </radialGradient>

          {/* Earth Body Gradient */}
          <radialGradient id="earthBody" cx="30%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="40%" stopColor="#1e3a8a" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* Outer Atmospheric Halo */}
        <circle cx="90" cy="180" r="145" fill="url(#earthAtmosphere)" />

        {/* Earth Globe Sphere */}
        <circle cx="90" cy="180" r="140" fill="url(#earthBody)" />

        {/* Continents / Cloud swirls */}
        <path
          d="M20 90c12-8 30-4 42 6 8 7 18 12 28 8 14-6 26-16 42-12 10 3 20 10 30 7 8-3 16-10 24-8"
          stroke="#3b82f6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.35"
        />
        <path
          d="M-10 120c18-10 40-6 55 8 10 9 24 14 36 8 16-7 30-20 48-15 12 4 22 14 34 10"
          stroke="#60a5fa"
          strokeWidth="10"
          strokeLinecap="round"
          strokeOpacity="0.25"
        />
        <path
          d="M10 145c22-12 48-8 66 10 12 11 30 16 45 10"
          stroke="#93c5fd"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        {/* Horizon Edge Bright Rim */}
        <circle
          cx="90"
          cy="180"
          r="140"
          stroke="#7dd3fc"
          strokeWidth="1.5"
          strokeOpacity="0.75"
          className="drop-shadow-[0_0_15px_#38bdf8]"
        />
      </svg>
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#070b18]/95 border-r border-[#141e34] flex flex-col justify-between select-none z-20">
      {/* Navigation Modules list */}
      <div className="p-3 space-y-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, code }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_22px_rgba(37,99,235,0.4)] border border-blue-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1428] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-500/30 text-white'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold tracking-tight text-white leading-tight">
                    {label}
                  </span>
                  <span
                    className={`text-[10px] font-mono leading-tight mt-0.5 ${
                      isActive ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {code}
                  </span>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Earth and Satellite Realistic Space Scene */}
      <EarthSatelliteGraphic />
    </aside>
  )
}
