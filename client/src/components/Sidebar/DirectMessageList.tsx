import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Circle, UserPlus, Check, Sparkles } from 'lucide-react';
import { Channel, User, StatusState } from '../../types';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export const DirectMessageList: React.FC = () => {
  const { channels, activeChannel, setActiveChannelId, startDirectMessage } = useChat();
  const { isUserOnline } = useSocket();
  const { user, token } = useAuth();

  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  const dmChannels = channels.filter((c) => c.isGroup === 0);

  const statusColors: Record<StatusState, string> = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    busy: 'bg-rose-500',
    offline: 'bg-slate-600'
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users for DM', err);
    }
  };

  const handleStartDm = async (targetUser: User) => {
    try {
      const channelId = await startDirectMessage(targetUser);
      setActiveChannelId(channelId);
      setShowNewDmModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <div className="flex items-center space-x-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Direct Messages</span>
        </div>
        <button
          onClick={() => {
            fetchUsers();
            setShowNewDmModal(true);
          }}
          title="New Direct Message"
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        {dmChannels.map((ch) => {
          const recipient = ch.dmRecipient;
          if (!recipient) return null;

          const isActive = activeChannel?.id === ch.id;
          const isOnline = isUserOnline(recipient.id);
          const effectiveStatus: StatusState = isOnline ? (recipient.statusState || 'online') : 'offline';
          const hasUnread = (ch.unreadCount || 0) > 0;

          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 font-semibold border border-brand-500/30 shadow-sm'
                  : hasUnread
                  ? 'text-white font-semibold bg-slate-800/40 hover:bg-slate-800/70'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={recipient.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipient.username}`}
                    alt={recipient.displayName}
                    className="w-6 h-6 rounded-lg object-cover ring-1 ring-white/10"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-slate-950 ${
                      statusColors[effectiveStatus]
                    }`}
                  />
                </div>
                <div className="truncate text-left">
                  <span className="truncate block leading-tight">{recipient.displayName}</span>
                  {ch.lastMessage && (
                    <span className="text-[10px] text-slate-500 truncate block">
                      {ch.lastMessage.content || (ch.lastMessage.messageType === 'audio' ? '🎤 Voice note' : '📎 Attachment')}
                    </span>
                  )}
                </div>
              </div>

              {hasUnread && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-500 text-white min-w-5 text-center shadow-md animate-pulse-subtle">
                  {ch.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* New DM Modal */}
      {showNewDmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-400" /> Start Direct Message
              </h3>
              <button
                onClick={() => setShowNewDmModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              placeholder="Search user..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
              {availableUsers
                .filter(u => u.displayName.toLowerCase().includes(searchFilter.toLowerCase()) || u.username.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((u) => {
                  const isOnline = isUserOnline(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleStartDm(u)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/70 rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-xl object-cover" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{u.displayName}</div>
                          <div className="text-[11px] text-slate-400">{u.statusText || `@${u.username}`}</div>
                        </div>
                      </div>
                      <div className="text-brand-400 text-xs font-semibold hover:underline">Chat</div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
