import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Radio,
  MessageSquare,
  Wifi,
  Search,
  Shield,
  ShieldOff,
  RefreshCw,
  Clock,
  UserPlus,
  LogIn,
  Trash2,
  Loader2,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../services/api';
import type { AdminStats, Room, User } from '../types';
import { cn } from '../utils/classnames';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

type Tab = 'rooms' | 'users' | 'logs';

interface ActivityLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('rooms');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [roomsSearch, setRoomsSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getAdminStats();
      setStats(res.stats);
    } catch {
      // silently fail for auto-refresh
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const res = await api.getAdminRooms();
      setRooms(res.rooms);
    } catch {
      // ignore
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await api.getAdminUsers();
      setUsers(res.users);
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await api.getAdminLogs();
      setLogs((res.logs as ActivityLog[]) || []);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;

    async function initialFetch() {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRooms(), fetchUsers(), fetchLogs()]);
      setLoading(false);
    }
    initialFetch();
  }, [user?.isAdmin, fetchStats, fetchRooms, fetchUsers, fetchLogs]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user?.isAdmin, fetchStats]);

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-dark-300">
            You do not have permission to access the admin dashboard. This area is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const filteredRooms = rooms.filter(
    (r) =>
      r.title.toLowerCase().includes(roomsSearch.toLowerCase()) ||
      r.code.toLowerCase().includes(roomsSearch.toLowerCase()) ||
      r.host.nickname.toLowerCase().includes(roomsSearch.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.nickname.toLowerCase().includes(usersSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(usersSearch.toLowerCase()))
  );

  const filteredLogs = logs.filter((l) =>
    l.message.toLowerCase().includes(logsSearch.toLowerCase()) ||
    (l.user && l.user.toLowerCase().includes(logsSearch.toLowerCase()))
  );

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'from-primary-500/20 to-primary-600/10',
      iconColor: 'text-primary-400',
    },
    {
      label: 'Active Rooms',
      value: stats?.activeRooms ?? 0,
      icon: Radio,
      color: 'from-green-500/20 to-green-600/10',
      iconColor: 'text-green-400',
    },
    {
      label: 'Total Messages',
      value: stats?.totalMessages ?? 0,
      icon: MessageSquare,
      color: 'from-yellow-500/20 to-yellow-600/10',
      iconColor: 'text-yellow-400',
    },
    {
      label: 'Online Users',
      value: stats?.onlineUsers ?? 0,
      icon: Wifi,
      color: 'from-cyan-500/20 to-cyan-600/10',
      iconColor: 'text-cyan-400',
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'rooms', label: 'Active Rooms' },
    { key: 'users', label: 'All Users' },
    { key: 'logs', label: 'Activity Log' },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-400" />
              Admin Dashboard
            </h1>
            <p className="text-dark-300 text-sm mt-1">Manage users, rooms, and monitor activity</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchRooms();
              fetchUsers();
              fetchLogs();
            }}
            loading={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={cn(
                  'relative overflow-hidden rounded-xl p-5',
                  'bg-gradient-to-br border border-dark-700/50',
                  card.color
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-dark-300 text-sm font-medium">{card.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {loading ? (
                        <span className="inline-block w-12 h-8 bg-dark-600 rounded animate-pulse" />
                      ) : (
                        card.value.toLocaleString()
                      )}
                    </p>
                  </div>
                  <div className={cn('p-2.5 rounded-lg bg-dark-800/50', card.iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-b border-dark-700/50 mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative',
                  activeTab === tab.key
                    ? 'text-white bg-dark-800'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'rooms' && (
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/50 overflow-hidden">
            <div className="p-4 border-b border-dark-700/50">
              <Input
                placeholder="Search rooms by title, code, or host..."
                value={roomsSearch}
                onChange={(e) => setRoomsSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            {roomsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center text-dark-400">
                {roomsSearch ? 'No rooms match your search' : 'No active rooms'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Code</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Host</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Participants</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Created</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Status</th>
                      <th className="px-4 py-3 font-medium text-dark-300 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map((room) => (
                      <tr
                        key={room.id}
                        className="border-b border-dark-700/30 hover:bg-dark-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary-400">{room.code}</td>
                        <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                          {room.title}
                        </td>
                        <td className="px-4 py-3 text-dark-200">{room.host.nickname}</td>
                        <td className="px-4 py-3">
                          <span className="text-dark-200">
                            {room._count?.participants ?? room.participants?.length ?? 0}
                            <span className="text-dark-500">
                              /{room.maxParticipants}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-dark-400 text-xs">
                          {new Date(room.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {room.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="danger">Closed</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setExpandedRoom(expandedRoom === room.id ? null : room.id)
                            }
                            className="p-1 rounded-lg text-dark-400 hover:text-white hover:bg-dark-600 transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform',
                                expandedRoom === room.id && 'rotate-180'
                              )}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/50 overflow-hidden">
            <div className="p-4 border-b border-dark-700/50">
              <Input
                placeholder="Search users by nickname or email..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-dark-400">
                {usersSearch ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Nickname</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Joined</th>
                      <th className="text-left px-4 py-3 font-medium text-dark-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-dark-700/30 hover:bg-dark-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-semibold text-white">
                              {u.nickname.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{u.nickname}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-dark-300">{u.email || '—'}</td>
                        <td className="px-4 py-3">
                          {u.isAdmin ? (
                            <Badge variant="warning">Admin</Badge>
                          ) : (
                            <Badge variant="primary">User</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-dark-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" dot>
                            Online
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/50 overflow-hidden">
            <div className="p-4 border-b border-dark-700/50">
              <Input
                placeholder="Search activity logs..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-dark-400">
                {logsSearch ? 'No logs match your search' : 'No activity logs available'}
              </div>
            ) : (
              <div className="divide-y divide-dark-700/30">
                {filteredLogs.map((log) => {
                  let Icon = Clock;
                  let iconColor = 'text-dark-400';
                  if (log.type === 'user_joined' || log.type === 'room_joined') {
                    Icon = LogIn;
                    iconColor = 'text-green-400';
                  } else if (log.type === 'user_created' || log.type === 'room_created') {
                    Icon = UserPlus;
                    iconColor = 'text-primary-400';
                  } else if (log.type === 'room_closed') {
                    Icon = Trash2;
                    iconColor = 'text-red-400';
                  } else if (log.type === 'message_sent') {
                    Icon = MessageSquare;
                    iconColor = 'text-yellow-400';
                  }

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-dark-700/30 transition-colors"
                    >
                      <div className={cn('mt-0.5 p-1.5 rounded-lg bg-dark-700/50', iconColor)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{log.message}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {log.user && (
                            <span className="text-xs text-primary-400">{log.user}</span>
                          )}
                          <span className="text-xs text-dark-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
