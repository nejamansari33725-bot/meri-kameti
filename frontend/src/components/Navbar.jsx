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
    { to: '/dashboard', label: '🏠 डैशबोर्ड' },
    { to: '/ledger', label: '📖 खाता बही' },
    { to: '/pay', label: '💰 पेमेंट करें' },
    { to: '/history', label: '📋 मेरी हिस्ट्री' },
  ]

  const adminLinks = [
    { to: '/admin', label: '🏠 डैशबोर्ड' },
    { to: '/admin/ledger', label: '📖 खाता बही' },
    { to: '/pay', label: '💰 अपनी किश्त' },
    { to: '/admin/approvals', label: '✅ अप्रूवल्स' },
    { to: '/admin/members', label: '👥 मेम्बर्स' },
    { to: '/admin/committee', label: '🏆 विनर चुनें' },
    { to: '/admin/reports', label: '📊 रिपोर्ट्स' },
    { to: '/admin/settings', label: '⚙️ सेटिंग्स' },
  ]

  const links = isAdmin ? adminLinks : memberLinks

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              💰
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
                  Mera Kameti
                </span>
                {isAdmin && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black tracking-wide shadow-sm">
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map(link => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-slate-200 font-semibold">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all font-semibold border border-slate-700/70 shadow-sm"
            >
              लॉगआउट
            </button>
          </div>
        </div>

        {/* Mobile Scrolling Navigation */}
        <div className="lg:hidden flex gap-1.5 pb-2.5 overflow-x-auto scrollbar-none">
          {links.map(link => {
            const isActive = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white bg-slate-800/60 border border-slate-700/50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
