import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VoiceRecorderProps {
  onSendAudio: (fileUrl: string, durationSeconds: number) => Promise<void>;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendAudio, onCancel }) => {
  const { token } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingAndCleanUp();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Audio Analyzer for live visualizer
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, Math.max(barWidth - 2, 2), Math.max(barHeight, 4), [2]);
          ctx.fill();
          x += barWidth + 1;
        }

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Microphone access is required to record voice notes.');
      onCancel();
    }
  };

  const stopRecordingAndCleanUp = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSend = async () => {
    if (!mediaRecorderRef.current || !token) return;

    setIsUploading(true);
    const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const formData = new FormData();
        const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('ogg') ? '.ogg' : '.webm';
        formData.append('file', audioBlob, `voice-note-${Date.now()}${ext}`);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error('Failed to upload audio');
        const data = await res.json();

        await onSendAudio(data.fileUrl, recordingTime);
      } catch (err) {
        console.error('Failed to send voice note', err);
      } finally {
        setIsUploading(false);
      }
    };

    stopRecordingAndCleanUp();
  };

  const handleDiscard = () => {
    stopRecordingAndCleanUp();
    onCancel();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 w-full animate-slide-up shadow-xl">
      <button
        type="button"
        onClick={handleDiscard}
        title="Discard voice note"
        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording indicator & timer */}
      <div className="flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
        <span className="text-xs font-mono font-bold text-slate-200">{formatTimer(recordingTime)}</span>
      </div>

      {/* Live Audio Waveform Canvas */}
      <div className="flex-1 h-8 flex items-center justify-center">
        <canvas ref={canvasRef} width={240} height={32} className="w-full h-full" />
      </div>

      {/* Send voice note button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={isUploading}
        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>Send Voice</span>
            <Send className="w-3.5 h-3.5 ml-1" />
          </>
        )}
      </button>
    </div>
  );
};
