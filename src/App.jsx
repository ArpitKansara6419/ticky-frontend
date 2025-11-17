// App.jsx - Defines top-level routes (Login, Register, Dashboard, ForgotPassword)
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import './App.css'

// Utility to check if user is authenticated based on stored token
const isAuthenticated = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  return Boolean(token)
}

// Protected route wrapper for dashboard
const PrivateRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
