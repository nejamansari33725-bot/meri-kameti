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
    { to: '/profile', label: '👤 मेरी प्रोफ़ाइल' },
  ]

  const adminLinks = [
    { to: '/admin', label: '🏠 डैशबोर्ड' },
    { to: '/admin/ledger', label: '📖 खाता बही' },
    { to: '/pay', label: '💰 अपनी किश्त' },
    { to: '/admin/approvals', label: '✅ अप्रूवल्स' },
    { to: '/admin/members', label: '👥 मेम्बर्स' },
    { to: '/admin/committee', label: '🏆 विनर चुनें' },
    { to: '/admin/reports', label: '📊 रिपोर्ट्स' },
    { to: '/profile', label: '👤 प्रोफ़ाइल' },
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* WhatsApp Group Link Button */}
            <a
              href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-green-500/20 transition-all transform hover:scale-105 shrink-0"
              title="कमिटी व्हाट्सएप ग्रुप से जुड़ें"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span className="hidden sm:inline">WhatsApp Group</span>
              <span className="sm:hidden">ग्रुप</span>
            </a>

            <Link
              to="/profile"
              className="hidden md:flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 hover:border-emerald-500/50 transition-all group"
              title="अपनी प्रोफ़ाइल देखें व एडिट करें"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-slate-200 group-hover:text-emerald-300 font-semibold">{user?.name}</span>
              <span className="text-[10px] text-slate-400">⚙️</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all font-semibold border border-slate-700/70 shadow-sm"
            >
              लॉगआउट
            </button>
          </div>
        </div>

        {/* Mobile Scrolling Navigation */}
        <div className="lg:hidden flex gap-1.5 pb-2.5 overflow-x-auto scrollbar-none items-center">
          <a
            href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0"
          >
            <span>💬</span> ग्रुप
          </a>
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
