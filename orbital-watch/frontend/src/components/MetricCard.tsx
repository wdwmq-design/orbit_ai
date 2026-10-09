interface Props {
  label: string
  value: string | number | null
  unit?: string
  note?: string
  highlight?: boolean
}

export default function MetricCard({ label, value, unit, note, highlight }: Props) {
  const displayValue = value === null || value === undefined ? '—' : value
  return (
    <div className={`panel p-4 ${ highlight ? 'border-accent/40' : '' }`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold mono text-slate-100">{displayValue}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {note && <p className="text-xs text-slate-600 mt-1">{note}</p>}
    </div>
  )
}
