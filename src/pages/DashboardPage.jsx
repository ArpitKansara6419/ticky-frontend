// DashboardPage.jsx - Simple blank dashboard shown after successful login
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear tokens from both storages for safety
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    navigate('/')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-text">This is a blank dashboard page. You can add content here later.</p>
        <button className="dashboard-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}

export default DashboardPage
