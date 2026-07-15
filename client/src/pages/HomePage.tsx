import { Link } from 'react-router-dom';
import { Monitor, Zap, Mic, ArrowRight, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../utils/classnames';

const features = [
  {
    icon: Monitor,
    title: 'Local Files',
    description: 'Your files stay on your device. No uploads, no cloud, just direct peer-to-peer sharing.',
  },
  {
    icon: Zap,
    title: 'Real-time Sync',
    description: 'Play, pause, seek together. Everyone sees the same frame at the same time.',
  },
  {
    icon: Mic,
    title: 'Voice Chat',
    description: 'Talk while you watch. Built-in voice chat with no external apps needed.',
  },
];

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-cyan-600/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            SyncWatch
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User size={16} />
                  {user.nickname}
                </div>
                <Link
                  to="/dashboard"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-purple-600 hover:bg-purple-500 transition-colors'
                  )}
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-purple-600 hover:bg-purple-500 transition-colors'
                  )}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-32 max-w-4xl mx-auto">
          <h1 className="text-6xl sm:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              SyncWatch
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-2xl">
            Watch local videos together in real-time
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/create"
              className={cn(
                'flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold',
                'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
                'transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
              )}
            >
              Create Room
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/join"
              className={cn(
                'flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold',
                'bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20',
                'transition-all'
              )}
            >
              Join Room
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  'p-8 rounded-2xl',
                  'bg-white/5 backdrop-blur-sm border border-white/10',
                  'hover:bg-white/10 hover:border-white/20',
                  'transition-all duration-300'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <Icon className="text-purple-400" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} SyncWatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
