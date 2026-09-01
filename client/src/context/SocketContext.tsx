import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  isUserOnline: (userId: string) => boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const s = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('users:get_online');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('users:online_list', (ids: string[]) => {
      setOnlineUserIds(ids);
    });

    s.on('user:presence', (data: { userId: string; statusState: string; onlineUserIds?: string[] }) => {
      if (data.onlineUserIds) {
        setOnlineUserIds(data.onlineUserIds);
      } else {
        setOnlineUserIds((prev) => {
          if (data.statusState === 'offline') {
            return prev.filter((id) => id !== data.userId);
          } else if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id]);

  const isUserOnline = (userId: string) => onlineUserIds.includes(userId);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUserIds, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
