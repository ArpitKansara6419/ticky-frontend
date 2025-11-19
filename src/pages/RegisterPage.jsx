// RegisterPage.jsx - Registration screen for creating a new account
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AuthShared.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.')
        return
      }

      // Save token (treat like rememberMe = true) and go directly to dashboard
      if (data.token) {
        localStorage.setItem('authToken', data.token)
      }

      setSuccess('Registration successful. Logging you in...')
      navigate('/dashboard')
    } catch (err) {
      console.error('Register error', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Register</h2>
        <p className="auth-subtitle">Create your account to continue</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            className="auth-input"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="auth-input"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/" className="auth-link">
            Login here
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
