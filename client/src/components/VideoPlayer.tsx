import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  VideoHTMLAttributes,
} from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { cn } from '../utils/classnames';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

interface Subtitle {
  label: string;
  language?: string;
  src?: string;
}

interface VideoPlayerProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'onError'> {
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onVolumeSliderChange?: (volume: number, muted: boolean) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onFullscreen?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onSubtitleChange?: (trackLabel: string | null) => void;
  onAudioTrackChange?: (trackLabel: string | null) => void;
  subtitles?: Subtitle[];
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  canResume?: boolean;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      isPlaying: externalIsPlaying,
      onPlay,
      onPause,
      onSeek,
      onVolumeSliderChange,
      onPlaybackRateChange,
      onFullscreen,
      onFullscreenChange,
      onSubtitleChange,
      onAudioTrackChange,
      subtitles = [],
      children,
      overlay,
      canResume = true,
      className,
      ...videoProps
    },
    ref
  ) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => internalVideoRef.current!, []);

    const [isBuffering, setIsBuffering] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
    const [showExtras, setShowExtras] = useState(false);

    const video = internalVideoRef.current;

    const hideControlsAfterDelay = useCallback(() => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (video && !video.paused) {
          setShowControls(false);
        }
      }, 3000);
    }, [video]);

    const handleMouseMove = useCallback(() => {
      setShowControls(true);
      hideControlsAfterDelay();
    }, [hideControlsAfterDelay]);

    const handleMouseLeave = useCallback(() => {
      if (video && !video.paused) {
        hideControlsAfterDelay();
      }
    }, [video, hideControlsAfterDelay]);

    useEffect(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;

      const onTimeUpdate = () => setCurrentTime(vid.currentTime);
      const onDurationChange = () => setDuration(vid.duration);
      const onWaiting = () => setIsBuffering(true);
      const onCanPlay = () => setIsBuffering(false);
      const onPlayEvent = () => setIsBuffering(false);
      const onPauseEvent = () => setShowControls(true);

      const handleFullscreenChange = () => {
        const fs = !!document.fullscreenElement;
        setIsFullscreen(fs);
        onFullscreenChange?.(fs);
      };
      const onEnterPiP = () => setIsPiP(true);
      const onLeavePiP = () => setIsPiP(false);

      vid.addEventListener('timeupdate', onTimeUpdate);
      vid.addEventListener('durationchange', onDurationChange);
      vid.addEventListener('waiting', onWaiting);
      vid.addEventListener('canplay', onCanPlay);
      vid.addEventListener('play', onPlayEvent);
      vid.addEventListener('pause', onPauseEvent);
      vid.addEventListener('enterpictureinpicture', onEnterPiP);
      vid.addEventListener('leavepictureinpicture', onLeavePiP);
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      return () => {
        vid.removeEventListener('timeupdate', onTimeUpdate);
        vid.removeEventListener('durationchange', onDurationChange);
        vid.removeEventListener('waiting', onWaiting);
        vid.removeEventListener('canplay', onCanPlay);
        vid.removeEventListener('play', onPlayEvent);
        vid.removeEventListener('pause', onPauseEvent);
        vid.removeEventListener('enterpictureinpicture', onEnterPiP);
        vid.removeEventListener('leavepictureinpicture', onLeavePiP);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    useEffect(() => {
      if (externalIsPlaying && video) {
        video.play().catch(() => {});
      } else if (!externalIsPlaying && video && !video.paused) {
        video.pause();
      }
    }, [externalIsPlaying, video]);

    useEffect(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        switch (e.key) {
          case ' ':
            e.preventDefault();
            if (vid.paused) {
              if (!canResume) return;
              vid.play().catch(() => {});
              onPlay?.();
            } else {
              vid.pause();
              onPause?.();
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            vid.currentTime = Math.max(0, vid.currentTime - 10);
            onSeek?.(vid.currentTime);
            setShowControls(true);
            hideControlsAfterDelay();
            break;
          case 'ArrowRight':
            e.preventDefault();
            vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
            onSeek?.(vid.currentTime);
            setShowControls(true);
            hideControlsAfterDelay();
            break;
          case 'ArrowUp':
            e.preventDefault();
            vid.volume = Math.min(1, vid.volume + 0.1);
            vid.muted = false;
            setVolume(vid.volume);
            setIsMuted(false);
            onVolumeSliderChange?.(vid.volume, false);
            break;
          case 'ArrowDown':
            e.preventDefault();
            vid.volume = Math.max(0, vid.volume - 0.1);
            setVolume(vid.volume);
            onVolumeSliderChange?.(vid.volume, vid.muted);
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            handleFullscreenToggle();
            break;
          case 'm':
          case 'M':
            e.preventDefault();
            vid.muted = !vid.muted;
            setIsMuted(vid.muted);
            onVolumeSliderChange?.(vid.volume, vid.muted);
            break;
          case ']':
            e.preventDefault();
            handleSpeedChange(playbackRate === 2 ? 2 : Math.min(2, playbackRate + 0.25));
            break;
          case '[':
            e.preventDefault();
            handleSpeedChange(playbackRate === 0.5 ? 0.5 : Math.max(0.5, playbackRate - 0.25));
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onPlay, onPause, onSeek, onVolumeSliderChange, playbackRate, hideControlsAfterDelay, canResume]);

    const handlePlayPause = useCallback(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;
      if (vid.paused) {
        if (!canResume) return;
        vid.play().catch(() => {});
        onPlay?.();
      } else {
        vid.pause();
        onPause?.();
      }
    }, [onPlay, onPause, canResume]);

    const handleSeekChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        const vid = internalVideoRef.current;
        if (vid) {
          vid.currentTime = time;
        }
        setCurrentTime(time);
        onSeek?.(time);
      },
      [onSeek]
    );

    const handleVolumeChangeInternal = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        const vid = internalVideoRef.current;
        if (vid) {
          vid.volume = vol;
          vid.muted = vol === 0;
        }
        setVolume(vol);
        setIsMuted(vol === 0);
        onVolumeSliderChange?.(vol, vol === 0);
      },
      [onVolumeSliderChange]
    );

    const handleMuteToggle = useCallback(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;
      vid.muted = !vid.muted;
      setIsMuted(vid.muted);
      onVolumeSliderChange?.(vid.volume, vid.muted);
    }, [onVolumeSliderChange]);

    const handleSpeedChange = useCallback(
      (rate: number) => {
        const vid = internalVideoRef.current;
        if (vid) {
          vid.playbackRate = rate;
        }
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
        onPlaybackRateChange?.(rate);
      },
      [onPlaybackRateChange]
    );

    const handleFullscreenToggle = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
      onFullscreen?.();
    }, [onFullscreen]);

    const handlePiPToggle = useCallback(async () => {
      const vid = internalVideoRef.current;
      if (!vid) return;

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (vid.requestPictureInPicture) {
          await vid.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP error:', err);
      }
    }, []);

    const handleSubtitleSelect = useCallback(
      (label: string | null) => {
        const vid = internalVideoRef.current;
        if (vid) {
          const tracks = vid.textTracks;
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = 'disabled';
          }
          if (label) {
            for (let i = 0; i < tracks.length; i++) {
              if (tracks[i].label === label || tracks[i].language === label) {
                tracks[i].mode = 'showing';
                break;
              }
            }
          }
        }
        setActiveSubtitle(label);
        setShowSubtitleMenu(false);
        onSubtitleChange?.(label);
      },
      [onSubtitleChange]
    );

    const handleAudioTrackSelect = useCallback(
      (label: string | null) => {
        const vid = internalVideoRef.current;
        if (vid) {
          const audioTracks = (vid as any).audioTracks;
          if (audioTracks) {
            for (let i = 0; i < audioTracks.length; i++) {
              audioTracks[i].enabled = false;
            }
            if (label) {
              for (let i = 0; i < audioTracks.length; i++) {
                if (audioTracks[i].label === label || audioTracks[i].language === label) {
                  audioTracks[i].enabled = true;
                  break;
                }
              }
            }
          }
        }
        setShowAudioMenu(false);
        onAudioTrackChange?.(label);
      },
      [onAudioTrackChange]
    );

    const handleSeekForward = useCallback(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;
      vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
      onSeek?.(vid.currentTime);
    }, [onSeek]);

    const handleSeekBackward = useCallback(() => {
      const vid = internalVideoRef.current;
      if (!vid) return;
      vid.currentTime = Math.max(0, vid.currentTime - 10);
      onSeek?.(vid.currentTime);
    }, [onSeek]);

    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full h-full bg-black group select-none', className)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={internalVideoRef}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
          onClick={handlePlayPause}
          onDoubleClick={handleFullscreenToggle}
          {...videoProps}
        />

        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!isBuffering && !externalIsPlaying && canResume && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
              <Play size={32} className="text-white ml-1" fill="white" />
            </div>
          </button>
        )}

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300',
            'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
            'pt-12 pb-3 px-4',
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="relative mb-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className={cn(
                'w-full h-1 appearance-none cursor-pointer rounded-full',
                'bg-white/20 group-hover:bg-white/30',
                '[&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400',
                '[&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100',
                '[&::-webkit-slider-thumb]:transition-opacity',
                '[&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(168,85,247,0.5)]',
                '[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3',
                '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-400',
                '[&::-moz-range-thumb]:border-0'
              )}
              style={{
                background: duration
                  ? `linear-gradient(to right, #a855f7 0%, #a855f7 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                  : undefined,
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePlayPause}
                disabled={!externalIsPlaying && !canResume}
                className={cn(
                  'p-1.5 rounded-lg transition-colors text-white',
                  !externalIsPlaying && !canResume
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/10'
                )}
                title={!externalIsPlaying && !canResume ? 'Faqat pauza qilgan kishi davom ettira oladi' : undefined}
              >
                {externalIsPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
              </button>

              <button
                onClick={handleSeekBackward}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
                title="Back 10s"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={handleSeekForward}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
                title="Forward 10s"
              >
                <SkipForward size={18} />
              </button>

              <div className="flex items-center gap-1.5 group/volume">
                <button
                  onClick={handleMuteToggle}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
                >
                  <VolumeIcon size={18} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChangeInternal}
                  className={cn(
                    'w-0 group-hover/volume:w-20 transition-all duration-200',
                    'h-1 appearance-none cursor-pointer rounded-full',
                    'bg-white/20',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
                    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
                    '[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3',
                    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white',
                    '[&::-moz-range-thumb]:border-0'
                  )}
                  style={{
                    background: duration
                      ? `linear-gradient(to right, #ffffff 0%, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                      : undefined,
                  }}
                />
              </div>

              <span className="text-xs text-gray-300 ml-1 font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSubtitleMenu(!showSubtitleMenu);
                      setShowSpeedMenu(false);
                      setShowAudioMenu(false);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                      activeSubtitle
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-300 hover:bg-white/10'
                    )}
                  >
                    CC
                  </button>

                  {showSubtitleMenu && (
                    <div className="absolute bottom-full right-0 mb-2 min-w-[150px] bg-gray-800/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl overflow-hidden">
                      <button
                        onClick={() => handleSubtitleSelect(null)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors',
                          !activeSubtitle ? 'text-purple-400' : 'text-gray-300'
                        )}
                      >
                        Off
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.label}
                          onClick={() => handleSubtitleSelect(sub.label)}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors',
                            activeSubtitle === sub.label ? 'text-purple-400' : 'text-gray-300'
                          )}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowSubtitleMenu(false);
                    setShowAudioMenu(false);
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-[120px] bg-gray-800/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors',
                          playbackRate === rate ? 'text-purple-400' : 'text-gray-300'
                        )}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handlePiPToggle}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isPiP ? 'text-purple-400' : 'text-gray-300 hover:bg-white/10'
                )}
                title="Picture in Picture"
              >
                <PictureInPicture2 size={18} />
              </button>

              <button
                onClick={handleFullscreenToggle}
                className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>

        {(showSpeedMenu || showSubtitleMenu || showAudioMenu) && (
          <div
            className="absolute inset-0 z-10"
            onClick={() => {
              setShowSpeedMenu(false);
              setShowSubtitleMenu(false);
              setShowAudioMenu(false);
            }}
          />
        )}

        {isFullscreen && children && (
          <>
            <div
              className="absolute top-0 right-0 h-full w-1.5 z-30"
              onMouseEnter={() => setShowExtras(true)}
            />
            <div
              className={cn(
                'absolute top-0 right-0 h-full w-80 max-w-[80vw] z-30',
                'bg-gray-900/95 backdrop-blur-sm border-l border-white/10',
                'flex flex-col transition-transform duration-300',
                showExtras ? 'translate-x-0' : 'translate-x-full'
              )}
              onMouseEnter={() => setShowExtras(true)}
              onMouseLeave={() => setShowExtras(false)}
            >
              {children}
            </div>
          </>
        )}

        {isFullscreen && overlay && (
          <div className="absolute inset-0 z-50 pointer-events-none">{overlay}</div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
