import React from 'react';
import { playPopSound } from '../../utils/chatAudio';

interface ChatEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  quickMode?: boolean;
  isOpen?: boolean;
}

const COMMON_EMOJIS = [
  '👍', '❤️', '🔥', '🚀', '📦', '👏', '✅', '💼', 
  '🚚', '💰', '🤝', '🏷️', '⚡', '💯', '✨', '🙏', 
  '😊', '🎉', '📋', '📞', '🏭', '📈', '👌', '⭐'
];

export const ChatEmojiPicker: React.FC<ChatEmojiPickerProps> = ({ onSelectEmoji, onClose, quickMode }) => {
  const handleEmojiClick = (emoji: string) => {
    playPopSound();
    onSelectEmoji(emoji);
    if (onClose) onClose();
  };

  return (
    <div className={`p-2.5 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
      quickMode ? 'flex items-center gap-1.5' : 'w-64 grid grid-cols-6 gap-1.5'
    }`}>
      {COMMON_EMOJIS.slice(0, quickMode ? 6 : COMMON_EMOJIS.length).map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleEmojiClick(emoji)}
          className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-base transition-transform hover:scale-125 active:scale-95"
          title={`Add ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
