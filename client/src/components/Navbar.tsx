import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Trophy, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { team, isAdmin, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout(); // logout() does window.location.href='/' internally
  };

  const navItems = isAdmin
    ? [{ to: '/admin', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Admin' }]
    : [
        { to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
        { to: '/leaderboard', icon: <Trophy className="w-4 h-4" />, label: 'Leaderboard' },
      ];

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 glass-dark border-b border-cyan-400/10"
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.7))' }} />
          <span className="font-terminal font-bold text-sm text-cyan-300 hidden sm:block">
            MYSTERY VAULT
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-terminal text-xs transition-all
                ${location.pathname === item.to
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30'
                  : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                }`}
            >
              {item.icon}
              <span className="hidden sm:block">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Team info + logout */}
        <div className="flex items-center gap-3">
          {team && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 glass rounded-lg">
              <User className="w-3 h-3 text-cyan-400/60" />
              <span className="font-terminal text-xs text-cyan-300">{team.name}</span>
              <span className="font-terminal text-xs text-purple-400 font-bold">{team.score}pts</span>
            </div>
          )}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 glass-purple rounded-lg">
              <Shield className="w-3 h-3 text-purple-400" />
              <span className="font-terminal text-xs text-purple-300">ADMIN</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-terminal text-xs text-red-400/70
              hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent hover:border-red-400/20"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Exit</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
