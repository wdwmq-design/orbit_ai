import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export default function PageHeader({ icon: Icon, title, subtitle, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-graphite-800 border border-graphite-600 rounded">
          <Icon size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-100">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
