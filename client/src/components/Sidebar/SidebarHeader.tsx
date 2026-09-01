import React from 'react';
import { MessageSquare, Sparkles, Moon, Sun, Monitor, UserCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeMode } from '../../types';

interface SidebarHeaderProps {
  onOpenUserSwitcher: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onOpenUserSwitcher }) => {
  const { theme, setTheme } = useTheme();

  const themes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: 'midnight', label: 'Midnight Blue', icon: '🌌' },
    { id: 'dark', label: 'Dark Slate', icon: '🌑' },
    { id: 'emerald', label: 'Emerald Forest', icon: '🌿' },
    { id: 'light', label: 'Clean Light', icon: '☀️' }
  ];

  return (
    <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1">
              Pulse <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">v2.0</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        {/* Quick User Switcher Button */}
        <button
          onClick={onOpenUserSwitcher}
          title="Switch User Persona (Multi-user demo)"
          className="p-1.5 text-xs flex items-center space-x-1 font-medium bg-slate-800 hover:bg-brand-600/30 text-slate-300 hover:text-brand-300 rounded-lg border border-slate-700/60 transition-all shadow-sm"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Switch</span>
        </button>

        {/* Theme Selector Dropdown */}
        <div className="relative group">
          <button
            title="Change Theme"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/40"
          >
            {theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-brand-400" />}
          </button>
          
          <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-fade-in backdrop-blur-xl">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400">Appearance</div>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  theme === t.id ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
