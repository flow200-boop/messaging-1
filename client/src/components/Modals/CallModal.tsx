import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Maximize2,
  Minimize2,
  Volume2,
  Sparkles
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';

export const CallModal: React.FC = () => {
  const { activeCall, endCall, toggleMute, toggleCamera, toggleScreenShare } = useCall();
  const { user } = useAuth();

  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeCall?.status === 'connected') {
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  // Request camera stream if video call
  useEffect(() => {
    if (activeCall?.callType === 'video' && !activeCall.isCameraOff) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((e) => {
          console.log('Video preview fallback (no camera attached or permission denied)', e);
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCall?.callType, activeCall?.isCameraOff]);

  if (!activeCall) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isVideo = activeCall.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full h-[520px] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Call Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              {isVideo ? <Video className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {activeCall.partner.displayName}
              </h3>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeCall.status === 'calling'
                  ? 'Calling...'
                  : `In Call • ${formatTimer(callDuration)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Call Stage */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
          {isVideo && localStream && !activeCall.isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center space-y-4 animate-fade-in text-center p-6">
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-brand-500/40 shadow-2xl shadow-brand-500/30">
                  <img
                    src={activeCall.partner.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeCall.partner.displayName}`}
                    alt={activeCall.partner.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {activeCall.status === 'calling' && (
                  <div className="absolute inset-0 rounded-3xl ring-4 ring-brand-400 animate-ping opacity-30 pointer-events-none" />
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">
                  {activeCall.partner.displayName}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {activeCall.status === 'calling'
                    ? 'Connecting audio & video streams...'
                    : `High Definition ${activeCall.callType.toUpperCase()} Stream`}
                </p>
              </div>

              {/* Animated audio wave bars */}
              {activeCall.status === 'connected' && (
                <div className="flex items-center space-x-1 h-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-brand-400 rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 16 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating Self Video Picture-in-Picture */}
          {isVideo && localStream && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <video
                ref={(el) => {
                  if (el && localStream) el.srcObject = localStream;
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Call Controls Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-center space-x-4 z-10 backdrop-blur-md">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            title={activeCall.isMuted ? 'Unmute Mic' : 'Mute Mic'}
            className={`p-3.5 rounded-2xl border transition-all ${
              activeCall.isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            title={activeCall.isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`p-3.5 rounded-2xl border transition-all ${
              activeCall.isCameraOff
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {activeCall.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={activeCall.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            className={`p-3.5 rounded-2xl border transition-all ${
              activeCall.isScreenSharing
                ? 'bg-brand-500 text-white border-brand-400 shadow-lg shadow-brand-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Hang Up Button */}
          <button
            onClick={endCall}
            title="End Call"
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 transition-transform active:scale-95 flex items-center space-x-2 px-5 font-bold text-xs"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End</span>
          </button>
        </div>
      </div>
    </div>
  );
};
