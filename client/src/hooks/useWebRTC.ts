import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '../services/socket';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { VoiceUser } from '../types';

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const SPEAKING_THRESHOLD = 30;
const VOLUME_DUCK_LEVEL = 0.3;

interface UseWebRTCProps {
  roomCode: string;
}

export function useWebRTC({ roomCode }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, { stream: MediaStream; nickname: string }>>(new Map());

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalVolumeRef = useRef<number>(1);

  const userId = useAuthStore((s) => s.user?.id);
  const syncState = useRoomStore((s) => s.syncState);
  const setSyncState = useRoomStore((s) => s.setSyncState);
  const addVoiceUser = useRoomStore((s) => s.addVoiceUser);
  const removeVoiceUser = useRoomStore((s) => s.removeVoiceUser);
  const setVoiceUsers = useRoomStore((s) => s.setVoiceUsers);

  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteNickname: string, isInitiator: boolean) => {
      const existing = peerConnections.current.get(remoteUserId);
      if (existing) {
        existing.close();
      }

      const pc = new RTCPeerConnection(STUN_SERVERS);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      const remoteStream = new MediaStream();

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        setRemoteUsers((prev) => {
          const next = new Map(prev);
          next.set(remoteUserId, { stream: remoteStream, nickname: remoteNickname });
          return next;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket();
          if (socket?.connected) {
            socket.emit('voice:ice-candidate', {
              roomCode,
              targetUserId: remoteUserId,
              candidate: event.candidate,
            });
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[voice] ICE ${remoteUserId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[voice] PC ${remoteUserId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          removePeerConnection(remoteUserId);
        }
      };

      pc.onnegotiationneeded = async () => {
        if (isInitiator) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const socket = getSocket();
            if (socket?.connected) {
              socket.emit('voice:offer', {
                roomCode,
                targetUserId: remoteUserId,
                offer: pc.localDescription,
              });
            }
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        }
      };

      peerConnections.current.set(remoteUserId, pc);
      return pc;
    },
    [roomCode, removeVoiceUser]
  );

  const removePeerConnection = useCallback((remoteUserId: string) => {
    const pc = peerConnections.current.get(remoteUserId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(remoteUserId);
    }
    pendingCandidates.current.delete(remoteUserId);
    setRemoteUsers((prev) => {
      const next = new Map(prev);
      next.delete(remoteUserId);
      return next;
    });
  }, []);

  const flushCandidates = useCallback((remoteUserId: string, pc: RTCPeerConnection) => {
    const cands = pendingCandidates.current.get(remoteUserId);
    if (!cands || cands.length === 0) return;
    cands.forEach((c) => {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) => console.error('Error flushing ICE:', err));
    });
    pendingCandidates.current.delete(remoteUserId);
  }, []);

  const startSpeakingDetection = useCallback(
    (stream: MediaStream) => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let currentlySpeaking = false;

      speakingIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > SPEAKING_THRESHOLD && !currentlySpeaking) {
          currentlySpeaking = true;
          setIsSpeaking(true);
          const socket = getSocket();
          if (socket?.connected) {
            socket.emit('voice:speaking', { roomCode, isSpeaking: true });
          }
        } else if (average <= SPEAKING_THRESHOLD && currentlySpeaking) {
          currentlySpeaking = false;
          setIsSpeaking(false);
          const socket = getSocket();
          if (socket?.connected) {
            socket.emit('voice:speaking', { roomCode, isSpeaking: false });
          }
        }
      }, 100);
    },
    [roomCode]
  );

  const stopSpeakingDetection = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const duckVolume = useCallback(
    (duck: boolean) => {
      if (!userId) return;
      const video = document.querySelector('video');
      if (!video) return;

      if (duck) {
        originalVolumeRef.current = video.volume;
        video.volume = Math.min(video.volume, VOLUME_DUCK_LEVEL);
      } else {
        video.volume = originalVolumeRef.current;
      }
    },
    [userId]
  );

  const joinVoice = useCallback(
    async (initialMic: boolean, initialSpeaker: boolean): Promise<boolean> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
          video: false,
        });

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = initialMic;

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicOn(initialMic);
        setSpeakerOn(initialSpeaker);

        startSpeakingDetection(stream);

        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('voice:join', { roomCode, micOn: initialMic, speakerOn: initialSpeaker });
        }
        return true;
      } catch (err) {
        console.error('Failed to join voice:', err);
        return false;
      }
    },
    [roomCode, startSpeakingDetection]
  );

  const leaveVoice = useCallback(() => {
    stopSpeakingDetection();

    peerConnections.current.forEach((pc, remoteUserId) => {
      pc.close();
      peerConnections.current.delete(remoteUserId);
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    setRemoteUsers(new Map());
    setMicOn(false);
    setSpeakerOn(true);
    setIsSpeaking(false);

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('voice:leave', { roomCode });
    }
  }, [roomCode, stopSpeakingDetection]);

  const setMicState = useCallback(
    async (on: boolean): Promise<boolean> => {
      if (!localStreamRef.current) {
        if (on) {
          const ok = await joinVoice(true, true);
          if (!ok) {
            setMicOn(false);
            return false;
          }
          return true;
        }
        return true;
      }

      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = on;
      setMicOn(on);

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('voice:mic', { roomCode, micOn: on });
      }

      if (!on && !speakerOn) leaveVoice();
      return true;
    },
    [roomCode, joinVoice, leaveVoice, speakerOn]
  );

  const setSpeakerState = useCallback(
    async (on: boolean): Promise<boolean> => {
      if (!localStreamRef.current) {
        if (on) {
          const ok = await joinVoice(false, true);
          if (!ok) {
            setSpeakerOn(true);
            return false;
          }
          return true;
        }
        return true;
      }

      setSpeakerOn(on);

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('voice:speaker', { roomCode, speakerOn: on });
      }

      if (!on && !micOn) leaveVoice();
      return true;
    },
    [roomCode, joinVoice, leaveVoice, micOn]
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('voice:user-joined', (data: { userId: string; nickname: string; micOn: boolean; speakerOn: boolean }) => {
      if (data.userId === userId) return;

      addVoiceUser({
        userId: data.userId,
        nickname: data.nickname,
        micOn: data.micOn,
        speakerOn: data.speakerOn,
        isSpeaking: false,
      });

      createPeerConnection(data.userId, data.nickname, true);
    });

    socket.on('voice:user-left', (data: { userId: string }) => {
      removePeerConnection(data.userId);
      removeVoiceUser(data.userId);
    });

    socket.on('voice:offer', async (data: { fromUserId: string; fromNickname: string; offer: RTCSessionDescriptionInit }) => {
      if (data.fromUserId === userId) return;

      const pc = createPeerConnection(data.fromUserId, data.fromNickname, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        flushCandidates(data.fromUserId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', {
          roomCode,
          targetUserId: data.fromUserId,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('voice:answer', async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          flushCandidates(data.fromUserId, pc);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    });

    socket.on('voice:ice-candidate', async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.fromUserId);
      if (!pc) return;
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        if (!pendingCandidates.current.has(data.fromUserId)) {
          pendingCandidates.current.set(data.fromUserId, []);
        }
        pendingCandidates.current.get(data.fromUserId)!.push(data.candidate);
      }
    });

    socket.on('voice:speaking-changed', (data: { userId: string; isSpeaking: boolean }) => {
      const next = useRoomStore
        .getState()
        .voiceUsers.map((u) => (u.userId === data.userId ? { ...u, isSpeaking: data.isSpeaking } : u));
      setVoiceUsers(next);
      duckVolume(next.some((u) => u.isSpeaking));
    });

    socket.on('voice:mic-changed', (data: { userId: string; micOn: boolean }) => {
      setVoiceUsers(
        useRoomStore.getState().voiceUsers.map((u) =>
          u.userId === data.userId ? { ...u, micOn: data.micOn } : u
        )
      );
    });

    socket.on('voice:speaker-changed', (data: { userId: string; speakerOn: boolean }) => {
      setVoiceUsers(
        useRoomStore.getState().voiceUsers.map((u) =>
          u.userId === data.userId ? { ...u, speakerOn: data.speakerOn } : u
        )
      );
    });

    socket.on('voice:users', (data: { users: Array<{ userId: string; nickname: string; micOn: boolean; speakerOn: boolean; isSpeaking: boolean }> }) => {
      data.users.forEach((u) => {
        addVoiceUser({
          userId: u.userId,
          nickname: u.nickname,
          micOn: u.micOn,
          speakerOn: u.speakerOn,
          isSpeaking: u.isSpeaking,
        });
      });
    });

    return () => {
      socket.off('voice:user-joined');
      socket.off('voice:user-left');
      socket.off('voice:offer');
      socket.off('voice:answer');
      socket.off('voice:ice-candidate');
      socket.off('voice:speaking-changed');
      socket.off('voice:mic-changed');
      socket.off('voice:speaker-changed');
      socket.off('voice:users');
    };
  }, [userId, roomCode, createPeerConnection, removePeerConnection, flushCandidates, addVoiceUser, removeVoiceUser, setVoiceUsers, duckVolume]);

  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    localStream,
    micOn,
    speakerOn,
    isSpeaking,
    joinVoice,
    leaveVoice,
    setMicState,
    setSpeakerState,
    remoteUsers,
  };
}
