import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { Message, TypingUser } from '../types';
import * as api from '../services/api';

const MESSAGES_PER_PAGE = 50;
const TYPING_DEBOUNCE_MS = 2000;

interface UseChatProps {
  roomCode: string;
  roomId: string;
}

export function useChat({ roomCode, roomId }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const userId = useAuthStore((s) => s.user?.id);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const result = await api.getMessages(roomId, MESSAGES_PER_PAGE, cursor);
      if (cursor) {
        setMessages((prev) => [...result.messages, ...prev]);
      } else {
        setMessages(result.messages || []);
      }
      setNextCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      fetchMessages();
    }
  }, [roomId, fetchMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (message: Message) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;

        const optimisticIndex = prev.findIndex(
          (m) => m.id.startsWith('temp-') && m.userId === message.userId && m.content === message.content
        );
        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = message;
          return updated;
        }

        return [...prev, message];
      });
    };

    const onEdited = (message: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...message } : m))
      );
    };

    const onDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isDeleted: true, content: '[Deleted]' } : m
        )
      );
    };

    const onTyping = (data: { userId: string; nickname: string }) => {
      if (data.userId === userId) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, nickname: data.nickname }];
      });
    };

    const onStopTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    socket.on('chat:new-message', onNewMessage);
    socket.on('chat:message-edited', onEdited);
    socket.on('chat:message-deleted', onDeleted);
    socket.on('chat:user-typing', onTyping);
    socket.on('chat:user-stop-typing', onStopTyping);

    return () => {
      socket.off('chat:new-message', onNewMessage);
      socket.off('chat:message-edited', onEdited);
      socket.off('chat:message-deleted', onDeleted);
      socket.off('chat:user-typing', onTyping);
      socket.off('chat:user-stop-typing', onStopTyping);
    };
  }, [userId]);

  const sendMessage = useCallback(
    (content: string, type: string = 'text', replyToId?: string) => {
      const socket = getSocket();
      if (!socket?.connected || !content.trim()) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const user = useAuthStore.getState().user;

      const optimisticMessage: Message = {
        id: tempId,
        content: content.trim(),
        type,
        replyToId: replyToId || null,
        isEdited: false,
        isDeleted: false,
        userId: userId || '',
        roomId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: user!,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      socket.emit('chat:message', {
        roomCode,
        content: content.trim(),
        replyToId,
      });

      if (isTypingRef.current) {
        socket.emit('chat:stop-typing', { roomCode });
        isTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [roomCode, roomId, userId]
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('chat:edit', { roomCode, messageId, content });
      }
    },
    [roomCode]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('chat:delete', { roomCode, messageId });
      }
    },
    [roomCode]
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('chat:reaction', { roomCode, messageId, emoji });
      }
    },
    [roomCode]
  );

  const handleTypingInput = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('chat:typing', { roomCode });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { roomCode });
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, [roomCode]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !nextCursor) return;
    fetchMessages(nextCursor);
  }, [hasMore, isLoading, nextCursor, fetchMessages]);

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    typingUsers,
    isLoading,
    hasMore,
    loadMore,
    handleTypingInput,
  };
}
