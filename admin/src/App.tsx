import { useState, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Vitamins from './pages/Vitamins'
import QRCodes from './pages/QRCodes'
import ErrorLogs from './pages/ErrorLogs'
import Analytics from './pages/Analytics'
import BotMenu from './pages/BotMenu'
import Broadcasts from './pages/Broadcasts'
import { Lock, Eye, EyeOff, Leaf } from 'lucide-react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'moonvit2026'

const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [attempts, setAttempts] = useState(() => {
    const stored = sessionStorage.getItem('nb_login_attempts')
    return stored ? parseInt(stored, 10) : 0
  })
  const [lockedUntil, setLockedUntil] = useState(() => {
    const stored = sessionStorage.getItem('nb_locked_until')
    return stored ? parseInt(stored, 10) : 0
  })

  const isLocked = Date.now() < lockedUntil

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('nb_auth', '1')
      sessionStorage.removeItem('nb_login_attempts')
      sessionStorage.removeItem('nb_locked_until')
      onLogin()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      sessionStorage.setItem('nb_login_attempts', String(newAttempts))
      setError(true)
      setTimeout(() => setError(false), 2000)

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_DURATION
        setLockedUntil(lockTime)
        sessionStorage.setItem('nb_locked_until', String(lockTime))
        setAttempts(0)
        sessionStorage.setItem('nb_login_attempts', '0')
      }
    }
  }

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <form onSubmit={handleSubmit} className="glass-white rounded-3xl p-10 w-full max-w-sm animate-fade-in relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg pulse-glow">
            <Leaf className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
          Moonvit Admin
        </h1>
        <p className="text-sm text-gray-400 text-center mb-8">Панель управления Moonvit</p>

        <div className="relative mb-5">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoFocus
            className={`w-full px-5 py-3.5 border-2 rounded-xl pr-12 outline-none transition-all duration-300 text-sm ${
              error
                ? 'border-red-400 bg-red-50/50 shake'
                : 'border-gray-200 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {isLocked && (
          <p className="text-red-500 text-xs mb-4 text-center animate-fade-in">
            Слишком много попыток. Подождите 5 минут.
          </p>
        )}

        {error && !isLocked && (
          <p className="text-red-500 text-xs mb-4 text-center animate-fade-in">
            Неверный пароль ({MAX_ATTEMPTS - attempts} попыт{MAX_ATTEMPTS - attempts === 1 ? 'ка' : 'ок'} осталось)
          </p>
        )}

        <button
          type="submit"
          disabled={isLocked}
          className={`w-full py-3.5 font-semibold rounded-xl transition-all duration-300 shadow-lg active:scale-[0.98] ${
            isLocked
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white hover:shadow-emerald-500/25'
          }`}
        >
          {isLocked ? 'Заблокировано' : 'Войти'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          Moonvit &copy; {new Date().getFullYear()}
        </p>
      </form>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('nb_auth') === '1')
  const handleLogin = useCallback(() => setAuthed(true), [])

  if (!authed) return <LoginScreen onLogin={handleLogin} />

  return (
    <Layout onLogout={() => { sessionStorage.removeItem('nb_auth'); setAuthed(false) }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/vitamins" element={<Vitamins />} />
        <Route path="/qr" element={<QRCodes />} />
        <Route path="/logs" element={<ErrorLogs />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/broadcasts" element={<Broadcasts />} />
        <Route path="/menu" element={<BotMenu />} />
      </Routes>
    </Layout>
  )
}
