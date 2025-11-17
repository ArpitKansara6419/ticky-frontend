// ForgotPasswordPage.jsx - Allows user to request a password reset link
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './AuthShared.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Request failed. Please try again.')
        return
      }

      setMessage(
        'If an account with that email exists, a password reset link has been prepared (demo only, no email sent).',
      )
    } catch (err) {
      console.error('Forgot password error', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Forgot Password</h2>
        <p className="auth-subtitle">Enter your email to request a password reset.</p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset request'}
          </button>
        </form>

        <div className="auth-footer-text">
          Remembered your password?{' '}
          <Link to="/" className="auth-link">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
