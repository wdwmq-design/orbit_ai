import { AlertTriangle, X } from 'lucide-react'

interface Props {
  message: string
  onDismiss?: () => void
}

export default function ErrorMessage({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/50 rounded p-3 text-sm text-red-300">
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 hover:text-red-100">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
