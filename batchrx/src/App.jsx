import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import { PharmacyProvider } from './context/PharmacyProvider'
import LoginPage from './components/LoginPage'
import LandingPage from './pages/LandingPage'

function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(window.localStorage.getItem('batchrx-token') || window.localStorage.getItem('batchrx-authenticated')))
  const [screen, setScreen] = useState('landing')
  if (!authenticated && screen === 'landing') return <LandingPage onEnter={() => setScreen('login')} />
  if (!authenticated) return <LoginPage onBack={() => setScreen('landing')} onAuthenticated={() => setAuthenticated(true)} />
  function logout() {
    window.localStorage.removeItem('batchrx-token')
    window.localStorage.removeItem('batchrx-authenticated')
    setAuthenticated(false)
    setScreen('landing')
  }
  return <PharmacyProvider><Dashboard onLogout={logout} /></PharmacyProvider>
}

export default App
