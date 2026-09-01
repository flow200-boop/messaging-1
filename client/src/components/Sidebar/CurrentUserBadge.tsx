import React, { useState } from 'react';
import { Settings, LogOut, ChevronUp, Circle, Sparkles, Smile } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusState } from '../../types';

interface CurrentUserBadgeProps {
  onOpenProfileModal: () => void;
}

export const CurrentUserBadge: React.FC<CurrentUserBadgeProps> = ({ onOpenProfileModal }) => {
  const { user, updateProfile, logout } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (!user) return null;

  const statusColors: Record<StatusState, string> = {
    online: 'bg-emerald-500 ring-emerald-500/20',
    away: 'bg-amber-500 ring-amber-500/20',
    busy: 'bg-rose-500 ring-rose-500/20',
    offline: 'bg-slate-500 ring-slate-500/20'
  };

  const statusLabels: { state: StatusState; label: string; color: string }[] = [
    { state: 'online', label: 'Online', color: 'text-emerald-400' },
    { state: 'away', label: 'Away', color: 'text-amber-400' },
    { state: 'busy', label: 'Do Not Disturb', color: 'text-rose-400' },
    { state: 'offline', label: 'Invisible', color: 'text-slate-400' }
  ];

  const handleStatusChange = (state: StatusState) => {
    updateProfile({ statusState: state });
    setShowStatusMenu(false);
  };

  return (
    <div className="relative p-3 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
      {/* Quick Status Popover */}
      {showStatusMenu && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-slide-up backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Set Status</div>
          <div className="space-y-1">
            {statusLabels.map((s) => (
              <button
                key={s.state}
                onClick={() => handleStatusChange(s.state)}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  user.statusState === s.state ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s.state]}`} />
                <span className={s.color}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="flex items-center space-x-3 cursor-pointer group flex-1 min-w-0 pr-2"
        >
          <div className="relative flex-shrink-0">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
              alt={user.displayName}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 group-hover:ring-brand-500/50 transition-all shadow-md"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-slate-950 ${
                statusColors[user.statusState || 'online']
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-400 transition-colors">
                {user.displayName}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
              <span>{user.statusText || `@${user.username}`}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenProfileModal}
            title="Edit Profile & Preferences"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
