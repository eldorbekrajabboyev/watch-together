import { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from './ui/Avatar';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { cn } from '../utils/classnames';
import { REACTIONS } from '../utils/constants';
import type { Message, TypingUser } from '../types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, replyToId?: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (emoji: string, messageId?: string) => void;
  typingUsers: TypingUser[];
  currentUserId: string;
  isChatEnabled: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function shouldGroup(msg: Message, prev: Message | undefined): boolean {
  if (!prev) return false;
  if (prev.userId !== msg.userId) return false;
  if (prev.isDeleted || msg.isDeleted) return false;
  const gap = new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap < 2 * 60 * 1000;
}

function MessageItem({
  message,
  isGrouped,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  replyingTo,
}: {
  message: Message;
  isGrouped: boolean;
  currentUserId: string;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string) => void;
  onReaction: (emoji: string, messageId: string) => void;
  replyingTo: string | null;
}) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.userId === currentUserId;
  const isDeleted = message.isDeleted;
  const [showReactions, setShowReactions] = useState(false);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'group relative px-3 py-1 hover:bg-white/5 transition-colors',
        replyingTo === message.id && 'bg-primary-500/10 border-l-2 border-primary-500'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {!isGrouped && (
        <div className="flex items-start gap-2.5 pt-1">
          <Avatar
            src={message.user?.avatar ?? undefined}
            nickname={message.user?.nickname}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-dark-100 truncate">
                {message.user?.nickname ?? 'Unknown'}
              </span>
              <span className="text-[11px] text-dark-500 flex-shrink-0">
                {formatRelativeTime(message.createdAt)}
              </span>
            </div>
            {message.replyTo && !message.replyTo.isDeleted && (
              <div className="text-xs text-dark-400 mt-0.5 pl-2 border-l-2 border-dark-600 truncate">
                Replying to {message.replyTo.user?.nickname}: {message.replyTo.content}
              </div>
            )}
            {message.replyTo && message.replyTo.isDeleted && (
              <div className="text-xs text-dark-400 mt-0.5 pl-2 border-l-2 border-dark-600 italic">
                Replying to a deleted message
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn('ml-9', isGrouped && 'ml-9')}>
        {isDeleted ? (
          <p className="text-sm italic text-dark-500">[Deleted]</p>
        ) : isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="flex-1 bg-dark-700 border border-dark-500 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-primary-500"
              autoFocus
            />
            <Button size="sm" variant="primary" onClick={handleEdit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <p className="text-sm text-dark-200 break-words">
            {message.content}
            {message.isEdited && (
              <span className="text-dark-500 text-xs ml-1">(edited)</span>
            )}
          </p>
        )}
      </div>

      {showActions && !isDeleted && (
        <div className="absolute right-2 -top-3 flex items-center gap-0.5 bg-dark-800 border border-dark-600 rounded-lg shadow-lg px-1 py-0.5 z-10">
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 text-sm"
              title="Add reaction"
            >
              😊
            </button>
            {showReactions && (
              <div className="absolute bottom-full right-0 mb-1 flex items-center gap-0.5 bg-dark-800 border border-dark-600 rounded-lg shadow-xl px-2 py-1.5 z-20">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction(emoji, message.id);
                      setShowReactions(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onReply(message.id)}
            className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 text-sm"
            title="Reply"
          >
            ↩
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 text-sm"
                title="Edit"
              >
                ✏
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded hover:bg-red-600/20 text-dark-400 hover:text-red-400 text-sm"
                title="Delete"
              >
                🗑
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  typingUsers,
  currentUserId,
  isChatEnabled,
  onLoadMore,
  hasMore,
  isLoading,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      scrollToBottom();
    }
    prevCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, replyingTo ?? undefined);
    setInput('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const replyingToMessage = replyingTo ? messages.find((m) => m.id === replyingTo) : null;

  return (
    <div className="flex flex-col h-full bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
      </div>

      {!isChatEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-dark-500 text-sm italic">Chat is disabled</p>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-transparent">
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onLoadMore}
                  loading={isLoading}
                  className="text-dark-400"
                >
                  Load more
                </Button>
              </div>
            )}

            {isLoading && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            )}

            {messages.map((msg, i) => {
              const grouped = shouldGroup(msg, messages[i - 1]);
              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isGrouped={grouped}
                  currentUserId={currentUserId}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReply={(id) => setReplyingTo(id)}
                  onReaction={onAddReaction}
                  replyingTo={replyingTo}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="px-4 py-1.5 text-xs text-dark-400 flex items-center gap-1">
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].nickname} is typing`
                  : `${typingUsers.length} people are typing`}
              </span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-dark-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-dark-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-dark-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          )}

          <div className="px-3 py-2 border-t border-white/10">
            {replyingToMessage && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-dark-700/50 rounded-md text-xs">
                <span className="text-dark-400 truncate">
                  Replying to{' '}
                  <span className="text-primary-400 font-medium">
                    {replyingToMessage.user?.nickname}
                  </span>
                  : {replyingToMessage.content}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 text-dark-500 hover:text-dark-200 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 bg-dark-700/60 border border-dark-600 rounded-xl px-4 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-colors"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-xl px-4"
              >
                Send
              </Button>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="text-lg hover:scale-125 transition-transform p-0.5 rounded hover:bg-dark-700"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
