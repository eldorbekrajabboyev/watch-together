import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  Save,
  Loader2,
  ArrowLeft,
  Crown,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../services/api';
import type { Room } from '../types';
import { cn } from '../utils/classnames';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [roomHistory, setRoomHistory] = useState<Room[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    async function fetchHistory() {
      try {
        setLoadingHistory(true);
        const res = await api.getActiveRooms();
        setRoomHistory(res.rooms);
      } catch {
        // ignore
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Nickname is required');
      return;
    }

    setSaving(true);
    setError('');
    setSaveMessage('');

    try {
      const res = await api.updateProfile({
        nickname: nickname.trim(),
        avatar: avatarUrl.trim() || undefined,
      });
      setUser(res.user);
      setSaveMessage('Profile updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl p-6',
                'bg-dark-800/60 backdrop-blur-xl',
                'border border-dark-700/50'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-primary-400/5 pointer-events-none" />
              <div className="relative">
                <div className="flex items-start gap-6">
                  <div className="relative group">
                    <Avatar
                      src={avatarUrl || undefined}
                      nickname={user.nickname}
                      size="lg"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white">{user.nickname}</h1>
                    <p className="text-dark-300 text-sm mt-0.5">{user.email || 'No email set'}</p>
                    <div className="flex items-center gap-3 mt-3">
                      {user.isAdmin ? (
                        <Badge variant="warning">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="primary">User</Badge>
                      )}
                      <span className="text-xs text-dark-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'rounded-2xl p-6',
                'bg-dark-800/60 backdrop-blur-xl',
                'border border-dark-700/50'
              )}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Edit Profile</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname"
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Avatar URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  icon={<Camera className="w-4 h-4" />}
                />

                {avatarUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-dark-600/50">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-600 shrink-0">
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-dark-200">Avatar Preview</p>
                      <p className="text-xs text-dark-400 truncate max-w-[200px]">{avatarUrl}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                {saveMessage && (
                  <p className="text-sm text-green-400">{saveMessage}</p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={cn(
                'rounded-2xl p-6',
                'bg-dark-800/60 backdrop-blur-xl',
                'border border-dark-700/50'
              )}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Account Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-dark-700/50">
                    <User className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Nickname</p>
                    <p className="text-sm text-white">{user.nickname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-dark-700/50">
                    <Mail className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Email</p>
                    <p className="text-sm text-white">{user.email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-dark-700/50">
                    <Shield className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Role</p>
                    <p className="text-sm text-white">{user.isAdmin ? 'Admin' : 'User'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-dark-700/50">
                    <Calendar className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Member Since</p>
                    <p className="text-sm text-white">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'rounded-2xl p-6',
                'bg-dark-800/60 backdrop-blur-xl',
                'border border-dark-700/50'
              )}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Room History</h2>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                </div>
              ) : roomHistory.length === 0 ? (
                <p className="text-sm text-dark-400 text-center py-6">
                  No room history yet. Join or create a room to get started.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {roomHistory.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 border border-dark-600/30 hover:bg-dark-700/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/room/${room.code}`)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{room.title}</p>
                        <p className="text-xs text-dark-400 font-mono">{room.code}</p>
                      </div>
                      {room.isActive ? (
                        <Badge variant="success" dot />
                      ) : (
                        <Badge variant="danger" dot />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
