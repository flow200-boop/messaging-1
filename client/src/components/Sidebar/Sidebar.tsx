import React from 'react';
import { SidebarHeader } from './SidebarHeader';
import { SearchBar } from './SearchBar';
import { ChannelList } from './ChannelList';
import { DirectMessageList } from './DirectMessageList';
import { CurrentUserBadge } from './CurrentUserBadge';

interface SidebarProps {
  onOpenCreateChannel: () => void;
  onOpenProfileModal: () => void;
  onOpenUserSwitcher: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreateChannel,
  onOpenProfileModal,
  onOpenUserSwitcher
}) => {
  return (
    <aside className="w-72 md:w-80 flex-shrink-0 flex flex-col h-full bg-slate-900/50 border-r border-slate-800/80 backdrop-blur-xl select-none z-20">
      <SidebarHeader onOpenUserSwitcher={onOpenUserSwitcher} />
      <SearchBar />

      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/40">
        <ChannelList onOpenCreateChannel={onOpenCreateChannel} />
        <DirectMessageList />
      </div>

      <CurrentUserBadge onOpenProfileModal={onOpenProfileModal} />
    </aside>
  );
};
