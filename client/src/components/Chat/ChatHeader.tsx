import React from 'react';
import { Hash, Lock, Phone, Video, Pin, Users, Info, MoreVertical } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { StatusState } from '../../types';

interface ChatHeaderProps {
  onOpenMembersModal?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onOpenMembersModal }) => {
  const { activeChannel, pinnedDrawerOpen, setPinnedDrawerOpen } = useChat();
  const { isUserOnline } = useSocket();
  const { startCall } = useCall();

  if (!activeChannel) return null;

  const isDM = activeChannel.isGroup === 0;
  const recipient = activeChannel.dmRecipient;
  const isOnline = recipient ? isUserOnline(recipient.id) : false;
  const pinnedCount = activeChannel.pinnedMessages?.length || 0;

  const handleStartCall = (type: 'audio' | 'video') => {
    if (isDM && recipient) {
      startCall(
        {
          id: recipient.id,
          displayName: recipient.displayName,
          avatarUrl: recipient.avatarUrl
        },
        activeChannel.id,
        type
      );
    } else {
      // For group channel, start call with channel info
      startCall(
        {
          id: 'group-' + activeChannel.id,
          displayName: '#' + activeChannel.name,
          avatarUrl: ''
        },
        activeChannel.id,
        type
      );
    }
  };

  return (
    <div className="h-16 px-5 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center space-x-3 min-w-0">
        {isDM && recipient ? (
          <div className="relative flex-shrink-0">
            <img
              src={recipient.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipient.username}`}
              alt={recipient.displayName}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shadow-md"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-950 ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 ring-1 ring-slate-700/50 shadow-md">
            {activeChannel.isPrivate ? <Lock className="w-5 h-5 text-amber-400" /> : <Hash className="w-5 h-5 text-brand-400" />}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-100 truncate">
              {isDM && recipient ? recipient.displayName : `#${activeChannel.name}`}
            </h2>
            {isDM && recipient && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                {isOnline ? 'Active Now' : 'Offline'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {isDM && recipient ? (
              recipient.statusText || 'Direct Conversation'
            ) : (
              activeChannel.description || `${activeChannel.memberCount || 0} members`
            )}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1.5">
        {/* Voice Call */}
        <button
          onClick={() => handleStartCall('audio')}
          title="Start Voice Call"
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-brand-600 hover:text-white text-slate-300 transition-all border border-slate-700/40 shadow-sm"
        >
          <Phone className="w-4 h-4" />
        </button>

        {/* Video Call */}
        <button
          onClick={() => handleStartCall('video')}
          title="Start Video Call"
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-brand-600 hover:text-white text-slate-300 transition-all border border-slate-700/40 shadow-sm"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Pinned Messages Tray */}
        <button
          onClick={() => setPinnedDrawerOpen(prev => !prev)}
          title="Pinned Messages"
          className={`p-2 rounded-xl transition-all border ${
            pinnedDrawerOpen
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
              : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/40'
          }`}
        >
          <div className="relative">
            <Pin className="w-4 h-4" />
            {pinnedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                {pinnedCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
