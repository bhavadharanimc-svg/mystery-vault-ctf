import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Trophy, Zap } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import ParticleField from '../components/ParticleField';

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { socket } = useSocket();

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/leaderboard');
      setEntries(data.teams);
      setFrozen(data.frozen);
      setLastUpdate(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('leaderboard:update', fetchLeaderboard);
    socket.on('leaderboard:tick', fetchLeaderboard);
    return () => {
      socket.off('leaderboard:update', fetchLeaderboard);
      socket.off('leaderboard:tick', fetchLeaderboard);
    };
  }, [socket]);

  const getRoundLabel = (r: number) => ['Easy', 'Medium', 'Hard'][r - 1] || 'Easy';
  const getRoundColor = (r: number) => ['text-green-400', 'text-yellow-400', 'text-red-400'][r - 1];

  return (
    <div className="min-h-screen bg-[#040810] relative">
      <ParticleField />
      <div className="crt-overlay" />
      <Navbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-400" style={{ filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.7))' }} />
            <h1 className="text-4xl font-black gradient-text font-terminal">LEADERBOARD</h1>
            <Trophy className="w-8 h-8 text-yellow-400" style={{ filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.7))' }} />
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-terminal">
            {frozen && (
              <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full">
                🔒 LEADERBOARD FROZEN
              </span>
            )}
            <span className="text-cyan-400/50">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-end justify-center gap-4 mb-10"
          >
            {[entries[1], entries[0], entries[2]].map((entry, i) => {
              const heights = ['h-24', 'h-32', 'h-20'];
              const orders = [2, 1, 3];
              const isFirst = i === 1;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`text-2xl ${isFirst ? 'animate-float' : ''}`}>
                    {RANK_ICONS[orders[i] - 1]}
                  </div>
                  <div className={`font-terminal text-xs text-center px-3 ${isFirst ? 'text-yellow-300' : 'text-gray-400'}`}>
                    {entry.name}
                  </div>
                  <div className={`font-terminal font-bold ${isFirst ? 'text-yellow-400 text-lg' : 'text-gray-300'}`}>
                    {entry.score} pts
                  </div>
                  <div
                    className={`w-20 ${heights[i]} rounded-t-lg flex items-end justify-center pb-2
                      ${isFirst
                        ? 'bg-gradient-to-t from-yellow-500/40 to-yellow-500/10 border border-yellow-500/40'
                        : i === 0
                          ? 'bg-gradient-to-t from-gray-400/30 to-gray-400/10 border border-gray-400/30'
                          : 'bg-gradient-to-t from-amber-700/30 to-amber-700/10 border border-amber-700/30'
                      }`}
                  >
                    <span className="font-terminal text-xs opacity-60">{orders[i]}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-6 px-6 py-3 border-b border-cyan-400/10 bg-cyan-400/5">
            {['Rank', 'Team', 'Score', 'Solved', 'Round', 'Last Flag'].map(h => (
              <div key={h} className="font-terminal text-xs text-cyan-400/60 uppercase tracking-widest">{h}</div>
            ))}
          </div>

          <AnimatePresence>
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`grid grid-cols-6 px-6 py-4 border-b border-cyan-400/5
                  hover:bg-cyan-400/5 transition-colors
                  ${idx < 3 ? 'bg-yellow-400/3' : ''}`}
              >
                <div className={`font-terminal font-bold text-lg ${idx < 3 ? RANK_COLORS[idx] : 'text-gray-500'}`}>
                  {idx < 3 ? RANK_ICONS[idx] : `#${entry.rank}`}
                </div>
                <div className="font-terminal text-white font-medium flex items-center gap-2">
                  {entry.name}
                  {idx === 0 && <span className="text-xs px-1 py-0.5 bg-yellow-400/20 text-yellow-400 rounded">👑</span>}
                </div>
                <div className="font-terminal font-bold text-cyan-400">
                  {entry.score.toLocaleString()}
                </div>
                <div className="font-terminal text-purple-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {entry.challenges_solved}
                </div>
                <div className={`font-terminal text-xs ${getRoundColor(entry.current_round)}`}>
                  {getRoundLabel(entry.current_round)}
                </div>
                <div className="font-terminal text-xs text-gray-500">
                  {entry.last_submission
                    ? new Date(entry.last_submission).toLocaleTimeString()
                    : '—'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {entries.length === 0 && (
            <div className="py-16 text-center font-terminal text-cyan-400/30">
              No teams registered yet
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
