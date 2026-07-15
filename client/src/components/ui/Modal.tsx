import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/classnames';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full max-w-lg mx-4',
          'bg-dark-800/90 backdrop-blur-xl border border-dark-700/50',
          'rounded-2xl shadow-2xl shadow-black/50',
          'animate-in zoom-in-95 fade-in duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between p-6 pb-0">
          {title && (
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          )}
          <button
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors',
              !title && 'ml-auto'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-0">
            <div className="flex items-center justify-end gap-3">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
