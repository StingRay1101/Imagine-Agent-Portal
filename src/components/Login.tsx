import { useState } from 'react'
import { verifyPassword, verifyAdminPassword } from '../api'

type LoginMode = 'agent' | 'admin'

interface Props {
  onLogin: () => void
  onAdminLogin: () => void
}

export default function Login({ onLogin, onAdminLogin }: Props) {
  const [mode, setMode] = useState<LoginMode>('agent')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'admin') {
      localStorage.setItem('admin_password', password)
      const ok = await verifyAdminPassword()
      setLoading(false)
      if (ok) {
        onAdminLogin()
      } else {
        localStorage.removeItem('admin_password')
        setError('Invalid admin password')
      }
    } else {
      localStorage.setItem('portal_password', password)
      const ok = await verifyPassword()
      setLoading(false)
      if (ok) {
        onLogin()
      } else {
        localStorage.removeItem('portal_password')
        setError('Invalid password')
      }
    }
  }

  function switchMode(newMode: LoginMode) {
    setMode(newMode)
    setPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <img
            src="https://cdn.shopify.com/s/files/1/2724/6858/files/White_Logo_Wholesale.png?v=1738893136"
            alt="Imagine Fashion"
            className="h-10 bg-black rounded-lg px-4 py-2"
          />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">
          {mode === 'admin' ? 'Imagine Login' : 'Sales Agent Portal'}
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">Imagine Fashion</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {mode === 'admin' ? 'Admin Password' : 'Password'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder={mode === 'admin' ? 'Enter admin password' : 'Enter portal password'}
            autoFocus
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === 'agent' ? (
            <button
              onClick={() => switchMode('admin')}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Imagine Login →
            </button>
          ) : (
            <button
              onClick={() => switchMode('agent')}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Agent Login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
