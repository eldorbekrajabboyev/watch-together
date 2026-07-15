import { useState, useEffect } from 'react';
import {
  Crown,
  Mic,
  MessageSquare,
  RefreshCw,
  Lock,
  Users,
  Save,
} from 'lucide-react';
import type { RoomSettings as RoomSettingsType } from '../types';
import * as api from '../services/api';
import { cn } from '../utils/classnames';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface RoomSettingsProps {
  settings: RoomSettingsType;
  roomCode: string;
  isHost: boolean;
  onUpdate: (settings: RoomSettingsType) => void;
  onClose: () => void;
}

function Toggle({
  enabled,
  onChange,
  disabled,
  label,
  description,
  icon: Icon,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className={cn('flex items-start gap-4 p-4 rounded-xl border transition-colors', disabled ? 'bg-dark-700/20 border-dark-700/30 opacity-60' : 'bg-dark-700/30 border-dark-600/30 hover:border-dark-500/50')}>
      <div className="p-2 rounded-lg bg-dark-600/50 shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-dark-400 mt-0.5">{description}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900',
              disabled && 'cursor-not-allowed',
              enabled ? 'bg-primary-600' : 'bg-dark-500'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomSettings({
  settings,
  roomCode,
  isHost,
  onUpdate,
  onClose,
}: RoomSettingsProps) {
  const [localSettings, setLocalSettings] = useState({
    voiceEnabled: settings.voiceEnabled,
    chatEnabled: settings.chatEnabled,
    autoSync: settings.autoSync,
    isPasswordProtected: settings.isPasswordProtected,
    maxParticipants: 10,
  });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalSettings({
      voiceEnabled: settings.voiceEnabled,
      chatEnabled: settings.chatEnabled,
      autoSync: settings.autoSync,
      isPasswordProtected: settings.isPasswordProtected,
      maxParticipants: 10,
    });
  }, [settings]);

  const handleToggle = (key: keyof typeof localSettings) => (val: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await api.updateRoomSettings(roomCode, {
        voiceEnabled: localSettings.voiceEnabled,
        chatEnabled: localSettings.chatEnabled,
        autoSync: localSettings.autoSync,
      });
      onUpdate(res.settings);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isHost ? 'Room Settings' : 'Room Settings (Read Only)'}
      className="max-w-lg"
      footer={
        isHost ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-3">
        {!isHost && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">
              Only the host can modify room settings.
            </p>
          </div>
        )}

        <Toggle
          enabled={localSettings.voiceEnabled}
          onChange={handleToggle('voiceEnabled')}
          disabled={!isHost}
          label="Voice Chat"
          description="Allow participants to use voice chat"
          icon={Mic}
        />

        <Toggle
          enabled={localSettings.chatEnabled}
          onChange={handleToggle('chatEnabled')}
          disabled={!isHost}
          label="Chat"
          description="Allow participants to send text messages"
          icon={MessageSquare}
        />

        <Toggle
          enabled={localSettings.autoSync}
          onChange={handleToggle('autoSync')}
          disabled={!isHost}
          label="Auto Sync"
          description="Automatically sync playback when someone joins"
          icon={RefreshCw}
        />

        <Toggle
          enabled={localSettings.isPasswordProtected}
          onChange={handleToggle('isPasswordProtected')}
          disabled={!isHost}
          label="Password Protected"
          description="Require a password to join the room"
          icon={Lock}
        />

        {localSettings.isPasswordProtected && isHost && (
          <div className="pl-14">
            <Input
              type="password"
              placeholder="Enter room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <div className={cn('flex items-start gap-4 p-4 rounded-xl border transition-colors', !isHost ? 'bg-dark-700/20 border-dark-700/30 opacity-60' : 'bg-dark-700/30 border-dark-600/30 hover:border-dark-500/50')}>
          <div className="p-2 rounded-lg bg-dark-600/50 shrink-0 mt-0.5">
            <Users className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Max Participants</p>
            <p className="text-xs text-dark-400 mt-0.5">Maximum number of participants allowed</p>
            <div className="mt-3">
              <input
                type="range"
                min={2}
                max={50}
                value={localSettings.maxParticipants}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    maxParticipants: Number(e.target.value),
                  }))
                }
                disabled={!isHost}
                className={cn(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  'bg-dark-600 accent-primary-500',
                  !isHost && 'cursor-not-allowed'
                )}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-dark-500">2</span>
                <span className="text-xs text-primary-400 font-medium">
                  {localSettings.maxParticipants}
                </span>
                <span className="text-xs text-dark-500">50</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
      </div>
    </Modal>
  );
}
