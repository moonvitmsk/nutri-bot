type Status = 'online' | 'offline' | 'error' | 'warning' | 'checking'

interface Props {
  status: Status
  label?: string
}

const CONFIG: Record<Status, { color: string; bg: string; text: string; pulse: boolean }> = {
  online:   { color: 'bg-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700', pulse: true },
  offline:  { color: 'bg-gray-400',    bg: 'bg-gray-50',     text: 'text-gray-600',    pulse: false },
  error:    { color: 'bg-red-400',     bg: 'bg-red-50',      text: 'text-red-700',     pulse: false },
  warning:  { color: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700',   pulse: true },
  checking: { color: 'bg-gray-300',    bg: 'bg-gray-50',     text: 'text-gray-500',    pulse: true },
}

const LABELS: Record<Status, string> = {
  online: 'Онлайн',
  offline: 'Оффлайн',
  error: 'Ошибка',
  warning: 'Внимание',
  checking: 'Проверка...',
}

export default function StatusBadge({ status, label }: Props) {
  const cfg = CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {label ?? LABELS[status]}
    </span>
  )
}
