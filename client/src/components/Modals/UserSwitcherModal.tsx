import React, { useState } from 'react';
import { X, Users, UserCheck, Plus, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { user, demoUsers, switchDemoUser, register } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSwitch = async (userId: string) => {
    await switchDemoUser(userId);
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || !newPassword) return;
    try {
      await register(newUsername.trim(), newDisplayName.trim(), newEmail.trim(), newPassword);
      setIsRegistering(false);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Registration failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Multi-User Persona Switcher</h3>
              <p className="text-[11px] text-slate-400">Switch instantly to test real-time chat & video calls across tabs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isRegistering ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Select Demo Persona
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoUsers.map((u) => {
                const isCurrent = u.id === user?.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitch(u.id)}
                    className={`flex items-start space-x-3 p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      isCurrent
                        ? 'bg-brand-600/20 border-brand-500/50 shadow-md shadow-brand-500/10'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white truncate group-hover:text-brand-300 transition-colors">
                          {u.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500 text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-brand-400 font-mono">@{u.username}</div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{u.statusText}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Want to test with a custom account?</span>
              <button
                onClick={() => setIsRegistering(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-brand-400" />
                <span>Create New User</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. john@pulse.dev"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-slate-400 hover:text-white"
              >
                Back to personas
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md shadow-brand-600/30"
              >
                Register & Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
