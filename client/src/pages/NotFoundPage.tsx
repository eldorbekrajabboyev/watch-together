import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { cn } from '../utils/classnames';
import Button from '../components/ui/Button';

const floatingShapes = [
  { size: 'w-64 h-64', position: 'top-1/4 -left-32', color: 'from-primary-500/10 to-primary-600/5', delay: '0s', duration: '6s' },
  { size: 'w-48 h-48', position: 'top-1/3 -right-24', color: 'from-cyan-500/10 to-cyan-600/5', delay: '1s', duration: '8s' },
  { size: 'w-32 h-32', position: 'bottom-1/4 left-1/4', color: 'from-purple-500/10 to-purple-600/5', delay: '2s', duration: '7s' },
  { size: 'w-40 h-40', position: 'bottom-1/3 right-1/3', color: 'from-pink-500/10 to-pink-600/5', delay: '0.5s', duration: '9s' },
  { size: 'w-24 h-24', position: 'top-1/2 left-1/2', color: 'from-yellow-500/10 to-yellow-600/5', delay: '1.5s', duration: '5s' },
];

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center overflow-hidden relative">
      {floatingShapes.map((shape, i) => (
        <div
          key={i}
          className={cn(
            'absolute rounded-full bg-gradient-to-br blur-3xl animate-float opacity-60',
            shape.size,
            shape.position,
            shape.color
          )}
          style={{
            animationDelay: shape.delay,
            animationDuration: shape.duration,
          }}
        />
      ))}

      <div className="relative z-10 text-center px-4">
        <h1
          className={cn(
            'text-[10rem] sm:text-[14rem] font-black leading-none select-none',
            'bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700',
            'bg-clip-text text-transparent'
          )}
          style={{
            textShadow: '0 0 80px rgba(76, 110, 245, 0.15)',
          }}
        >
          404
        </h1>

        <p className="text-xl sm:text-2xl text-dark-200 font-medium mt-4 mb-8">
          Page not found
        </p>

        <p className="text-dark-400 text-sm max-w-md mx-auto mb-10">
          The page you are looking for does not exist or has been moved.
        </p>

        <Button
          size="lg"
          onClick={() => navigate('/')}
        >
          <Home className="w-5 h-5 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
