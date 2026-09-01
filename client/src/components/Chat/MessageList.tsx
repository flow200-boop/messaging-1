import React, { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { useChat } from '../../context/ChatContext';
import { MessageSquare, Hash, Loader2 } from 'lucide-react';

export const MessageList: React.FC = () => {
  const { messages, isLoadingMessages, typingUsers, activeChannel } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChannel?.id]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, typingUsers.length]);

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-brand-500/20');
      setTimeout(() => {
        el.classList.remove('bg-brand-500/20');
      }, 2000);
    }
  };

  const formatDateDivider = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500 mr-2" />
        <span className="text-xs font-medium">Loading messages...</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-1 select-text"
    >
      {/* Channel intro banner */}
      <div className="px-5 py-6 mb-4 text-center border-b border-slate-800/40">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
          <Hash className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">
          Welcome to #{activeChannel?.name || 'Channel'}!
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          {activeChannel?.description || 'This is the beginning of the conversation.'}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          No messages yet. Send a greeting or voice note to kick things off! 👋
        </div>
      ) : (
        messages.map((msg, index) => {
          const prev = messages[index - 1];
          const isSameSender =
            prev &&
            prev.senderId === msg.senderId &&
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

          const isNewDate =
            !prev ||
            new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {isNewDate && (
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800/80" />
                  </div>
                  <div className="relative px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {formatDateDivider(msg.createdAt)}
                  </div>
                </div>
              )}

              <MessageItem
                message={msg}
                isFirstInGroup={!isSameSender || isNewDate}
                onScrollToMessage={handleScrollToMessage}
              />
            </React.Fragment>
          );
        })
      )}

      {/* Typing indicator bubble */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-2 flex items-center space-x-2 text-xs text-slate-400 animate-fade-in">
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 shadow-sm">
            <span className="font-semibold text-brand-400">
              {typingUsers.map((u) => u.displayName).join(', ')}
            </span>
            <span>{typingUsers.length === 1 ? 'is typing' : 'are typing'}</span>
            <span className="flex space-x-1 ml-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
