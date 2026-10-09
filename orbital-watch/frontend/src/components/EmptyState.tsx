import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-graphite-400 mb-3" strokeWidth={1} />
      <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 max-w-xs mb-4">{description}</p>
      {action}
    </div>
  )
}
