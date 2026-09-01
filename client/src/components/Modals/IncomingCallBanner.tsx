import React from 'react';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallBanner: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed top-5 right-5 z-50 animate-bounce-short">
      <div className="bg-slate-900 border-2 border-brand-500 rounded-2xl p-4 shadow-2xl max-w-sm w-full flex items-center justify-between space-x-4 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={incomingCall.caller.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.caller.displayName}`}
              alt={incomingCall.caller.displayName}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-500 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-white">
              {isVideo ? <Video className="w-2.5 h-2.5" /> : <Phone className="w-2.5 h-2.5" />}
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white">{incomingCall.caller.displayName}</h4>
            <p className="text-[11px] text-brand-400 font-medium animate-pulse">
              Incoming {isVideo ? 'Video' : 'Voice'} Call...
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Decline */}
          <button
            onClick={rejectCall}
            title="Decline"
            className="p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            title="Accept Call"
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all font-bold text-xs flex items-center space-x-1"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
