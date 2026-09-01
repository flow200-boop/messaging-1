import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ActiveCall, CallType } from '../types';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { startRingtone, stopRingtone, playCallEndSound } from '../utils/audio';

interface CallContextType {
  activeCall: ActiveCall | null;
  incomingCall: {
    caller: { id: string; displayName: string; avatarUrl: string };
    channelId: string;
    callType: CallType;
  } | null;
  startCall: (partner: { id: string; displayName: string; avatarUrl: string }, channelId: string, callType: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    caller: { id: string; displayName: string; avatarUrl: string };
    channelId: string;
    callType: CallType;
  } | null>(null);

  const endCall = useCallback(() => {
    stopRingtone();
    playCallEndSound();
    if (activeCall && socket) {
      socket.emit('call:end', {
        targetUserId: activeCall.partner.id,
        channelId: activeCall.channelId
      });
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall, socket]);

  useEffect(() => {
    if (!socket) return;

    // Incoming call listener
    socket.on('call:incoming', (data: { caller: { id: string; displayName: string; avatarUrl: string }; channelId: string; callType: CallType }) => {
      // Don't show incoming if already in a call
      if (activeCall) {
        socket.emit('call:reject', { callerId: data.caller.id, channelId: data.channelId, reason: 'Busy on another call' });
        return;
      }
      setIncomingCall(data);
      startRingtone();
    });

    socket.on('call:accepted', () => {
      stopRingtone();
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
    });

    socket.on('call:rejected', () => {
      endCall();
    });

    socket.on('call:ended', () => {
      stopRingtone();
      playCallEndSound();
      setActiveCall(null);
      setIncomingCall(null);
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socket, activeCall, endCall]);

  const startCall = (partner: { id: string; displayName: string; avatarUrl: string }, channelId: string, callType: CallType) => {
    if (!socket || !user) return;

    setActiveCall({
      channelId,
      partner,
      callType,
      status: 'calling',
      isIncoming: false,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false
    });

    startRingtone();

    socket.emit('call:initiate', {
      recipientId: partner.id,
      channelId,
      callType
    });
  };

  const acceptCall = () => {
    if (!incomingCall || !socket) return;
    stopRingtone();

    const currentIncoming = incomingCall;
    setIncomingCall(null);

    setActiveCall({
      channelId: currentIncoming.channelId,
      partner: currentIncoming.caller,
      callType: currentIncoming.callType,
      status: 'connected',
      isIncoming: true,
      startTime: Date.now(),
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false
    });

    socket.emit('call:accept', {
      callerId: currentIncoming.caller.id,
      channelId: currentIncoming.channelId
    });
  };

  const rejectCall = () => {
    if (!incomingCall || !socket) return;
    stopRingtone();
    socket.emit('call:reject', {
      callerId: incomingCall.caller.id,
      channelId: incomingCall.channelId
    });
    setIncomingCall(null);
  };

  const toggleMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCamera = () => {
    setActiveCall((prev) => (prev ? { ...prev, isCameraOff: !prev.isCameraOff } : null));
  };

  const toggleScreenShare = () => {
    setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: !prev.isScreenSharing } : null));
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
