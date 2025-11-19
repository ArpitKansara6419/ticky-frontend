// LoginPage.jsx - Login screen with Remember Me, Forgot Password and store badges
import { useState } from 'react'\r
import { useNavigate, Link } from 'react-router-dom'\r
import './LoginPage.css'\r
import logo from '../assets/Logo.png'\r
import googlePlayBadge from '../assets/play.svg'\r
import appStoreBadge from '../assets/app.svg'\r

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


// EyeIcon - simple outline eye icon for show password
const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 5C7 5 3.73 8.11 2 12c1.73 3.89 5 7 10 7s8.27-3.11 10-7C20.27 8.11 17 5 12 5Z"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// EyeOffIcon - outline eye with strike-through for hide password
const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 3l18 18"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M10.58 10.73A3 3 0 0113.27 13.4"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.88 5.08A9.77 9.77 0 0112 5c5 0 8.27 3.11 10 7-.54 1.22-1.25 2.34-2.11 3.32"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.61 6.61C4.52 7.86 2.96 9.76 2 12c.89 1.99 2.3 3.68 4.06 4.93"
      stroke="#1b4c7a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.')
        setLoading(false)
        return
      }

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('authToken', data.token)

      navigate('/dashboard')
    } catch (err) {
      console.error('Login error', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrapper">
          <img src={logo} alt="Awokta logo" className="login-logo" />
          <h1 className="login-brand">AWOKTA</h1>
        </div>

        <h2 className="login-title">Login</h2>
        <p className="login-subtitle">Welcome Back! Please log in to continue</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="login-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-register-text">
          Don't have an account?{' '}
          <Link to="/register" className="register-link">
            Register here
          </Link>
        </div>

        <div className="login-divider" />

        <div className="engineer-section">
          <p className="engineer-title">Are you an engineer?</p>
          <p className="engineer-subtitle">Download our app from your app store!</p>
          <div className="store-badges">
            <a
              href="#"
              className="store-badge-link"
              aria-label="Google Play"
              onClick={(e) => e.preventDefault()}
            >
              <img src={googlePlayBadge} alt="Get it on Google Play" />
            </a>
            <a
              href="#"
              className="store-badge-link"
              aria-label="App Store"
              onClick={(e) => e.preventDefault()}
            >
              <img src={appStoreBadge} alt="Download on the App Store" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
