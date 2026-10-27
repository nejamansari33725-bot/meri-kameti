import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'

  const memberLinks = [
    { to: '/dashboard', label: '🏠 Dashboard' },
    { to: '/pay', label: '💰 Payment Submit' },
    { to: '/history', label: '📋 History' },
  ]

  const adminLinks = [
    { to: '/admin', label: '🏠 Dashboard' },
    { to: '/admin/approvals', label: '✅ Approvals' },
    { to: '/admin/members', label: '👥 Members' },
    { to: '/admin/committee', label: '🏆 Committee' },
    { to: '/admin/reports', label: '📊 Reports' },
  ]

  const links = isAdmin ? adminLinks : memberLinks

  return (
    <nav className="bg-primary-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold">Mera Kameti</span>
            {isAdmin && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-semibold ml-2">ADMIN</span>}
          </div>

          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary-800 text-white'
                    : 'text-green-100 hover:bg-primary-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-green-100 hidden md:block">👤 {user?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-primary-800 hover:bg-primary-900 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-primary-800 text-white'
                  : 'text-green-100 hover:bg-primary-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
