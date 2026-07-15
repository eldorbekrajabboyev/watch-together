import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
    autoConnect: false,
  });

  reconnectAttempts = 0;

  socket.on('connect', () => {
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('connect_error', () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      setTimeout(() => socket?.connect(), delay);
    }
  });

  socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;
}

export function getSocket(): Socket | null {
  return socket;
}

export function on<T = void>(event: string, callback: (data: T) => void): void {
  socket?.on(event, callback);
}

export function off(event: string, callback?: (...args: unknown[]) => void): void {
  if (callback) {
    socket?.off(event, callback);
  } else {
    socket?.removeAllListeners(event);
  }
}

export function emit(event: string, ...args: unknown[]): void {
  if (socket?.connected) {
    socket.emit(event, ...args);
  }
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
