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
    { to: '/ledger', label: '📖 खाता बही (Khata)' },
    { to: '/pay', label: '💰 Payment Submit' },
    { to: '/history', label: '📋 My History' },
  ]

  const adminLinks = [
    { to: '/admin', label: '🏠 Dashboard' },
    { to: '/admin/ledger', label: '📖 खाता बही (Khata)' },
    { to: '/pay', label: '💰 Pay My Kameti' },
    { to: '/admin/approvals', label: '✅ Approvals' },
    { to: '/admin/members', label: '👥 Members' },
    { to: '/admin/committee', label: '🏆 Committee' },
    { to: '/admin/reports', label: '📊 Reports' },
    { to: '/admin/settings', label: '⚙️ Settings' },
  ]

  const links = isAdmin ? adminLinks : memberLinks

  return (
    <nav className="bg-primary-600 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold tracking-tight">Mera Kameti</span>
            {isAdmin && <span className="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">ADMIN</span>}
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary-800 text-white shadow-inner'
                    : 'text-green-100 hover:bg-primary-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-green-100 hidden sm:block">👤 {user?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-primary-800 hover:bg-primary-900 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile horizontal scrolling nav */}
        <div className="lg:hidden flex gap-1 pb-2.5 overflow-x-auto scrollbar-none">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-primary-800 text-white font-bold'
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
