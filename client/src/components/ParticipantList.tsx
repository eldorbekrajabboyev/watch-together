import { useState } from 'react';
import Avatar from './ui/Avatar';
import Badge from './ui/Badge';
import { cn } from '../utils/classnames';
import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  hostId: string;
  currentUserId: string;
}

export default function ParticipantList({
  participants,
  hostId,
  currentUserId,
}: ParticipantListProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...participants].sort((a, b) => {
    if (a.userId === hostId && b.userId !== hostId) return -1;
    if (a.userId !== hostId && b.userId === hostId) return 1;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  return (
    <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-white">
          Participants ({participants.length})
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-dark-400 transition-transform duration-300',
            collapsed ? '' : 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
        )}
      >
        <div className="px-2 pb-2 space-y-0.5">
          {sorted.map((p) => {
            const isHost = p.userId === hostId;
            const isSelf = p.userId === currentUserId;

            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors',
                  isSelf && 'bg-primary-500/10 border border-primary-500/20',
                  !isSelf && 'hover:bg-white/5'
                )}
              >
                <Avatar
                  src={p.user?.avatar ?? undefined}
                  nickname={p.user?.nickname}
                  size="sm"
                  isOnline={p.isConnected}
                  isSpeaking={p.isSpeaking}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-dark-100 truncate">
                      {p.user?.nickname ?? 'Unknown'}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] text-dark-500">(you)</span>
                    )}
                  </div>
                </div>

                {p.isMuted && (
                  <div className="flex-shrink-0 text-dark-500" title="Muted">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                )}

                {isHost && (
                  <Badge variant="warning" className="flex-shrink-0">
                    Host
                  </Badge>
                )}
                {!isHost && (
                  <Badge variant="primary" className="flex-shrink-0">
                    Guest
                  </Badge>
                )}

                <div className="flex-shrink-0">
                  {p.isReady ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center" title="Ready">
                      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-dark-600 flex items-center justify-center" title="Not ready">
                      <svg className="w-3 h-3 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
