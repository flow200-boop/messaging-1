import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import { ChatProvider, useChat } from './context/ChatContext';

import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatHeader } from './components/Chat/ChatHeader';
import { PinnedDrawer } from './components/Chat/PinnedDrawer';
import { MessageList } from './components/Chat/MessageList';
import { MessageInput } from './components/Chat/MessageInput';
import { ImageLightbox } from './components/Chat/ImageLightbox';

import { CreateChannelModal } from './components/Modals/CreateChannelModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { UserSwitcherModal } from './components/Modals/UserSwitcherModal';
import { CallModal } from './components/Modals/CallModal';
import { IncomingCallBanner } from './components/Modals/IncomingCallBanner';
import { MessageSquare, Loader2, Sparkles, UserPlus } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeChannel } = useChat();

  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userSwitcherModalOpen, setUserSwitcherModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-2xl shadow-brand-500/40 animate-bounce">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          <span>Starting Pulse Chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        onOpenCreateChannel={() => setCreateChannelModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onOpenUserSwitcher={() => setUserSwitcherModalOpen(true)}
      />

      {/* Main Conversation Stage */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/60 backdrop-blur-md relative overflow-hidden min-w-0">
        {activeChannel ? (
          <>
            <ChatHeader />
            <PinnedDrawer />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-brand-400 flex items-center justify-center shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Select a channel or direct message</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose from the sidebar on the left or create a new channel to begin communicating in real-time.
            </p>
          </div>
        )}
      </main>

      {/* Global Modals & Overlays */}
      <CreateChannelModal
        isOpen={createChannelModalOpen}
        onClose={() => setCreateChannelModalOpen(false)}
      />
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      <UserSwitcherModal
        isOpen={userSwitcherModalOpen}
        onClose={() => setUserSwitcherModalOpen(false)}
      />
      <CallModal />
      <IncomingCallBanner />
      <ImageLightbox />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <ChatProvider>
              <MainLayout />
            </ChatProvider>
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
