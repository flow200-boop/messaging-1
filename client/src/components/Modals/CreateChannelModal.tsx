import React, { useState, useEffect } from 'react';
import { X, Hash, Lock, Globe, Users, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose }) => {
  const { createChannel } = useChat();
  const { token, user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => setAvailableUsers(data.users || []))
        .catch((e) => console.error(e));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      await createChannel(name.trim(), true, isPrivate, description.trim(), selectedUserIds);
      setName('');
      setDescription('');
      setSelectedUserIds([]);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelect = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Create a Channel</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Channel Name</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-500 font-bold">#</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. design-feedback, sprint-42"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-brand-400" />}
              <div>
                <div className="font-semibold text-slate-200">
                  {isPrivate ? 'Private Channel' : 'Public Channel'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isPrivate ? 'Only invited members can join' : 'Anyone in the workspace can view & join'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isPrivate ? 'bg-brand-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {/* Add Members */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>Add Members</span>
              <span className="text-[10px] text-slate-500">{selectedUserIds.length} selected</span>
            </label>
            <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-xl p-1 bg-slate-950 space-y-1 custom-scrollbar">
              {availableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUserSelect(u.id)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <img src={u.avatarUrl} alt={u.displayName} className="w-5 h-5 rounded-md object-cover" />
                      <span className="text-xs">{u.displayName}</span>
                    </div>
                    <span className="text-[11px] font-bold">{isSelected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md shadow-brand-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Channel</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
