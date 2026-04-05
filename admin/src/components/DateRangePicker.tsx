import { useState } from 'react'
import { Calendar } from 'lucide-react'

export interface DateRange {
  from: Date
  to: Date
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: 'Сегодня', days: 0 },
  { label: '7д', days: 7 },
  { label: '14д', days: 14 },
  { label: '30д', days: 30 },
  { label: '90д', days: 90 },
] as const

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [custom, setCustom] = useState(false)

  function selectPreset(days: number) {
    setCustom(false)
    const to = new Date()
    const from = new Date()
    if (days > 0) from.setDate(from.getDate() - days)
    onChange({ from, to })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const isActive = !custom && Math.abs(
          Math.round((value.to.getTime() - value.from.getTime()) / 86400000) - p.days
        ) <= 1
        return (
          <button
            key={p.label}
            onClick={() => selectPreset(p.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        )
      })}

      <button
        onClick={() => setCustom(!custom)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
          custom ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Calendar className="w-3 h-3" />
        Период
      </button>

      {custom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toDateStr(value.from)}
            onChange={(e) => onChange({ ...value, from: new Date(e.target.value) })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="date"
            value={toDateStr(value.to)}
            onChange={(e) => onChange({ ...value, to: new Date(e.target.value) })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
          />
        </div>
      )}
    </div>
  )
}
