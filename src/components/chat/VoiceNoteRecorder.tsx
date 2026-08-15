import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Radio } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioDataUrl: string, durationSec: number) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopAndCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or unsupported:', err);
      onCancel();
    }
  };

  const stopAndCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFinishRecording = () => {
    stopAndCleanup();
    setIsRecording(false);
    setAudioDuration(seconds);
  };

  const handleSend = () => {
    if (audioUrl) {
      onSendVoiceNote(audioUrl, audioDuration || seconds || 1);
    }
  };

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#F27D26]/10 dark:bg-[#F27D26]/15 border border-[#F27D26]/30 rounded-2xl animate-fadeIn text-xs">
      <div className="flex items-center gap-2 px-2 text-[#F27D26] font-bold">
        <Radio className="w-4 h-4 animate-pulse text-red-500" />
        <span>{isRecording ? 'Recording Voice Memo...' : 'Voice Memo Ready'}</span>
        <span className="font-mono bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-lg text-slate-900 dark:text-zinc-100">
          {formatSecs(seconds)}
        </span>
      </div>

      {isRecording ? (
        <button
          type="button"
          onClick={handleFinishRecording}
          className="ml-auto p-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
          title="Stop Recording"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>
      ) : (
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Discard Recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!audioUrl}
            className="py-1.5 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            title="Send Voice Memo"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Memo</span>
          </button>
        </div>
      )}

      {isRecording && (
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
