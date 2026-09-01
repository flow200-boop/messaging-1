import React from 'react';
import { Pin, X, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const PinnedDrawer: React.FC = () => {
  const { activeChannel, pinnedDrawerOpen, setPinnedDrawerOpen, togglePin } = useChat();

  if (!pinnedDrawerOpen || !activeChannel) return null;

  const pinned = activeChannel.pinnedMessages || [];

  return (
    <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl p-3 animate-slide-up z-20">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
          <Pin className="w-3.5 h-3.5" />
          <span>Pinned Messages ({pinned.length})</span>
        </div>
        <button
          onClick={() => setPinnedDrawerOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {pinned.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-500">
          No pinned messages yet. Hover over any message and click the pin icon to pin it here.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {pinned.map((m) => (
            <div
              key={m.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-start justify-between space-x-3 text-xs group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-slate-200">{m.senderDisplayName || 'User'}</span>
                  <span className="text-[10px] text-slate-500">{new Date(m.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="text-slate-300 break-words line-clamp-2">
                  {m.content}
                </div>
              </div>
              <button
                onClick={() => togglePin(m.id)}
                title="Unpin message"
                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
