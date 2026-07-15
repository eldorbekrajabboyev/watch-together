import { cn } from '../../utils/classnames';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string;
  alt?: string;
  nickname?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; online: string }> = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    online: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-2',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    online: 'w-3 h-3 -bottom-0.5 -right-0.5 border-2',
  },
  lg: {
    container: 'w-14 h-14',
    text: 'text-lg',
    online: 'w-4 h-4 -bottom-1 -right-1 border-[3px]',
  },
};

export default function Avatar({
  src,
  alt,
  nickname,
  size = 'md',
  isOnline,
  isSpeaking,
  className,
}: AvatarProps) {
  const initials = nickname
    ? nickname
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700',
          sizeStyles[size].container,
          isSpeaking && 'ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900 animate-pulse'
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt || nickname || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={cn(
              'font-semibold text-white',
              sizeStyles[size].text
            )}
          >
            {initials}
          </span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-dark-900',
            sizeStyles[size].online,
            isOnline ? 'bg-green-500' : 'bg-dark-500'
          )}
        />
      )}
    </div>
  );
}
