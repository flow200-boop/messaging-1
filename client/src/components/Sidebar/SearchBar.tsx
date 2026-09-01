import React, { useRef, useEffect } from 'react';
import { Search, X, MessageSquare, Hash, User, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, searchResults, isSearching, setActiveChannelId } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Can optionally close or clear if needed
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (channelId: string) => {
    setActiveChannelId(channelId);
    setSearchQuery('');
  };

  return (
    <div className="px-3 py-2.5 relative" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages, channels..."
          className="w-full bg-slate-900/90 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Live Search Results Overlay */}
      {searchQuery.trim() && (
        <div className="absolute top-full left-3 right-3 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 flex flex-col animate-slide-up backdrop-blur-xl">
          <div className="p-2 border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Search Results</span>
            {isSearching && <Loader2 className="w-3 h-3 animate-spin text-brand-400" />}
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/50">
            {searchResults.length === 0 && !isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching messages found for "{searchQuery}"
              </div>
            ) : (
              searchResults.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectResult(msg.channelId)}
                  className="p-2.5 hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-brand-400 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {msg.channelId}
                    </span>
                    <span className="text-slate-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-slate-300 line-clamp-2">
                    <span className="font-medium text-slate-200 mr-1">{msg.senderDisplayName}:</span>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
