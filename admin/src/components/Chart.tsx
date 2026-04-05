import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

interface BaseProps {
  data: Record<string, any>[]
  height?: number
  title?: string
}

interface LineChartProps extends BaseProps {
  type: 'line'
  lines: { dataKey: string; name: string; color?: string; yAxisId?: string }[]
  dualAxis?: boolean
}

interface BarChartProps extends BaseProps {
  type: 'bar'
  bars: { dataKey: string; name: string; color?: string }[]
  xKey?: string
}

interface PieChartProps extends BaseProps {
  type: 'pie'
  dataKey: string
  nameKey: string
}

type Props = LineChartProps | BarChartProps | PieChartProps

export default function Chart(props: Props) {
  const { data, height = 250, title } = props

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {props.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            {props.dualAxis && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />}
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {props.lines.map((line, i) => (
              <Line
                key={line.dataKey}
                yAxisId={line.yAxisId || 'left'}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ))}
          </LineChart>
        ) : props.type === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={props.xKey || 'date'} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {props.bars.map((bar, i) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color || COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey={props.dataKey}
              nameKey={props.nameKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={11}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
