import { useEffect, useState } from 'react';

interface Props {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export default function TerminalText({ text, speed = 40, className = '', onComplete }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [idx, setIdx] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (idx < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => prev + text[idx]);
        setIdx(i => i + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [idx, text, speed]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`font-terminal ${className}`}>
      {displayed}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity text-cyan-400`}>|</span>
    </span>
  );
}
