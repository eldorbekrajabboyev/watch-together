import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '../services/socket';
import { useRoomStore } from '../store/useRoomStore';

const SYNC_TOLERANCE = 0.3;
const SEEK_GUARD_MS = 3000;

interface UseVideoSyncProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  roomCode: string;
  hasVideo: boolean;
  userId?: string;
}

export function useVideoSync({ videoRef, roomCode, hasVideo, userId }: UseVideoSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const lastReceivedTime = useRef(0);
  const suppressEvents = useRef(false);
  const lastSeekAt = useRef(0);
  const setSyncState = useRoomStore((s) => s.setSyncState);

  const emitSync = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(event, { roomCode, ...data });
      }
    },
    [roomCode]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const socket = getSocket();
    if (!socket) return;

    const withSuppression = (fn: () => void) => {
      suppressEvents.current = true;
      fn();
      setTimeout(() => {
        suppressEvents.current = false;
      }, 50);
    };

    const handleSyncPlay = (data: { currentTime: number; timestamp: number }) => {
      withSuppression(() => {
        if (video.currentTime !== data.currentTime) {
          video.currentTime = data.currentTime;
        }
        video.play().catch(() => {});
      });
      lastReceivedTime.current = data.currentTime;
      setSyncState({ isPlaying: true, currentTime: data.currentTime, pausedBy: null });
    };

    const handleSyncPause = (data: { currentTime: number; userId: string }) => {
      withSuppression(() => {
        video.pause();
        if (video.currentTime !== data.currentTime) {
          video.currentTime = data.currentTime;
        }
      });
      lastReceivedTime.current = data.currentTime;
      setSyncState({ isPlaying: false, currentTime: data.currentTime, pausedBy: data.userId });
    };

    const handleSyncSeek = (data: { currentTime: number }) => {
      withSuppression(() => {
        video.currentTime = data.currentTime;
      });
      lastSeekAt.current = Date.now();
      lastReceivedTime.current = data.currentTime;
      setSyncState({ currentTime: data.currentTime });
    };

    const handleSyncPlaybackRate = (data: { playbackRate: number }) => {
      withSuppression(() => {
        video.playbackRate = data.playbackRate;
      });
      setSyncState({ playbackRate: data.playbackRate });
    };

    const handleSyncVolume = (data: { volume: number; muted: boolean }) => {
      withSuppression(() => {
        video.volume = data.volume;
        video.muted = data.muted;
      });
      setSyncState({ volume: data.volume, isMuted: data.muted });
    };

    const handleSyncSubtitleChange = (data: { subtitleTrack: string | null }) => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'disabled';
      }
      if (data.subtitleTrack) {
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].label === data.subtitleTrack || tracks[i].language === data.subtitleTrack) {
            tracks[i].mode = 'showing';
            break;
          }
        }
      }
      setSyncState({ subtitleTrack: data.subtitleTrack });
    };

    const handleSyncAudioTrackChange = (data: { audioTrack: string | null }) => {
      const audioTracks = (video as any).audioTracks;
      if (audioTracks) {
        for (let i = 0; i < audioTracks.length; i++) {
          audioTracks[i].enabled = false;
        }
        if (data.audioTrack) {
          for (let i = 0; i < audioTracks.length; i++) {
            if (audioTracks[i].label === data.audioTrack || audioTracks[i].language === data.audioTrack) {
              audioTracks[i].enabled = true;
              break;
            }
          }
        }
      }
      setSyncState({ audioTrack: data.audioTrack });
    };

    const handleSyncTimeUpdate = (data: { currentTime: number }) => {
      lastReceivedTime.current = data.currentTime;
      if (Date.now() - lastSeekAt.current < SEEK_GUARD_MS) return;
      if (video.paused || !video.duration) return;
      // Only correct drift FORWARD (when we're behind). Seeking backward to a
      // peer's value that is up to one interval stale would rewind playback.
      const behind = data.currentTime - video.currentTime;
      if (behind > SYNC_TOLERANCE) {
        setIsSyncing(true);
        withSuppression(() => {
          video.currentTime = data.currentTime;
        });
        setTimeout(() => setIsSyncing(false), 500);
      }
    };

    socket.on('sync:play', handleSyncPlay);
    socket.on('sync:pause', handleSyncPause);
    socket.on('sync:seek', handleSyncSeek);
    socket.on('sync:playback-rate', handleSyncPlaybackRate);
    socket.on('sync:volume', handleSyncVolume);
    socket.on('sync:subtitle-change', handleSyncSubtitleChange);
    socket.on('sync:audio-track-change', handleSyncAudioTrackChange);
    socket.on('sync:time-update', handleSyncTimeUpdate);

    const onPlay = () => {
      if (suppressEvents.current) return;
      emitSync('sync:play', { currentTime: video.currentTime });
      lastReceivedTime.current = video.currentTime;
      setSyncState({ isPlaying: true, currentTime: video.currentTime, pausedBy: null });
    };

    const onPause = () => {
      if (suppressEvents.current) return;
      emitSync('sync:pause', { currentTime: video.currentTime });
      lastReceivedTime.current = video.currentTime;
      setSyncState({ isPlaying: false, currentTime: video.currentTime, pausedBy: userId ?? null });
    };

    const onSeeked = () => {
      if (suppressEvents.current) return;
      emitSync('sync:seek', { currentTime: video.currentTime });
      lastReceivedTime.current = video.currentTime;
      setSyncState({ currentTime: video.currentTime });
    };

    const onTimeUpdate = () => {
      if (!suppressEvents.current) {
        setSyncState({ currentTime: video.currentTime });
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);

    const timeUpdateInterval = setInterval(() => {
      if (video && !video.paused && video.duration) {
        emitSync('sync:time-update', { currentTime: video.currentTime });
      }
    }, 2000);

    return () => {
      socket.off('sync:play', handleSyncPlay);
      socket.off('sync:pause', handleSyncPause);
      socket.off('sync:seek', handleSyncSeek);
      socket.off('sync:playback-rate', handleSyncPlaybackRate);
      socket.off('sync:volume', handleSyncVolume);
      socket.off('sync:subtitle-change', handleSyncSubtitleChange);
      socket.off('sync:audio-track-change', handleSyncAudioTrackChange);
      socket.off('sync:time-update', handleSyncTimeUpdate);

      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);

      if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    };
  }, [videoRef, roomCode, emitSync, setSyncState, hasVideo]);

    const handlePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      emitSync('sync:play', { currentTime: video.currentTime });
      lastReceivedTime.current = video.currentTime;
      setSyncState({ isPlaying: true, currentTime: video.currentTime, pausedBy: null });
    }, [videoRef, emitSync, setSyncState]);

    const handlePause = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      emitSync('sync:pause', { currentTime: video.currentTime });
      lastReceivedTime.current = video.currentTime;
      setSyncState({ isPlaying: false, currentTime: video.currentTime, pausedBy: userId ?? null });
    }, [videoRef, emitSync, setSyncState, userId]);

  const handleSeek = useCallback(
    (time: number) => {
      emitSync('sync:seek', { currentTime: time });
      lastSeekAt.current = Date.now();
      lastReceivedTime.current = time;
      setSyncState({ currentTime: time });
    },
    [emitSync, setSyncState]
  );

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      emitSync('sync:playback-rate', { playbackRate: rate });
      setSyncState({ playbackRate: rate });
    },
    [emitSync, setSyncState]
  );

  const handleVolumeChange = useCallback(
    (volume: number, muted: boolean) => {
      emitSync('sync:volume', { volume, muted });
      setSyncState({ volume, isMuted: muted });
    },
    [emitSync, setSyncState]
  );

  const handleFullscreen = useCallback(() => {
    // The VideoPlayer owns the fullscreen toggle on its own container,
    // so this is only a notification hook. Avoid requesting fullscreen
    // on the <video> element too (would conflict with the container).
  }, []);

  const handleSubtitleChange = useCallback(
    (trackLabel: string | null) => {
      emitSync('sync:subtitle-change', { subtitleTrack: trackLabel });
      setSyncState({ subtitleTrack: trackLabel });
    },
    [emitSync, setSyncState]
  );

  const handleAudioTrackChange = useCallback(
    (trackLabel: string | null) => {
      emitSync('sync:audio-track-change', { audioTrack: trackLabel });
      setSyncState({ audioTrack: trackLabel });
    },
    [emitSync, setSyncState]
  );

  return {
    handlePlay,
    handlePause,
    handleSeek,
    handlePlaybackRateChange,
    handleVolumeChange,
    handleFullscreen,
    handleSubtitleChange,
    handleAudioTrackChange,
    isSyncing,
  };
}
