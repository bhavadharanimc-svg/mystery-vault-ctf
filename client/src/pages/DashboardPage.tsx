import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Trophy, Shield } from 'lucide-react';
import type { Challenge } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import ChallengeCard from '../components/ChallengeCard';
import AchievementBadge from '../components/AchievementBadge';
import ParticleField from '../components/ParticleField';
import TerminalText from '../components/TerminalText';

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export default function DashboardPage() {
  const { team, refreshTeam } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [challengeRes, teamRes] = await Promise.all([
        axios.get('/api/challenges'),
        axios.get('/api/teams/me'),
      ]);
      // Sort by points ascending
      const sorted = [...challengeRes.data.challenges].sort(
        (a: Challenge, b: Challenge) => a.points - b.points
      );
      setChallenges(sorted);
      setRank(teamRes.data.rank);
      refreshTeam();
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('leaderboard:update', fetchData);
    return () => { socket.off('leaderboard:update', fetchData); };
  }, [socket]);

  const totalSolved = challenges.filter(c => c.is_solved).length;
  const totalChallenges = challenges.length;
  const maxScore = challenges.reduce((sum, c) => sum + c.points, 0);
  const progressPct = maxScore > 0 ? Math.min(100, ((team?.score || 0) / maxScore) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040810] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040810] relative">
      <ParticleField />
      <div className="crt-overlay" />
      <Navbar />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="font-terminal text-xs text-cyan-400/60 uppercase tracking-widest mb-1">
                <TerminalText text="Agent Status: ACTIVE" speed={30} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-1">
                Welcome, <span className="gradient-text">{team?.name}</span>
              </h1>
              <p className="text-gray-400 text-sm font-terminal">
                Your mission: capture all flags. All challenges are open — start anywhere.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="glass-purple rounded-xl p-4 text-center min-w-[90px]">
                <div className="font-terminal text-2xl font-black text-purple-300">{team?.score || 0}</div>
                <div className="font-terminal text-xs text-purple-400/60 uppercase">Score</div>
              </div>
              <div className="glass rounded-xl p-4 text-center min-w-[90px]">
                <div className="font-terminal text-2xl font-black text-cyan-300">#{rank ?? '?'}</div>
                <div className="font-terminal text-xs text-cyan-400/60 uppercase">Rank</div>
              </div>
              <div className="glass rounded-xl p-4 text-center min-w-[90px]">
                <div className="font-terminal text-2xl font-black text-yellow-300">
                  {totalSolved}/{totalChallenges}
                </div>
                <div className="font-terminal text-xs text-yellow-400/60 uppercase">Solved</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs font-terminal text-gray-500 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full progress-glow"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Achievements */}
          {team?.achievements && team.achievements.length > 0 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="font-terminal text-xs text-gray-500">Badges:</span>
              {team.achievements.map(a => (
                <AchievementBadge key={a.badge} badge={a.badge} size="sm" />
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick nav to leaderboard */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={() => navigate('/leaderboard')}
            className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-xs font-terminal text-yellow-400 border border-yellow-400/20 hover:border-yellow-400/40"
          >
            <Trophy className="w-4 h-4" />
            View Leaderboard
          </motion.button>
        </div>

        {/* Challenges — flat grid sorted by points */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="font-terminal text-lg text-white font-bold">
              Challenges
            </h2>
            <span className="font-terminal text-xs text-gray-500">
              {totalSolved} of {totalChallenges} captured
            </span>
          </div>

          {challenges.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center font-terminal text-gray-600">
              No challenges available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {challenges.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <ChallengeCard challenge={c} locked={false} index={i} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
