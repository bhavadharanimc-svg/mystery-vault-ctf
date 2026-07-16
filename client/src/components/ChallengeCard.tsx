
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Zap, ChevronRight } from 'lucide-react';
import type { Challenge } from '../types';
import clsx from 'clsx';

interface Props {
  challenge: Challenge;
  locked?: boolean;
  index?: number;
}

const DIFF_COLORS = {
  easy: { border: 'border-green-500/30', glow: 'glow-green', text: 'text-green-400', bg: 'bg-green-500/10' },
  medium: { border: 'border-yellow-500/30', glow: '', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  hard: { border: 'border-red-500/30', glow: '', text: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function ChallengeCard({ challenge, locked = false, index = 0 }: Props) {
  const navigate = useNavigate();
  const colors = DIFF_COLORS[challenge.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={locked ? {} : { y: -4, scale: 1.02 }}
      className={clsx(
        'relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer group',
        colors.border,
        locked ? 'opacity-40 cursor-not-allowed' : 'hover:' + colors.glow,
        challenge.is_solved ? 'bg-green-500/5 border-green-500/30' : 'glass'
      )}
      onClick={() => !locked && !challenge.is_solved && navigate(`/challenge/${challenge.id}`)}
    >
      {/* Solved overlay */}
      {challenge.is_solved && (
        <div className="absolute inset-0 bg-green-500/5 z-0" />
      )}

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
          <div className="text-center">
            <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <span className="font-terminal text-xs text-gray-500">LOCKED</span>
          </div>
        </div>
      )}

      {/* Top accent line */}
      <div className={`h-0.5 w-full ${
        challenge.is_solved ? 'bg-green-400' :
        challenge.difficulty === 'easy' ? 'bg-gradient-to-r from-green-400 to-cyan-400' :
        challenge.difficulty === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
        'bg-gradient-to-r from-red-400 to-pink-400'
      }`} />

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx('px-2 py-0.5 rounded text-xs font-terminal uppercase', colors.bg, colors.text)}>
                {challenge.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-terminal bg-cyan-400/10 text-cyan-400/70">
                {challenge.category}
              </span>
            </div>
            <h3 className={clsx(
              'font-bold text-base font-terminal mt-1',
              challenge.is_solved ? 'text-green-300' : 'text-white group-hover:text-cyan-300'
            )}>
              {challenge.title}
            </h3>
          </div>
          {challenge.is_solved ? (
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          ) : locked ? (
            <Lock className="w-6 h-6 text-gray-600 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
          {challenge.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-terminal font-bold text-yellow-400">{challenge.points}</span>
            <span className="font-terminal text-xs text-gray-500">pts</span>
          </div>

          {challenge.is_solved ? (
            <span className="font-terminal text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Captured
            </span>
          ) : !locked ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                'px-3 py-1 rounded-lg font-terminal text-xs border transition-all',
                colors.border, colors.text,
                'hover:bg-opacity-20'
              )}
              onClick={e => { e.stopPropagation(); navigate(`/challenge/${challenge.id}`); }}
            >
              Open →
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
