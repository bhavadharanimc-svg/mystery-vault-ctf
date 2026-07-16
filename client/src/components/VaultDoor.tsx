import { motion } from 'framer-motion';

interface Props {
  isOpening: boolean;
}

export default function VaultDoor({ isOpening }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative w-80 h-80 md:w-96 md:h-96">
        {/* Outer ring */}
        <motion.div
          animate={isOpening ? { rotate: 720, scale: [1, 1.1, 0.8] } : { rotate: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full border-4 border-cyan-400/60"
          style={{ boxShadow: '0 0 40px rgba(0,212,255,0.5), inset 0 0 40px rgba(0,212,255,0.1)' }}
        />

        {/* Spokes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.div
            key={i}
            animate={isOpening ? { rotate: angle + 360 * 3, opacity: [1, 0] } : { rotate: angle }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
              style={{ transformOrigin: 'center', transform: `rotate(${angle}deg)` }}
            />
          </motion.div>
        ))}

        {/* Inner door halves */}
        <motion.div
          animate={isOpening ? { x: '-100%', opacity: 0 } : { x: 0 }}
          transition={{ duration: 1.5, delay: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 left-0 right-1/2 rounded-l-full overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0a1428, #040810)', border: '2px solid rgba(0,212,255,0.3)' }}
        >
          <div className="absolute inset-2 rounded-l-full border border-cyan-400/20" />
          <div className="absolute inset-4 rounded-l-full border border-cyan-400/10" />
          {/* Bolts */}
          {[20, 50, 80].map(top => (
            <div key={top} className="absolute w-3 h-3 rounded-full bg-cyan-400/40 border border-cyan-400/60"
              style={{ top: `${top}%`, right: 10 }}
            />
          ))}
        </motion.div>
        <motion.div
          animate={isOpening ? { x: '100%', opacity: 0 } : { x: 0 }}
          transition={{ duration: 1.5, delay: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 left-1/2 right-0 rounded-r-full overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #040810, #0a1428)', border: '2px solid rgba(0,212,255,0.3)' }}
        >
          <div className="absolute inset-2 rounded-r-full border border-cyan-400/20" />
          <div className="absolute inset-4 rounded-r-full border border-cyan-400/10" />
          {[20, 50, 80].map(top => (
            <div key={top} className="absolute w-3 h-3 rounded-full bg-cyan-400/40 border border-cyan-400/60"
              style={{ top: `${top}%`, left: 10 }}
            />
          ))}
        </motion.div>

        {/* Center lock icon */}
        <motion.div
          animate={isOpening ? { scale: [1, 1.5, 0], opacity: [1, 1, 0] } : { scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="w-16 h-16 rounded-full glass glow-blue flex items-center justify-center">
            <span className="text-2xl">🔓</span>
          </div>
        </motion.div>

        {/* Flash effect */}
        {isOpening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="absolute inset-0 bg-cyan-400/20 rounded-full"
          />
        )}

        {/* Access granted text */}
        {isOpening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center"
          >
            <div className="font-terminal text-green-400 text-lg glow-text-green animate-flicker">
              ACCESS GRANTED
            </div>
            <div className="font-terminal text-cyan-400/60 text-xs mt-1">
              Welcome to the Vault
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
