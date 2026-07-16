import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lock, Unlock, Trophy } from 'lucide-react';
import type { Challenge } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import ChallengeCard from '../components/ChallengeCard';
import RoundTimer from '../components/RoundTimer';
import AchievementBadge from '../components/AchievementBadge';
import ParticleField from '../components/ParticleField';
import TerminalText from '../components/TerminalText';

const ROUNDS = [
  { num: 1, name: 'EASY', label: 'Round 1 — Easy', color: 'cyan', borderColor: 'border-cyan-400/30', textColor: 'text-cyan-400', bgColor: 'bg-cyan-400/5' },
  { num: 2, name: 'MEDIUM', label: 'Round 2 — Medium', color: 'yellow', borderColor: 'border-yellow-400/30', textColor: 'text-yellow-400', bgColor: 'bg-yellow-400/5' },
  { num: 3, name: 'HARD', label: 'Round 3 — Hard', color: 'red', borderColor: 'border-red-400/30', textColor: 'text-red-400', bgColor: 'bg-red-400/5' },
];

export default function DashboardPage() {
  const { team, refreshTeam } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [teamRound, setTeamRound] = useState(1);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);


  const fetchData = useCallback(async () => {
    try {
      const [challengeRes, teamRes] = await Promise.all([
        axios.get('/api/challenges'),
        axios.get('/api/teams/me'),
      ]);
      setChallenges(challengeRes.data.challenges);
      setTeamRound(challengeRes.data.team_round);
      setRank(teamRes.data.rank);
      refreshTeam();
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('leaderboard:update', fetchData);
    socket.on('round:unlock', ({ round }: { round: number }) => {
      toast.success(`🔓 Round ${round} Unlocked!`, { duration: 5000 });
      fetchData();
    });
    return () => {
      socket.off('leaderboard:update');
      socket.off('round:unlock');
    };
  }, [socket]);

  const getChallengesForRound = (round: number) =>
    challenges.filter(c => c.round_number === round).sort((a, b) => a.order_in_round - b.order_in_round);

  const getSolvedForRound = (round: number) =>
    getChallengesForRound(round).filter(c => c.is_solved).length;

  const totalSolved = challenges.filter(c => c.is_solved).length;
  const maxScore = 150 + 300 + 600;
  const progressPct = Math.min(100, ((team?.score || 0) / maxScore) * 100);

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
              <p className="text-gray-400 text-sm font-terminal">Your mission: capture all flags before time runs out.</p>
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
                <div className="font-terminal text-2xl font-black text-yellow-300">{totalSolved}/9</div>
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

        {/* Rounds */}
        {ROUNDS.map(round => {
          const roundChallenges = getChallengesForRound(round.num);
          const solved = getSolvedForRound(round.num);
          const isLocked = round.num > teamRound;
          const isComplete = solved === 3 && roundChallenges.length === 3;

          return (
            <motion.div
              key={round.num}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (round.num - 1) * 0.1 }}
              className={`rounded-2xl border overflow-hidden ${round.borderColor} ${isLocked ? 'opacity-60' : ''}`}
            >
              {/* Round header */}
              <div className={`${round.bgColor} px-6 py-4 flex items-center justify-between border-b ${round.borderColor}`}>
                <div className="flex items-center gap-3">
                  {isLocked
                    ? <Lock className={`w-5 h-5 ${round.textColor}`} />
                    : <Unlock className={`w-5 h-5 ${round.textColor}`} />
                  }
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`font-terminal font-bold text-lg ${round.textColor}`}>{round.label}</h2>
                      {isLocked && <span className="px-2 py-0.5 text-xs font-terminal bg-gray-800 text-gray-500 rounded">LOCKED</span>}
                      {isComplete && <span className="px-2 py-0.5 text-xs font-terminal bg-green-500/20 text-green-400 rounded border border-green-500/30">✓ COMPLETE</span>}
                    </div>
                    <div className="font-terminal text-xs text-gray-500">
                      {solved}/{roundChallenges.length} challenges solved
                      {' • '}
                      {round.num === 1 ? '50' : round.num === 2 ? '100' : '200'} pts each
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < solved ? 'bg-green-400' : 'bg-gray-700'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Timer for active round */}
              {!isLocked && round.num === teamRound && (
                <div className="px-6 pt-4">
                  <RoundTimer round={round.num} onExpire={() => toast.error(`⏰ Round ${round.num} time expired!`, { duration: 10000 })} />
                </div>
              )}

              {/* Challenge grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {isLocked
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="glass rounded-xl p-5 border border-gray-800 flex flex-col items-center justify-center gap-2 min-h-[140px] opacity-40">
                        <Lock className="w-8 h-8 text-gray-600" />
                        <span className="font-terminal text-xs text-gray-600">Challenge {i + 1}</span>
                      </div>
                    ))
                  : roundChallenges.map((c, i) => (
                      <ChallengeCard key={c.id} challenge={c} locked={false} index={i} />
                    ))
                }
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
