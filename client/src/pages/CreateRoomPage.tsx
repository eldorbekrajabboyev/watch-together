import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, ArrowLeft, Lock, Globe } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { createRoom } from '../services/api';
import { cn } from '../utils/classnames';

const maxOptions = Array.from({ length: 9 }, (_, i) => i + 2);

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Room title is required');
      return;
    }

    if (usePassword && !password) {
      setError('Password is required when password protection is enabled');
      return;
    }

    setLoading(true);
    try {
      const res = await createRoom({
        title: title.trim(),
        password: usePassword ? password : undefined,
      });
      navigate(`/room/${res.room.code}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create room');
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
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create a Room</h1>
          <p className="text-gray-400">Set up a watch party for your friends</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1.5">
              Room Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday Movie Night"
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10 text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all'
              )}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setUsePassword(!usePassword);
                if (usePassword) setPassword('');
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl w-full',
                'border transition-all text-sm font-medium',
                usePassword
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              )}
            >
              {usePassword ? <Lock size={16} /> : <Globe size={16} />}
              {usePassword ? 'Password protected' : 'No password (open to anyone)'}
            </button>
          </div>

          {usePassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Room Password
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
          )}

          <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-300 mb-1.5">
              Max Participants
            </label>
            <select
              id="maxParticipants"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10 text-white',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all appearance-none cursor-pointer'
              )}
            >
              {maxOptions.map((n) => (
                <option key={n} value={n} className="bg-gray-900">
                  {n} people
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
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
                <Plus size={18} />
                Create Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
