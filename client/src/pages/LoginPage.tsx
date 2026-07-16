import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Shield, UserPlus, LogIn } from 'lucide-react';
import MatrixRain from '../components/MatrixRain';
import ParticleField from '../components/ParticleField';
import TerminalText from '../components/TerminalText';
import VaultDoor from '../components/VaultDoor';

type Mode = 'login' | 'register' | 'admin';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [teamName, setTeamName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vaultOpening, setVaultOpening] = useState(false);
  const { login, register, adminLogin } = useAuth();
  const navigate = useNavigate();

  const resetForm = (newMode: Mode) => {
    setMode(newMode);
    setTeamName('');
    setPin('');
    setConfirmPin('');
    setShowPin(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !pin.trim()) {
      toast.error('Fill in all fields', { icon: '⚠️' });
      return;
    }

    if (mode === 'register') {
      if (!/^\d{4}$/.test(pin)) {
        toast.error('PIN must be exactly 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        toast.error('PINs do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'admin') {
        await adminLogin(teamName, pin);
        toast.success('Admin access granted', { icon: '🛡️' });
        navigate('/admin');

      } else if (mode === 'register') {
        await register(teamName.trim(), pin);
        toast.success(`Welcome to the Vault, ${teamName.trim()}! 🎉`, { duration: 5000 });
        setVaultOpening(true);
        setTimeout(() => navigate('/dashboard'), 2800);

      } else {
        await login(teamName, pin);
        setVaultOpening(true);
        setTimeout(() => navigate('/dashboard'), 2800);
      }
    } catch (err: any) {
      console.error('[Auth error]', err);
      let msg = 'Something went wrong';
      if (!err.response) {
        msg = 'Cannot reach server — is the backend running on port 5000?';
      } else if (err.response.status === 404) {
        msg = 'API not found — please restart the backend server';
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toast.error(msg, { icon: '🔒', duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'login',    label: 'Login',    icon: <LogIn className="w-4 h-4" /> },
    { id: 'register', label: 'Register', icon: <UserPlus className="w-4 h-4" /> },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040810] flex items-center justify-center">
      <MatrixRain />
      <ParticleField />
      <div className="crt-overlay" />
      <div className="scan-overlay" />

      <AnimatePresence>
        {vaultOpening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <VaultDoor isOpening={true} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full glass glow-blue mb-4"
          >
            <Shield className="w-10 h-10 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl font-black gradient-text mb-2 font-terminal animate-flicker">
            MYSTERY VAULT
          </h1>
          <div className="text-cyan-400/60 font-terminal text-sm">
            <TerminalText text="Secure CTF Platform v2.4.1" speed={50} />
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 glow-blue relative overflow-hidden">
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60 rounded-br-2xl" />

          {/* Tab switcher (Login / Register) — shown only in non-admin mode */}
          {mode !== 'admin' && (
            <div className="flex gap-1 mb-6 p-1 bg-black/30 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => resetForm(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-terminal text-xs uppercase tracking-widest transition-all
                    ${mode === tab.id
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Admin mode header */}
          {mode === 'admin' && (
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-purple-400" />
              <span className="font-terminal text-purple-400/80 text-sm uppercase tracking-widest">
                Admin Access Terminal
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Team Name */}
              <div>
                <label className="block text-xs font-terminal text-cyan-400/60 uppercase tracking-widest mb-2">
                  {mode === 'admin' ? 'Admin Name' : 'Team Name'}
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder={mode === 'admin' ? 'admin' : mode === 'register' ? 'e.g., CyberWolves' : 'Your team name'}
                  className="input-neon w-full rounded-lg px-4 py-3 font-terminal text-sm"
                  autoComplete="off"
                  id="team-name"
                  maxLength={30}
                />
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-terminal text-cyan-400/60 uppercase tracking-widest mb-2">
                  {mode === 'admin' ? 'Password' : '4-Digit PIN'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => setPin(mode === 'admin' ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={mode === 'admin' ? 'Enter password' : '••••'}
                    maxLength={mode === 'admin' ? undefined : 4}
                    inputMode={mode === 'admin' ? 'text' : 'numeric'}
                    className="input-neon w-full rounded-lg px-4 py-3 font-terminal text-sm pr-12"
                    id="team-pin"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN — only for register */}
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-terminal text-cyan-400/60 uppercase tracking-widest mb-2">
                    Confirm PIN
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    className={`input-neon w-full rounded-lg px-4 py-3 font-terminal text-sm
                      ${confirmPin && pin !== confirmPin ? 'border-red-500/60' : ''}
                      ${confirmPin && pin === confirmPin && pin.length === 4 ? 'border-green-500/60' : ''}
                    `}
                    id="confirm-pin"
                  />
                  {confirmPin && pin !== confirmPin && (
                    <p className="text-xs text-red-400 font-terminal mt-1">PINs don't match</p>
                  )}
                </motion.div>
              )}

              {/* Submit button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="btn-neon w-full py-4 rounded-xl font-terminal font-bold text-sm uppercase tracking-widest
                  bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                  border border-cyan-400/40 text-cyan-300
                  hover:border-cyan-400/70 hover:text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300 glow-blue mt-2"
                id="submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
                    />
                    {mode === 'register' ? 'Creating Team...' : 'Authenticating...'}
                  </span>
                ) : (
                  mode === 'admin'    ? '🛡️ Enter Admin Panel' :
                  mode === 'register' ? '🚀 Create Team & Enter' :
                                        '🔓 Unlock Mission'
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* Register hint */}
          {mode === 'register' && (
            <p className="mt-3 text-xs font-terminal text-cyan-400/40 text-center">
              Remember your team name and PIN — you'll need them to log back in.
            </p>
          )}

          {/* Admin toggle */}
          <button
            onClick={() => resetForm(mode === 'admin' ? 'login' : 'admin')}
            className="mt-5 w-full text-center text-xs font-terminal text-cyan-400/30 hover:text-cyan-400/60 transition-colors"
          >
            {mode === 'admin' ? '← Back to Team Login' : 'Admin Access'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs font-terminal text-cyan-400/30">
            MYSTERY VAULT CTF • AUTHORIZED PERSONNEL ONLY
          </p>
        </div>
      </motion.div>
    </div>
  );
}
