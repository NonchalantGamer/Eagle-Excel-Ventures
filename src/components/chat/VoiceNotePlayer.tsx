import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl: string;
  isMe?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ audioUrl, isMe = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatSecs = (sec: number) => {
    if (isNaN(sec) || sec === 0) return '0:00';
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`p-2.5 rounded-2xl flex items-center gap-3 w-64 max-w-full my-1 transition-all ${
        isMe
          ? 'bg-black/15 text-black'
          : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-white/10'
      }`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer ${
          isMe
            ? 'bg-black text-white hover:bg-zinc-900'
            : 'bg-[#F27D26] text-black hover:bg-[#e06d1a]'
        }`}
        title={isPlaying ? 'Pause Voice Memo' : 'Play Voice Memo'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualization Simulator */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-0.5 h-6">
          {[40, 75, 55, 90, 30, 85, 100, 60, 45, 95, 70, 80, 50, 65, 85, 40].map((height, idx) => {
            const barProgress = (idx / 16) * 100;
            const isPassed = progressPercent >= barProgress;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPassed
                    ? isMe
                      ? 'bg-black'
                      : 'bg-[#F27D26]'
                    : isMe
                    ? 'bg-black/30'
                    : 'bg-slate-300 dark:bg-zinc-700'
                }`}
                style={{
                  height: `${Math.max(15, height * (isPlaying ? 0.9 : 0.7))}%`
                }}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] opacity-75 font-mono">
          <span>{formatSecs(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5" />
            {formatSecs(duration || currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
};
