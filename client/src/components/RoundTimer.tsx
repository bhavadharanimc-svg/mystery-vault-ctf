import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface Props {
  round: number;
  onExpire?: () => void;
}

export default function RoundTimer({ round, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [started, setStarted] = useState(false);

  const fetchTimer = async () => {
    try {
      const { data } = await axios.get(`/api/challenges/round/${round}/timer`);
      setStarted(data.started);
      setTotalMs(data.totalMinutes * 60000);
      if (data.started) {
        setRemainingMs(data.remainingMs);
        if (data.expired) {
          setExpired(true);
          onExpire?.();
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 10000);
    return () => clearInterval(interval);
  }, [round]);

  useEffect(() => {
    if (remainingMs === null || expired) return;
    const interval = setInterval(() => {
      setRemainingMs(prev => {
        if (prev === null || prev <= 0) {
          setExpired(true);
          onExpire?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs !== null, expired]);

  if (!started) return null;

  const formatTime = (ms: number) => {
    const total = Math.max(0, ms);
    const m = Math.floor(total / 60000);
    const s = Math.floor((total % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = totalMs > 0 ? (remainingMs || 0) / totalMs : 0;
  const isWarning = progress < 0.25;
  const isCritical = progress < 0.1;

  return (
    <div className={`glass rounded-xl px-4 py-3 flex items-center gap-3
      ${isCritical ? 'border-red-500/40 animate-pulse' : isWarning ? 'border-yellow-500/40' : 'border-cyan-400/20'}`}
    >
      <motion.div
        animate={isCritical ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {isWarning
          ? <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} />
          : <Clock className="w-5 h-5 text-cyan-400" />
        }
      </motion.div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`font-terminal text-xs uppercase tracking-widest
            ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-cyan-400/60'}`}>
            {expired ? 'TIME EXPIRED' : 'Round Timer'}
          </span>
          <span className={`font-terminal font-bold text-lg
            ${isCritical ? 'text-red-400 glow-text-blue' : isWarning ? 'text-yellow-400' : 'text-cyan-300'}`}>
            {expired ? '00:00' : formatTime(remainingMs || 0)}
          </span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : 'progress-glow'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>
    </div>
  );
}
