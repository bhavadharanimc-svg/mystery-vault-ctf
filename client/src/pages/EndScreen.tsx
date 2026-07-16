import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import AchievementBadge from '../components/AchievementBadge';
import ParticleField from '../components/ParticleField';
import MatrixRain from '../components/MatrixRain';
import { Trophy, Download, RotateCcw } from 'lucide-react';

export default function EndScreen() {
  const { team } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const colors = ['#00d4ff', '#a855f7', '#39ff14', '#ff006e', '#ffffff'];
    const fire = () => {
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.3 }, colors });
      confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.5 }, colors });
      confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.5 }, colors });
    };
    fire();
    const t = setTimeout(fire, 1500);
    return () => clearTimeout(t);
  }, []);

  const handleDownloadCert = () => {
    const cert = `
MYSTERY VAULT CTF
CERTIFICATE OF COMPLETION

This is to certify that

${team?.name || 'Agent'}

has successfully completed the Mystery Vault CTF Challenge

Final Score: ${team?.score || 0} points
Challenges Solved: ${team?.challenges_solved || 0}/9

Date: ${new Date().toLocaleDateString()}

WELL DONE, AGENT. THE VAULT IS YOURS.
    `.trim();

    const blob = new Blob([cert], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MysteryVaultCTF_${team?.name}_Certificate.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#040810] relative overflow-hidden flex items-center justify-center">
      <MatrixRain />
      <ParticleField />
      <div className="crt-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-2xl w-full mx-4 text-center"
      >
        {/* Trophy animation */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-6"
        >
          🏆
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-6xl font-black gradient-text font-terminal mb-2 animate-flicker"
        >
          MISSION COMPLETE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 font-terminal text-lg mb-8"
        >
          The vault has been conquered, agent.
        </motion.p>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-2xl p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-purple-400/5 to-green-400/5" />
          <div className="relative">
            <div className="text-sm font-terminal text-cyan-400/60 uppercase tracking-widest mb-1">Agent</div>
            <div className="text-3xl font-black gradient-text font-terminal mb-6">{team?.name}</div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-4xl font-black font-terminal text-yellow-400 mb-1">{team?.score || 0}</div>
                <div className="text-xs font-terminal text-gray-500 uppercase">Final Score</div>
              </div>
              <div>
                <div className="text-4xl font-black font-terminal text-cyan-300 mb-1">{team?.challenges_solved || 0}</div>
                <div className="text-xs font-terminal text-gray-500 uppercase">Flags Captured</div>
              </div>
              <div>
                <div className="text-4xl font-black font-terminal text-purple-300 mb-1">🎖️</div>
                <div className="text-xs font-terminal text-gray-500 uppercase">Elite Agent</div>
              </div>
            </div>

            {/* Achievements */}
            {team?.achievements && team.achievements.length > 0 && (
              <div>
                <div className="text-xs font-terminal text-gray-500 uppercase tracking-widest mb-4">Achievements Unlocked</div>
                <div className="flex flex-wrap justify-center gap-4">
                  {team.achievements.map(a => (
                    <AchievementBadge key={a.badge} badge={a.badge} size="md" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadCert}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-terminal font-bold text-sm
              bg-gradient-to-r from-yellow-500/20 to-orange-500/20
              border border-yellow-400/40 text-yellow-300
              hover:border-yellow-400/70 transition-all glow-blue"
          >
            <Download className="w-4 h-4" />
            Download Certificate
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/leaderboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-terminal font-bold text-sm
              bg-gradient-to-r from-cyan-500/20 to-purple-500/20
              border border-cyan-400/40 text-cyan-300
              hover:border-cyan-400/70 transition-all"
          >
            <Trophy className="w-4 h-4" />
            View Leaderboard
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-terminal font-bold text-sm
              glass border border-gray-600 text-gray-400
              hover:border-gray-400 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Back to Dashboard
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
