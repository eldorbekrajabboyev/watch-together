import type { User, Room, Participant, Message, RoomSettings, AdminStats } from '../types';

const BASE_URL = '';

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: unknown;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: string }).message
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

export { ApiError };

// Auth
export function register(data: {
  nickname: string;
  email?: string;
  password?: string;
}): Promise<{ user: User; token: string }> {
  return post('/api/auth/register', data);
}

export function login(data: {
  email?: string;
  nickname?: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  return post('/api/auth/login', data);
}

export function getMe(): Promise<{ user: User }> {
  return get('/api/auth/me');
}

// Profile
export function updateProfile(data: {
  nickname?: string;
  avatar?: string;
}): Promise<{ user: User }> {
  return put('/api/auth/me', data);
}

// Rooms
export function createRoom(data: {
  title: string;
  password?: string;
}): Promise<{ room: Room }> {
  return post('/api/rooms', data);
}

export function joinRoom(data: {
  code: string;
  password?: string;
}): Promise<{ room: Room }> {
  return post('/api/rooms/join', data);
}

export function getRoom(code: string): Promise<{ room: Room }> {
  return get(`/api/rooms/${code}`);
}

export function getActiveRooms(): Promise<{ rooms: Room[] }> {
  return get('/api/rooms');
}

export function updateRoomSettings(
  code: string,
  settings: Partial<Pick<RoomSettings, 'hostOnlyControl' | 'voiceEnabled' | 'chatEnabled' | 'autoSync'>>
): Promise<{ settings: RoomSettings }> {
  return put(`/api/rooms/${code}/settings`, settings);
}

export function leaveRoom(code: string): Promise<void> {
  return post(`/api/rooms/${code}/leave`);
}

export function closeRoom(code: string): Promise<void> {
  return del(`/api/rooms/${code}`);
}

// Participants
export function getParticipants(code: string): Promise<{ participants: Participant[] }> {
  return get(`/api/rooms/${code}/participants`);
}

// Messages
export function getMessages(
  roomId: string,
  limit?: number,
  cursor?: string
): Promise<{ messages: Message[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return get(`/api/chat/${roomId}/messages${query ? `?${query}` : ''}`);
}

export function editMessage(
  roomId: string,
  messageId: string,
  content: string
): Promise<{ message: Message }> {
  return put(`/api/chat/${roomId}/messages/${messageId}`, { content });
}

export function deleteMessage(
  roomId: string,
  messageId: string
): Promise<void> {
  return del(`/api/chat/${roomId}/messages/${messageId}`);
}

// Admin
export function getAdminStats(): Promise<{ stats: AdminStats }> {
  return get('/api/admin/stats');
}

export function getAdminRooms(): Promise<{ rooms: Room[] }> {
  return get('/api/admin/rooms');
}

export function getAdminUsers(): Promise<{ users: User[] }> {
  return get('/api/admin/users');
}

export function getAdminLogs(): Promise<{ logs: unknown[] }> {
  return get('/api/admin/logs');
}
