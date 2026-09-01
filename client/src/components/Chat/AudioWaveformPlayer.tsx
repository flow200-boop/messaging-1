import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, FastForward } from 'lucide-react';

interface AudioWaveformPlayerProps {
  src: string;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Generate 24 pseudo-random bar heights for visual waveform
  const waveformBars = useRef(
    Array.from({ length: 24 }, (_, i) => Math.sin(i * 0.4) * 0.4 + 0.6)
  ).current;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 max-w-sm w-full my-1 select-none shadow-sm">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md shadow-brand-600/30"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Waveform Visualization Bars */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative flex items-center gap-[3px] h-7 cursor-pointer py-1">
          {waveformBars.map((bar, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isFilled = barProgress <= progress;

            return (
              <div
                key={i}
                style={{ height: `${bar * 100}%` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-brand-400 shadow-sm shadow-brand-500/50'
                    : 'bg-slate-700 hover:bg-slate-600'
                } ${isPlaying && isFilled ? 'animate-pulse' : ''}`}
              />
            );
          })}

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback speed multiplier */}
      <button
        type="button"
        onClick={cyclePlaybackRate}
        className="text-[10px] font-bold px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        {playbackRate}x
      </button>
    </div>
  );
};
