import { type LucideIcon, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: number | null
  trendLabel?: string
  loading?: boolean
  gradient?: string
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel = 'vs вчера',
  loading,
  gradient = 'from-emerald-500 to-teal-500',
}: Props) {
  if (loading) {
    return (
      <div className="gradient-border card-hover p-5 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const TrendIcon = trend == null || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor = trend == null || trend === 0
    ? 'text-gray-400'
    : trend > 0
      ? 'text-emerald-500'
      : 'text-red-500'

  return (
    <div className="gradient-border card-hover p-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`bg-gradient-to-br ${gradient} p-3 rounded-xl shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString('ru-RU') : value}</p>
          {trend != null && (
            <div className={`flex items-center gap-1 mt-0.5 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium">
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
