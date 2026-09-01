import React from 'react';
import { Hash, Lock, Plus, Users } from 'lucide-react';
import { Channel } from '../../types';
import { useChat } from '../../context/ChatContext';

interface ChannelListProps {
  onOpenCreateChannel: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({ onOpenCreateChannel }) => {
  const { channels, activeChannel, setActiveChannelId } = useChat();

  const groupChannels = channels.filter((c) => c.isGroup === 1);

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <div className="flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>Channels</span>
        </div>
        <button
          onClick={onOpenCreateChannel}
          title="Create New Channel"
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        {groupChannels.map((ch) => {
          const isActive = activeChannel?.id === ch.id;
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
              <div className="flex items-center space-x-2 truncate">
                <span className={isActive ? 'text-brand-400' : hasUnread ? 'text-brand-300' : 'text-slate-500'}>
                  {ch.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                </span>
                <span className="truncate">{ch.name}</span>
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
    </div>
  );
};
