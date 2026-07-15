export const SOCKET_URL = '';

export const SUPPORTED_FORMATS = ['video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime', 'video/webm'];
export const SUPPORTED_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export const REACTIONS = ['😂', '😭', '❤️', '🔥', '👏', '😱'] as const;

export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: ' ',
  SEEK_BACK: 'ArrowLeft',
  SEEK_FORWARD: 'ArrowRight',
  FULLSCREEN: 'f',
  MUTE: 'm',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  SPEED_UP: ']',
  SPEED_DOWN: '[',
} as const;

export const SYNC_TOLERANCE = 0.3; // 300ms max drift
export const SYNC_CHECK_INTERVAL = 5000; // Check every 5 seconds
