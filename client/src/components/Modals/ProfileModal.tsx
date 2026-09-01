import React, { useState } from 'react';
import { X, User, Sparkles, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusState } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusText, setStatusText] = useState(user?.statusText || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [statusState, setStatusState] = useState<StatusState>(user?.statusState || 'online');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateProfile({
        displayName: displayName.trim(),
        statusText: statusText.trim(),
        avatarUrl,
        statusState
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Edit Profile & Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Avatar selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Avatar</label>
            <div className="flex items-center space-x-3 mb-3">
              <img
                src={avatarUrl || user.avatarUrl}
                alt="Preview"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-500 shadow-md"
              />
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    avatarUrl === url ? 'border-brand-500 scale-105 shadow-md shadow-brand-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Custom Status Quote */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Status Message</label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="e.g. 🚀 Shipping new features today!"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Status State */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Presence</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { state: 'online', label: '🟢 Online' },
                { state: 'away', label: '🟡 Away' },
                { state: 'busy', label: '🔴 Do Not Disturb' },
                { state: 'offline', label: '⚪ Invisible' }
              ].map((s) => (
                <button
                  key={s.state}
                  type="button"
                  onClick={() => setStatusState(s.state as StatusState)}
                  className={`px-3 py-2 rounded-xl text-left font-medium transition-all ${
                    statusState === s.state
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 font-semibold'
                      : 'bg-slate-950 border border-slate-800/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md shadow-brand-600/30 transition-all flex items-center space-x-1.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Changes</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
