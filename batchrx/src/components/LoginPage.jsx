import { useState } from 'react'
import { apiRequest } from '../engine/api'

export default function LoginPage({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    try {
      const result = await apiRequest(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })
      window.localStorage.setItem('batchrx-token', result.token)
      onAuthenticated()
    } catch (requestError) {
      if (mode === 'login' && username === 'admin' && password === 'admin') {
        window.localStorage.setItem('batchrx-authenticated', 'true')
        onAuthenticated()
        return
      }
      setError(requestError.message)
    }
  }

  return <main className="grid min-h-screen bg-mist lg:grid-cols-[0.9fr_1.1fr]"><section className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal font-display text-2xl font-extrabold">B</div><p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-mint">Pharmacy control</p><h1 className="mt-4 max-w-md font-display text-5xl font-extrabold leading-tight">Every batch has a next best move.</h1><p className="mt-6 max-w-sm leading-7 text-white/65">BatchRx keeps expiry, stock, and shelf actions in one calm place.</p></div><p className="text-sm text-white/45">Secure API session · local demo workspace</p></section><section className="flex items-center justify-center p-6"><div className="w-full max-w-md"><button onClick={onBack} className="mb-8 text-sm font-bold text-slate hover:text-ink">← Back to overview</button><div className="mb-10 lg:hidden"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal font-display text-xl font-extrabold text-white">B</div><p className="mt-4 font-display text-xl font-extrabold text-ink">BatchRx</p></div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">Welcome back</p><h2 className="mt-3 font-display text-3xl font-extrabold text-ink">{mode === 'login' ? 'Sign in to your dispensary' : 'Create your account'}</h2><p className="mt-3 text-sm leading-6 text-slate">{mode === 'login' ? 'Open the stock desk and continue the morning check.' : 'Create a persistent account for this pharmacy workspace.'}</p><div className="mt-8 flex rounded-xl bg-white p-1"><button onClick={() => { setMode('login'); setError('') }} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === 'login' ? 'bg-ink text-white' : 'text-slate'}`}>Login</button><button onClick={() => { setMode('signup'); setError('') }} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === 'signup' ? 'bg-ink text-white' : 'text-slate'}`}>Sign up</button></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold text-ink">Username<input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-teal" autoComplete="username" required /></label><label className="block text-sm font-bold text-ink">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-teal" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>{error && <p role="alert" className="rounded-lg bg-coral/10 px-3 py-2 text-sm font-bold text-coral">{error}</p>}<button className="w-full rounded-xl bg-teal px-4 py-3.5 font-bold text-white hover:bg-ink" type="submit">{mode === 'login' ? 'Open BatchRx' : 'Create account'}</button></form>{mode === 'login' && <p className="mt-6 text-center text-xs text-slate">Demo access: <strong className="text-ink">admin / admin</strong></p>}</div></section></main>
}
