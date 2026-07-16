import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { ArrowLeft, Flag, Lightbulb, Download, ChevronDown, CheckCircle, Send, Eye } from 'lucide-react';
import type { Challenge } from '../types';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ParticleField from '../components/ParticleField';

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshTeam } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const { data } = await axios.get('/api/challenges');
        const found = data.challenges.find((c: Challenge) => c.id === parseInt(id!));
        if (!found) { navigate('/dashboard'); return; }
        setChallenge(found);
        setSolved(found.is_solved === 1);
      } catch {
        navigate('/dashboard');
      }
    };
    fetchChallenge();
  }, [id]);

  const fireConfetti = () => {
    const colors = ['#00d4ff', '#a855f7', '#39ff14', '#ffffff'];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
    setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || submitting || solved) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(`/api/challenges/${id}/submit`, { flag: flag.trim() });

      if (data.correct) {
        setSuccess(true);
        setSolved(true);
        fireConfetti();
        refreshTeam();
        toast.success(
          `🎉 Flag captured! +${data.totalPoints} pts${data.bonus ? ` (+${data.bonus} bonus)` : ''}`,
          { duration: 6000, style: { background: '#0a1428', border: '1px solid rgba(57,255,20,0.4)', color: '#39ff14' } }
        );
        if (data.roundUnlocked) {
          toast.success(`🔓 Round ${data.nextRound} Unlocked!`, { duration: 8000 });
        }
        if (data.qualifyFailed) {
          toast.error('❌ Score too low to advance. Mission failed.', { duration: 8000 });
        }
        if (data.roundComplete && !data.roundUnlocked && !data.qualifyFailed && parseInt(id!) <= 9) {
          setTimeout(() => navigate('/end'), 3000);
        }
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast.error('Wrong flag. Keep trying, agent.', {
          icon: '🔒',
          style: { background: '#0a1428', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg === 'Time expired for this round') {
        toast.error('⏰ Round time has expired!');
      } else if (msg === 'Already solved') {
        setSolved(true);
      } else {
        toast.error(msg || 'Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) {
    return (
      <div className="min-h-screen bg-[#040810] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diffColor = {
    easy: 'text-green-400 border-green-400/30 bg-green-400/10',
    medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    hard: 'text-red-400 border-red-400/30 bg-red-400/10',
  }[challenge.difficulty];

  return (
    <div className="min-h-screen bg-[#040810] relative">
      <ParticleField />
      <div className="crt-overlay" />
      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 font-terminal text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                challenge.difficulty === 'easy' ? 'bg-gradient-to-r from-green-400 to-cyan-400' :
                challenge.difficulty === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                'bg-gradient-to-r from-red-400 to-pink-400'
              }`} />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-terminal uppercase border ${diffColor}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-terminal bg-cyan-400/10 text-cyan-400/70 border border-cyan-400/20">
                      {challenge.category}
                    </span>
                    {solved && (
                      <span className="px-2 py-1 rounded text-xs font-terminal bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> SOLVED
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black font-terminal text-white mb-1">{challenge.title}</h1>
                  <p className="text-gray-400 text-sm">{challenge.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-black font-terminal text-yellow-400">{challenge.points}</div>
                  <div className="text-xs font-terminal text-gray-500">points</div>
                </div>
              </div>
            </motion.div>

            {/* Story */}
            {challenge.story && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="font-terminal text-sm text-cyan-400/70 uppercase tracking-widest mb-4">📖 Mission Briefing</h2>
                <div className="font-terminal text-sm text-gray-300 leading-relaxed whitespace-pre-wrap
                  bg-black/30 rounded-xl p-4 border border-cyan-400/10">
                  {challenge.story}
                </div>
              </motion.div>
            )}

            {/* Flag submission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`glass rounded-2xl p-6 ${success ? 'border border-green-500/40' : ''}`}
            >
              <h2 className="font-terminal text-sm text-cyan-400/70 uppercase tracking-widest mb-4">
                <Flag className="inline w-4 h-4 mr-2" />
                Submit Flag
              </h2>

              {solved ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  <CheckCircle className="w-16 h-16 text-green-400" style={{ filter: 'drop-shadow(0 0 20px rgba(57,255,20,0.6))' }} />
                  <div className="font-terminal text-xl font-bold text-green-400 glow-text-green">FLAG CAPTURED</div>
                  <div className="font-terminal text-xs text-gray-500">Challenge solved successfully</div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <motion.div
                    animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex gap-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={flag}
                        onChange={e => setFlag(e.target.value)}
                        placeholder="flag{your_answer_here}"
                        className="input-neon flex-1 rounded-xl px-4 py-3 font-terminal text-sm"
                        id="flag-input"
                        disabled={submitting}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={submitting || !flag.trim()}
                        className="px-5 py-3 rounded-xl font-terminal text-sm font-bold
                          bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                          border border-cyan-400/40 text-cyan-300
                          hover:border-cyan-400/70 hover:glow-blue
                          disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        id="submit-flag"
                      >
                        {submitting
                          ? <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          : <Send className="w-5 h-5" />
                        }
                      </motion.button>
                    </div>
                  </motion.div>
                  <p className="text-xs font-terminal text-gray-600 mt-2">
                    Format: flag&#123;your_answer&#125;
                  </p>
                </form>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Hints */}
            {challenge.hints && challenge.hints.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setHintsOpen(!hintsOpen)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-yellow-400/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="font-terminal text-sm text-yellow-400/80">Hints ({challenge.hints.length})</span>
                  </div>
                  <motion.div animate={{ rotate: hintsOpen ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {hintsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3">
                        {challenge.hints.map((hint, i) => (
                          <div key={i}>
                            {revealedHints.includes(i) ? (
                              <div className="p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
                                <p className="font-terminal text-xs text-yellow-300/80">{hint}</p>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRevealedHints(prev => [...prev, i])}
                                className="w-full p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg
                                  font-terminal text-xs text-gray-500 hover:text-yellow-400/60 transition-colors flex items-center gap-2"
                              >
                                <Eye className="w-3 h-3" />
                                Reveal Hint {i + 1}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Attachment */}
            {challenge.attachment_url && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5"
              >
                <h3 className="font-terminal text-sm text-cyan-400/70 uppercase tracking-widest mb-3">
                  <Download className="inline w-4 h-4 mr-1" />
                  Files
                </h3>
                <a
                  href={challenge.attachment_url}
                  download={challenge.attachment_name}
                  className="flex items-center gap-3 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-xl
                    hover:border-cyan-400/40 hover:bg-cyan-400/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/20 flex items-center justify-center text-xs">📎</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-terminal text-xs text-cyan-300 truncate">{challenge.attachment_name}</div>
                    <div className="font-terminal text-xs text-gray-500">Click to download</div>
                  </div>
                  <Download className="w-4 h-4 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
                </a>
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-5 space-y-3"
            >
              <h3 className="font-terminal text-sm text-cyan-400/70 uppercase tracking-widest">Challenge Info</h3>
              <div className="space-y-2">
                {[
                  ['Points', challenge.points + ' pts'],
                  ['Difficulty', challenge.difficulty.toUpperCase()],
                  ['Category', challenge.category],
                  ['Round', `Round ${challenge.round_number}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="font-terminal text-xs text-gray-500">{label}</span>
                    <span className="font-terminal text-xs text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
