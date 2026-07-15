import { useEffect, useState } from 'react';
import { cn } from '../utils/classnames';
import type { Reaction } from '../types';

interface ReactionOverlayProps {
  reactions: Reaction[];
  onRemove: (id: string) => void;
}

interface FloatingReaction extends Reaction {
  x: number;
  animating: boolean;
}

export default function ReactionOverlay({ reactions, onRemove }: ReactionOverlayProps) {
  const [visible, setVisible] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    const MAX_VISIBLE = 10;

    const mapped = reactions.slice(-MAX_VISIBLE).map((r) => ({
      ...r,
      x: r.x ?? Math.random() * 80 + 10,
      animating: true,
    }));

    setVisible((prev) => {
      const prevIds = new Set(prev.map((p) => p.id));
      const newOnes = mapped.filter((m) => !prevIds.has(m.id));
      const combined = [...prev, ...newOnes].slice(-MAX_VISIBLE);
      return combined;
    });
  }, [reactions]);

  useEffect(() => {
    if (visible.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const reaction of visible) {
      const t = setTimeout(() => {
        onRemove(reaction.id);
        setVisible((prev) => prev.filter((v) => v.id !== reaction.id));
      }, 3200);
      timers.push(t);
    }
    return () => timers.forEach(clearTimeout);
  }, [visible.length]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {visible.map((r) => (
        <div
          key={r.id}
          className="absolute flex flex-col items-center animate-float-up"
          style={{
            left: `${r.x}%`,
            bottom: '10%',
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          <span className="text-3xl drop-shadow-lg">{r.emoji}</span>
          <span className="text-[10px] text-white/80 bg-dark-900/60 px-1.5 py-0.5 rounded-full mt-0.5 backdrop-blur-sm max-w-[80px] truncate">
            {r.nickname}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-200px) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
