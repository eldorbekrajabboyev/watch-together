import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { joinRoom } from '../services/api';
import { cn } from '../utils/classnames';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase().slice(0, 6));
    }
  }, [searchParams]);

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    setCode(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Room code must be exactly 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await joinRoom({ code, password: password || undefined });
      navigate(`/room/${res.room.code}`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to join room';
      if (msg.includes('not found')) {
        setError('Room not found. Check the code and try again.');
      } else if (msg.includes('password')) {
        setError('Incorrect password');
      } else if (msg.includes('full')) {
        setError('This room is full');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10" />

      <div
        className={cn(
          'relative w-full max-w-md p-8 rounded-2xl',
          'bg-white/5 backdrop-blur-xl border border-white/10',
          'shadow-2xl'
        )}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join a Room</h1>
          <p className="text-gray-400">Enter a room code to join a watch party</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
              Room Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABCDEF"
              maxLength={6}
              autoFocus
              className={cn(
                'w-full px-4 py-3 rounded-xl text-center text-2xl tracking-[0.3em] font-mono uppercase',
                'bg-white/5 border border-white/10 text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all'
              )}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password <span className="text-gray-500">(if required)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10 text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all'
              )}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
              'bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'text-white font-semibold transition-all'
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Join Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
