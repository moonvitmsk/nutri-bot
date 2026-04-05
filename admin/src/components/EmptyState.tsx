import { Inbox } from 'lucide-react'

interface Props {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export default function EmptyState({
  title = 'Нет данных',
  description = 'за выбранный период',
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {icon || <Inbox className="w-12 h-12 mb-3 text-gray-300" />}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  )
}
