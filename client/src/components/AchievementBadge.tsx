import { motion } from 'framer-motion';

const BADGE_CONFIG: Record<string, { icon: string; color: string; description: string }> = {
  'First Blood':    { icon: '🩸', color: 'from-red-500/20 to-pink-500/20 border-red-500/30',      description: 'First to solve a challenge' },
  'Code Breaker':   { icon: '💻', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',    description: 'Master of code challenges' },
  'Fast Solver':    { icon: '⚡', color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30', description: 'Speed demon' },
  'Perfect Round':  { icon: '🎯', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30', description: 'Zero wrong flags in a round' },
  'Master Hacker':  { icon: '🔱', color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30', description: 'Completed all rounds' },
};

interface Props {
  badge: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementBadge({ badge, size = 'md' }: Props) {
  const config = BADGE_CONFIG[badge] || { icon: '🏅', color: 'from-gray-500/20 to-gray-600/20 border-gray-500/30', description: badge };

  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1, y: -2 }}
      className="group relative flex flex-col items-center gap-1"
    >
      <div className={`${sizes[size]} rounded-xl bg-gradient-to-br ${config.color} border
        flex items-center justify-center animate-float`}
        style={{ boxShadow: '0 0 15px rgba(168,85,247,0.2)' }}
      >
        {config.icon}
      </div>
      {size !== 'sm' && (
        <span className="font-terminal text-xs text-purple-300 text-center">{badge}</span>
      )}
      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 glass rounded text-xs
        font-terminal text-cyan-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {config.description}
      </div>
    </motion.div>
  );
}
