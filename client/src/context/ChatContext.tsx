import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Channel, Message, User } from '../types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { playMessageSound, playSendSound, playReactionSound } from '../utils/audio';

interface ChatContextType {
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  isLoadingMessages: boolean;
  typingUsers: { id: string; displayName: string; avatarUrl?: string }[];
  replyingTo: Message | null;
  pinnedDrawerOpen: boolean;
  activeLightboxImage: string | null;
  searchQuery: string;
  searchResults: Message[];
  isSearching: boolean;
  setActiveChannelId: (id: string) => void;
  setReplyingTo: (msg: Message | null) => void;
  setPinnedDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setActiveLightboxImage: (url: string | null) => void;
  setSearchQuery: (q: string) => void;
  sendMessage: (content: string, messageType?: 'text' | 'image' | 'audio' | 'file', fileUrl?: string, fileName?: string, fileSize?: number) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  createChannel: (name: string, isGroup: boolean, isPrivate: boolean, description?: string, memberIds?: string[], recipientId?: string) => Promise<string>;
  startDirectMessage: (recipient: User) => Promise<string>;
  sendTyping: (isTyping: boolean) => void;
  refreshChannels: () => Promise<void>;
  addMembersToChannel: (channelId: string, userIds: string[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelIdState] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ id: string; displayName: string; avatarUrl?: string }[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedDrawerOpen, setPinnedDrawerOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const typingTimeoutRef = useRef<Record<string, number>>({});
  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;

  // Fetch channels list
  const fetchChannels = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  }, [token]);

  // Fetch active channel details and messages
  const loadChannel = useCallback(async (channelId: string) => {
    if (!token) return;
    try {
      setIsLoadingMessages(true);
      const [channelRes, messagesRes] = await Promise.all([
        fetch(`/api/channels/${channelId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/messages/${channelId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (channelRes.ok) {
        const cData = await channelRes.json();
        setActiveChannel(cData.channel);
      }

      if (messagesRes.ok) {
        const mData = await messagesRes.json();
        setMessages(mData.messages || []);
      }

      // Mark channel as read
      fetch(`/api/channels/${channelId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear unread count locally in channels list
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('Failed to load channel details and messages', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchChannels().then(() => {
        // Default to first channel if none selected
        setChannels(prev => {
          if (prev.length > 0 && !activeChannelIdRef.current) {
            setActiveChannelIdState(prev[0].id);
          }
          return prev;
        });
      });
    }
  }, [token, fetchChannels]);

  useEffect(() => {
    if (activeChannelId) {
      loadChannel(activeChannelId);
      setTypingUsers([]);
      setReplyingTo(null);

      if (socket) {
        socket.emit('channel:join', activeChannelId);
      }
    }

    return () => {
      if (socket && activeChannelId) {
        socket.emit('channel:leave', activeChannelId);
      }
    };
  }, [activeChannelId, loadChannel, socket]);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    // Real-time new message
    socket.on('message:new', (msg: Message) => {
      const isCurrentChannel = msg.channelId === activeChannelIdRef.current;
      const isOwnMessage = msg.senderId === user?.id;

      if (isCurrentChannel) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (!isOwnMessage) {
          playMessageSound();
          // Auto mark as read if channel is active
          if (token) {
            fetch(`/api/channels/${msg.channelId}/read`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } else {
        if (!isOwnMessage) {
          playMessageSound();
        }
      }

      // Update channel last message and unread count in sidebar
      setChannels((prev) =>
        prev.map((c) => {
          if (c.id === msg.channelId) {
            return {
              ...c,
              lastMessage: {
                id: msg.id,
                content: msg.content,
                messageType: msg.messageType,
                fileName: msg.fileName || undefined,
                createdAt: msg.createdAt,
                senderId: msg.senderId,
                senderName: msg.senderDisplayName || 'User'
              },
              unreadCount: isCurrentChannel || isOwnMessage ? 0 : (c.unreadCount || 0) + 1
            };
          }
          return c;
        })
      );
    });

    // Message edited
    socket.on('message:updated', (data: { messageId: string; content: string; isEdited: number; channelId: string }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, content: data.content, isEdited: 1 } : m))
        );
      }
    });

    // Message deleted
    socket.on('message:deleted', (data: { messageId: string; channelId: string }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    });

    // Message pin toggled
    socket.on('message:pin_toggled', (data: { messageId: string; isPinned: number; channelId: string }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
        );
        // Refresh active channel to update pinned drawer
        if (activeChannelIdRef.current) {
          loadChannel(activeChannelIdRef.current);
        }
      }
    });

    // Reactions changed
    socket.on('reaction:changed', (data: { messageId: string; channelId: string; reactions: Message['reactions'] }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    });

    // Typing update
    socket.on('typing:update', (data: { channelId: string; user: { id: string; displayName: string; avatarUrl?: string }; isTyping: boolean }) => {
      if (data.channelId !== activeChannelIdRef.current || data.user.id === user?.id) return;

      if (data.isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });

        // Clear existing timer if any
        if (typingTimeoutRef.current[data.user.id]) {
          clearTimeout(typingTimeoutRef.current[data.user.id]);
        }

        // Auto remove typing after 3.5 seconds
        typingTimeoutRef.current[data.user.id] = window.setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== data.user.id));
        }, 3500);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.id !== data.user.id));
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('message:pin_toggled');
      socket.off('reaction:changed');
      socket.off('typing:update');
    };
  }, [socket, user?.id, token, loadChannel]);

  // Global search effect
  useEffect(() => {
    if (!searchQuery.trim() || !token) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.messages || []);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const setActiveChannelId = (id: string) => {
    setActiveChannelIdState(id);
  };

  const sendTyping = (isTyping: boolean) => {
    if (!socket || !activeChannelId) return;
    if (isTyping) {
      socket.emit('typing:start', { channelId: activeChannelId });
    } else {
      socket.emit('typing:stop', { channelId: activeChannelId });
    }
  };

  const sendMessage = async (
    content: string,
    messageType: 'text' | 'image' | 'audio' | 'file' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
  ) => {
    if (!activeChannelId || !token) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channelId: activeChannelId,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize,
          replyToId: replyingTo ? replyingTo.id : null
        })
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      playSendSound();

      // Emit to socket
      if (socket) {
        socket.emit('message:send', data.message);
      }

      // Add to local state if not already received
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });

      setReplyingTo(null);
      sendTyping(false);
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });

    if (!res.ok) throw new Error('Failed to edit message');
    const data = await res.json();

    if (socket && activeChannelId) {
      socket.emit('message:edited', {
        messageId,
        channelId: activeChannelId,
        content: data.content,
        isEdited: 1
      });
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: data.content, isEdited: 1 } : m))
    );
  };

  const deleteMessage = async (messageId: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to delete message');

    if (socket && activeChannelId) {
      socket.emit('message:deleted', { messageId, channelId: activeChannelId });
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const togglePin = async (messageId: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to toggle pin');
    const data = await res.json();

    if (socket && activeChannelId) {
      socket.emit('message:pinned', {
        messageId,
        channelId: activeChannelId,
        isPinned: data.isPinned
      });
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isPinned: data.isPinned } : m))
    );

    if (activeChannelId) {
      loadChannel(activeChannelId);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!token) return;
    playReactionSound();

    const res = await fetch(`/api/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ emoji })
    });

    if (!res.ok) throw new Error('Failed to toggle reaction');
    const data = await res.json();

    if (socket && activeChannelId) {
      socket.emit('reaction:update', {
        messageId,
        channelId: activeChannelId,
        reactions: data.reactions
      });
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
    );
  };

  const createChannel = async (
    name: string,
    isGroup: boolean,
    isPrivate: boolean,
    description?: string,
    memberIds?: string[],
    recipientId?: string
  ): Promise<string> => {
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, isGroup, isPrivate, description, memberIds, recipientId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create channel');
    }

    const data = await res.json();
    await fetchChannels();
    setActiveChannelIdState(data.channelId);
    return data.channelId;
  };

  const startDirectMessage = async (recipient: User): Promise<string> => {
    if (!token) throw new Error('Not authenticated');
    return createChannel('', false, true, '', [], recipient.id);
  };

  const addMembersToChannel = async (channelId: string, userIds: string[]) => {
    if (!token) return;
    const res = await fetch(`/api/channels/${channelId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userIds })
    });

    if (!res.ok) throw new Error('Failed to add members');
    loadChannel(channelId);
  };

  return (
    <ChatContext.Provider
      value={{
        channels,
        activeChannel,
        messages,
        isLoadingMessages,
        typingUsers,
        replyingTo,
        pinnedDrawerOpen,
        activeLightboxImage,
        searchQuery,
        searchResults,
        isSearching,
        setActiveChannelId,
        setReplyingTo,
        setPinnedDrawerOpen,
        setActiveLightboxImage,
        setSearchQuery,
        sendMessage,
        editMessage,
        deleteMessage,
        togglePin,
        toggleReaction,
        createChannel,
        startDirectMessage,
        sendTyping,
        refreshChannels: fetchChannels,
        addMembersToChannel
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};
