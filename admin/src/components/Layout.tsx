import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Settings,
  Pill,
  QrCode,
  LogOut,
  ChevronLeft,
  BarChart2,
  Menu,
  Sparkles,
  Radio,
  AlertCircle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/users', label: 'Пользователи', icon: Users },
  { to: '/analytics', label: 'Аналитика', icon: BarChart2 },
  { to: '/broadcasts', label: 'Рассылки', icon: Radio },
  { to: '/logs', label: 'Ошибки и логи', icon: AlertCircle },
  { to: '/vitamins', label: 'Витамины', icon: Pill },
  { to: '/qr', label: 'QR-коды', icon: QrCode },
  { to: '/menu', label: 'Меню бота', icon: Menu },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

interface Props {
  children: ReactNode
  onLogout: () => void
}

export default function Layout({ children, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = NAV.find((n) => n.to === location.pathname)?.label ?? 'NutriBot'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
      {/* Sidebar */}
      <aside className={`relative flex flex-col transition-all duration-300 overflow-hidden ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1222] via-[#0f172a] to-[#0c0f1d]" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 60px 80px, rgba(255,255,255,0.6), transparent), radial-gradient(1.5px 1.5px at 120px 20px, rgba(16,185,129,0.8), transparent), radial-gradient(1px 1px at 40px 140px, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 180px 60px, rgba(6,182,212,0.7), transparent), radial-gradient(1px 1px at 90px 110px, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 150px 150px, rgba(139,92,246,0.6), transparent), radial-gradient(1px 1px at 30px 200px, rgba(255,255,255,0.5), transparent)',
          backgroundSize: '200px 240px',
        }} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-24 h-24 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Moonvit Admin
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase">NutriBot Control</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`}
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 py-4 space-y-1 overflow-y-auto px-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 text-emerald-400'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-emerald-400 to-cyan-400" />
                  )}
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'group-hover:text-slate-300'}`} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="relative px-2 pb-4">
          <div className="border-t border-white/5 mb-3" />
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 rounded-l-2xl overflow-hidden bg-gray-50">
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-gray-100/80 flex items-center px-8 shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          {/* Bot status is shown in Dashboard health section, not here */}
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-white to-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
