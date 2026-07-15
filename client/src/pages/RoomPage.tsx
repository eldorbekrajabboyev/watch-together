import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Users,
  Wifi,
  WifiOff,
  Play,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Film,
  AlertCircle,
  Loader2,
  Crown,
  CheckCheck,
  X,
  Smile,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { getSocket } from '../services/socket';
import { useVideoSync } from '../hooks/useVideoSync';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChat } from '../hooks/useChat';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../services/api';
import { computeFileHash, formatFileSize } from '../utils/hash';
import { SUPPORTED_EXTENSIONS, REACTIONS } from '../utils/constants';
import { Message } from '../types';
import { cn } from '../utils/classnames';
import VideoPlayer from '../components/VideoPlayer';

function RemoteAudio({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    const tryPlay = () => {
      el.play().then(() => {}).catch((err) => console.warn('[voice] remote audio play blocked:', err));
    };
    if (stream.getAudioTracks().length > 0) tryPlay();
    const onAdd = () => tryPlay();
    stream.addEventListener('addtrack', onAdd);
    return () => stream.removeEventListener('addtrack', onAdd);
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    if (!muted) {
      el.play().then(() => {}).catch((err) => console.warn('[voice] remote audio play blocked:', err));
    }
  }, [muted]);

  return <audio ref={ref} autoPlay playsInline />;
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fsChatRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore((s) => s.user);
  const {
    currentRoom,
    participants,
    movieInfo,
    syncState,
    voiceUsers,
    reactions,
    isConnected,
    setRoom,
    setParticipants,
    setMovieInfo,
    addReaction,
    removeReaction,
    resetRoom,
  } = useRoomStore();

  const { emit } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const voiceNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const isHost = currentRoom?.hostId === user?.id;
  const roomCode = code || '';

  const {
    handlePlay,
    handlePause,
    handleSeek,
    handlePlaybackRateChange,
    handleVolumeChange,
    handleFullscreen,
    handleSubtitleChange,
    handleAudioTrackChange,
    isSyncing,
  } = useVideoSync({ videoRef, roomCode, hasVideo: !!videoUrl, userId: user?.id });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onStarted = () => {
      const video = videoRef.current;
      if (video) video.play().catch(() => {});
      handlePlay();
    };
    socket.on('room:started', onStarted);
    return () => {
      socket.off('room:started', onStarted);
    };
  }, [handlePlay]);

  const {
    localStream,
    micOn,
    speakerOn,
    isSpeaking,
    remoteUsers,
    joinVoice,
    leaveVoice,
    setMicState,
    setSpeakerState,
  } = useWebRTC({ roomCode });

  const inVoice = !!localStream;

  const { messages, sendMessage, typingUsers, handleTypingInput, loadMore, hasMore, isLoading: chatLoading } = useChat({
    roomCode,
    roomId: currentRoom?.id || '',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<Message | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastId = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fsChatScrollRef = useRef<HTMLDivElement>(null);
  const lastChatMsgId = useRef<string | null>(null);

  const playTing = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id.startsWith('temp-') || last.id === lastToastId.current || last.isDeleted) return;
    lastToastId.current = last.id;
    if (!isFullscreen) return;
    if (last.userId === user?.id) return;
    setToastMessage(last);
    playTing();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 5000);
  }, [messages, isFullscreen, playTing, user?.id]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || messages.length === 0) return;
    const lastId = messages[messages.length - 1].id;
    const prevId = lastChatMsgId.current;
    lastChatMsgId.current = lastId;
    if (prevId === null) {
      el.scrollTop = el.scrollHeight;
    } else if (lastId !== prevId) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) el.scrollTop = el.scrollHeight;
    }
    const fsEl = fsChatScrollRef.current;
    if (fsEl && lastId !== prevId) {
      fsEl.scrollTop = fsEl.scrollHeight;
    }
  }, [messages]);

  const hasLocalVideo = !!videoUrl;
  const allReady = participants.length > 0 && participants.every((p) => p.isReady || p.userId === currentRoom?.hostId);
  const pauserPresent = syncState.pausedBy ? participants.some((p) => p.userId === syncState.pausedBy) : true;
  const canResume = !syncState.pausedBy || syncState.pausedBy === user?.id || !pauserPresent;
  const canStart = hasLocalVideo && allReady && participants.length >= 1 && canResume;

  useEffect(() => {
    if (!code) {
      navigate('/');
      return;
    }

    let cancelled = false;

    async function fetchRoom() {
      try {
        setLoading(true);
        setError('');
        const res = await api.getRoom(code!);
        if (cancelled) return;
        setRoom(res.room);
        setParticipants(res.room.participants || []);
        emit('room:join', { roomCode: code! });
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 404) {
          setError('Room not found. It may have been closed.');
        } else if (err?.status === 401 || err?.status === 403) {
          setError('You are not authorized to join this room.');
        } else {
          setError('Failed to load room. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRoom();

    return () => {
      cancelled = true;
    };
  }, [code, navigate, setRoom, setParticipants, setMovieInfo, emit]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      resetRoom();
    };
  }, [resetRoom]);

  useEffect(() => {
    const socket = useRoomStore.getState;
    const unsub = useRoomStore.subscribe((state, prev) => {
      if (state.reactions.length > prev.reactions.length) {
        const newest = state.reactions[state.reactions.length - 1];
        setTimeout(() => removeReaction(newest.id), 5000);
      }
    });
    return unsub;
  }, [removeReaction]);

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomCode]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      alert(`Unsupported file type: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    setHashing(true);

    try {
      const hash = await computeFileHash(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      let duration = 0;
      try {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        duration = await new Promise<number>((resolve) => {
          tempVideo.onloadedmetadata = () => resolve(tempVideo.duration || 0);
          tempVideo.onerror = () => resolve(0);
          setTimeout(() => resolve(0), 3000);
          tempVideo.src = url;
        });
      } catch {
        duration = 0;
      }

      emit('room:movie-info', {
        roomCode,
        filename: file.name,
        filesize: file.size,
        duration,
        hash,
      });

      setMovieInfo({
        filename: file.name,
        filesize: file.size,
        duration,
        hash,
      });
    } catch (err) {
      console.error('Failed to process file:', err);
      alert('Failed to process video file. Please try another file.');
      setSelectedFile(null);
    } finally {
      setHashing(false);
    }
  }, [roomCode, emit, setMovieInfo]);

  const handleStartWatching = useCallback(() => {
    if (!canStart) return;
    const video = videoRef.current;
    if (video) video.play().catch(() => {});
    handlePlay();
    emit('room:start', { roomCode });
  }, [canStart, roomCode, emit, handlePlay]);

  const showVoiceNotice = useCallback((text: string) => {
    setVoiceNotice(text);
    if (voiceNoticeTimer.current) clearTimeout(voiceNoticeTimer.current);
    voiceNoticeTimer.current = setTimeout(() => setVoiceNotice(null), 3500);
  }, []);

  const isMicActive = inVoice && micOn;
  const isSpeakerActive = inVoice && speakerOn;

  const handleToggleMic = useCallback(async () => {
    const next = !isMicActive;
    const ok = await setMicState(next);
    if (!ok) {
      showVoiceNotice('Mikrofonga ruxsat berilmadi yoki ovoz ulanishida xatolik yuz berdi');
    } else {
      showVoiceNotice(next ? 'Mikrofoningiz yoqildi — sizni barcha eshitadi' : 'Mikrofoningiz o‘chdi');
    }
  }, [isMicActive, setMicState, showVoiceNotice]);

  const handleToggleSpeaker = useCallback(async () => {
    const next = !isSpeakerActive;
    const ok = await setSpeakerState(next);
    if (!ok) {
      showVoiceNotice('Mikrofonga ruxsat berilmadi yoki ovoz ulanishida xatolik yuz berdi');
    } else {
      showVoiceNotice(next ? 'Karnay yoqildi — boshqalarni eshitasiz' : 'Karnay o‘chirildi — boshqalarni eshitmaysiz');
    }
  }, [isSpeakerActive, setSpeakerState, showVoiceNotice]);

  const handleToggleReady = useCallback(() => {
    if (!user) return;
    const me = participants.find((p) => p.userId === user.id);
    if (me) {
      emit('room:ready', { roomCode });
    }
  }, [user, participants, roomCode, emit]);

  const handleSendReaction = useCallback((emoji: string) => {
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 60 + 20;
    emit('room:reaction', { roomCode, emoji, x, y });
    setShowReactions(false);
  }, [roomCode, emit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-[300px]">
            {currentRoom?.title || 'Room'}
          </h1>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-mono"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-gray-400" />
                <span className="text-gray-300">{roomCode}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Users size={14} />
            <span>{participants.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
              Syncing...
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            <span className={cn('text-xs', isConnected ? 'text-green-400' : 'text-red-400')}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to leave this room?')) {
                emit('room:leave', { roomCode });
                api.leaveRoom(roomCode).catch(() => {});
                navigate('/');
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm text-white transition-colors"
          >
            Leave
          </button>

          {isHost && (
            <button
              onClick={() => {
                if (confirm('Close this room for everyone?')) {
                  api.closeRoom(roomCode).catch(() => {});
                  emit('room:leave', { roomCode });
                  navigate('/');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white transition-colors"
            >
              Close Room
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
            {hasLocalVideo ? (
              <>
                <VideoPlayer
                  ref={videoRef}
                  src={videoUrl || undefined}
                  isPlaying={syncState.isPlaying}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeek}
                   onVolumeSliderChange={handleVolumeChange}
                  onPlaybackRateChange={handlePlaybackRateChange}
                  onFullscreen={handleFullscreen}
                  onFullscreenChange={setIsFullscreen}
                  onSubtitleChange={handleSubtitleChange}
                  onAudioTrackChange={handleAudioTrackChange}
                  canResume={canResume}
                  subtitles={[]}
                  overlay={
                    <>
                      {toastMessage && (
                        <div key={toastMessage.id} className="absolute bottom-6 right-6 animate-toast-in">
                          <div className="px-5 py-3 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 shadow-2xl shadow-purple-500/20 flex items-center gap-3">
                            <span className="text-xl leading-none">💬</span>
                            <p className="text-sm font-semibold text-white">Yangi Xabar</p>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-20 right-6 z-50 pointer-events-auto">
                        <div className="relative">
                          <button
                            onClick={() => setShowReactions(!showReactions)}
                            className="p-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <Smile size={20} className="text-gray-300" />
                          </button>

                          {showReactions && (
                            <div className="absolute bottom-full right-0 mb-2 flex gap-1 p-2 rounded-xl bg-gray-800/90 backdrop-blur-sm border border-white/10">
                              {REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleSendReaction(emoji)}
                                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  }
                >
                  <div className="flex flex-col h-full text-white">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
                      <MessageSquare size={16} className="text-purple-400" />
                      <span className="text-sm font-semibold">Chat</span>
                    </div>

                    {(() => {
                      const micOnList = voiceUsers.filter((v) => v.micOn);
                      if (micOnList.length === 0) return null;
                      return (
                        <div className="px-3 py-2 border-b border-white/10 bg-green-500/10 shrink-0">
                          <div className="flex items-center gap-2 text-xs text-green-300">
                            <Mic size={12} className="text-red-400 shrink-0" />
                            <span className="font-medium">
                              Mikrofon yoqdiq:{' '}
                              {micOnList
                                .map((v) => (v.userId === user?.id ? `${v.nickname} (sen)` : v.nickname))
                                .join(', ')}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div ref={fsChatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                      {messages.slice(-15).map((msg) => (
                        <div key={msg.id} className={cn('flex gap-2', msg.isDeleted && 'opacity-50')}>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-[10px] font-semibold text-white shrink-0 mt-0.5">
                            {msg.user.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-white">{msg.user.nickname}</span>
                            <p className={cn('text-sm text-gray-300 break-words', msg.isDeleted && 'line-through')}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border-t border-white/10 shrink-0">
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleSendReaction(emoji)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fsChatRef}
                          type="text"
                          placeholder="Type a message..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (fsChatRef.current?.value.trim()) {
                                sendMessage(fsChatRef.current.value);
                                fsChatRef.current.value = '';
                              }
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        />
                        <button
                          onClick={() => {
                            if (fsChatRef.current?.value.trim()) {
                              sendMessage(fsChatRef.current.value);
                              fsChatRef.current.value = '';
                            }
                          }}
                          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </VideoPlayer>

                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
                    hasLocalVideo && participants.length > 0 && participants.every((p) => p.isReady || p.userId === currentRoom?.hostId)
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  )}>
                    {hasLocalVideo && participants.length > 0 && participants.every((p) => p.isReady || p.userId === currentRoom?.hostId)
                      ? 'Movie matched - Ready'
                      : 'Movie mismatch'}
                  </span>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={SUPPORTED_EXTENSIONS.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors text-gray-200">
                      Change video
                    </span>
                  </label>
                </div>

                <div className="absolute bottom-[calc(0.75rem+2cm)] right-3 z-10">
                  <div className="relative">
                    <button
                      onClick={() => setShowReactions(!showReactions)}
                      className="p-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <Smile size={20} className="text-gray-300" />
                    </button>

                    {showReactions && (
                      <div className="absolute bottom-full right-0 mb-2 flex gap-1 p-2 rounded-xl bg-gray-800/90 backdrop-blur-sm border border-white/10">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleSendReaction(emoji)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 p-8">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <Film className="w-10 h-10 text-purple-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">Select a Movie</h2>
                  <p className="text-gray-400 text-sm mb-1">
                    Choose a local video file to watch together
                  </p>
                  <p className="text-gray-500 text-xs">
                    Supported: {SUPPORTED_EXTENSIONS.join(', ')}
                  </p>
                </div>

                {movieInfo && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 max-w-md">
                    <Film size={16} className="text-purple-400 shrink-0" />
                    <span className="text-purple-200 text-sm text-center">
                      {'Host selected: ' + movieInfo.filename + ' (' + formatFileSize(movieInfo.filesize) + ') — choose the same file on your device'}
                    </span>
                  </div>
                )}

                {hashing ? (
                  <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-gray-300 text-sm">Processing file...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={SUPPORTED_EXTENSIONS.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors">
                      <Film size={18} />
                      Choose Video File
                    </span>
                  </label>
                )}

                {selectedFile && !hashing && (() => {
                  const mi = {
                    filename: selectedFile.name,
                    filesize: selectedFile.size,
                  };
                  return (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCheck size={16} className="text-green-400 shrink-0" />
                    <span className="text-green-300 text-sm">
                      {'Movie selected: ' + mi.filename + ' (' + formatFileSize(mi.filesize) + ')'}
                    </span>
                  </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleReady}
                  disabled={isHost}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isHost
                      ? 'bg-purple-500/20 text-purple-400 cursor-default'
                      : participants.find((p) => p.userId === user?.id)?.isReady
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {isHost ? (
                    <Crown size={14} />
                  ) : participants.find((p) => p.userId === user?.id)?.isReady ? (
                    <CheckCheck size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                  {isHost ? 'Host' : participants.find((p) => p.userId === user?.id)?.isReady ? 'Ready' : 'Ready?'}
                </button>

                <button
                  onClick={handleToggleMic}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    isMicActive
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  )}
                  title={isMicActive ? 'Mikrofon yoqildi — sizni barcha eshitadi' : 'Mikrofoni yoqish'}
                >
                  {isMicActive ? <Mic size={14} /> : <MicOff size={14} />}
                  Mikrofon
                </button>

                <button
                  onClick={handleToggleSpeaker}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    isSpeakerActive
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  )}
                  title={isSpeakerActive ? 'Karnay yoqildi — boshqalarni eshitasiz' : 'Karnayni yoqish (eshitish)'}
                >
                  {isSpeakerActive ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  Karnay
                </button>
              </div>

              <button
                onClick={handleStartWatching}
                disabled={!canStart}
                title={
                  !canStart && !canResume && syncState.pausedBy
                    ? 'Faqat videoni pauza qilgan kishi davom ettira oladi'
                    : undefined
                }
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all',
                  canStart
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/25'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                )}
              >
                <Play size={16} />
                Start Watching
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col w-80 lg:w-96 border-l border-white/10 bg-gray-900/60 min-h-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <Users size={14} />
              Participants ({participants.length})
              {showParticipants ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showParticipants && (
            <div className="border-b border-white/10 px-3 py-2 max-h-48 overflow-y-auto shrink-0">
              <div className="space-y-1">
                {participants.map((participant) => {
                  const vu = voiceUsers.find((v) => v.userId === participant.userId);
                  const vMicOn = vu?.micOn ?? (participant.userId === user?.id && micOn);
                  const vSpeakerOn = vu?.speakerOn ?? (participant.userId === user?.id && speakerOn);
                  const vSpeaking = vu?.isSpeaking ?? (participant.userId === user?.id && isSpeaking);
                  const inVoice = !!vu || participant.userId === user?.id;
                  return (
                  <div
                    key={participant.userId}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg',
                      participant.userId === user?.id ? 'bg-purple-500/10' : 'hover:bg-white/5'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                      {participant.user.nickname.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white truncate">
                          {participant.user.nickname}
                        </span>
                        {participant.role === 'host' && (
                          <Crown size={12} className="text-yellow-400 shrink-0" />
                        )}
                        {participant.userId === user?.id && (
                          <span className="text-xs text-gray-500">(you)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {inVoice && (
                        <>
                          {!vSpeakerOn && (
                            <span title="Karnay o‘chirildi — boshqalarni eshitmaydi">
                              <VolumeX size={12} className="text-red-400" />
                            </span>
                          )}
                          {vMicOn ? (
                            vSpeaking ? (
                              <span className="flex items-end gap-0.5" title="Gapirayapti">
                                <span className="w-1 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="w-1 h-2.5 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                                <span className="w-1 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                              </span>
                            ) : (
                              <span title="Mikrofoni yoqdiq">
                                <Mic size={12} className="text-red-400" />
                              </span>
                            )
                          ) : (
                            <span title="Mikrofoni o‘chiq">
                              <MicOff size={12} className="text-gray-500" />
                            </span>
                          )}
                        </>
                      )}
                      {participant.isMuted && <MicOff size={12} className="text-gray-500" />}
                      {participant.isReady ? (
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.isDeleted && 'opacity-50'
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-0.5">
                    {msg.user.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-white">{msg.user.nickname}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={cn('text-sm text-gray-300 break-words', msg.isDeleted && 'line-through')}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {hasMore && messages.length > 0 && (
                <button
                  onClick={loadMore}
                  disabled={chatLoading}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors"
                >
                  {chatLoading ? 'Loading...' : 'Load older messages'}
                </button>
              )}

              {typingUsers.length > 0 && (
                <div className="text-xs text-gray-500 italic px-1">
                  {typingUsers.map((u) => u.nickname).join(', ')}
                  {typingUsers.length === 1 ? ' is' : ' are'} typing...
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  onChange={handleTypingInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const target = e.target as HTMLInputElement;
                      if (target.value.trim()) {
                        sendMessage(target.value);
                        target.value = '';
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:hidden">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-3xl animate-bounce pointer-events-none"
            style={{
              left: `${reaction.x}%`,
              bottom: `${100 - reaction.y}%`,
              animationDuration: '2s',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none hidden md:block">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-3xl animate-bounce pointer-events-none"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animationDuration: '2s',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {Array.from(remoteUsers.entries()).map(([userId, { stream }]) => (
        <RemoteAudio key={userId} stream={stream} muted={!speakerOn} />
      ))}

      {voiceNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2.5 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-blue-500/30 shadow-xl text-sm text-white">
            {voiceNotice}
          </div>
        </div>
      )}
    </div>
  );
}
