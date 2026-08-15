import React, { useRef, useEffect } from 'react';
import { 
  Plus, 
  Smile, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Radio, 
  X, 
  Package, 
  FileText,
  FileCheck
} from 'lucide-react';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { Product, Order, ChatAttachedProduct } from '../../types';

interface GoogleMessagesComposerProps {
  inputText: string;
  onChangeInput: (val: string) => void;
  onSend: (e?: React.FormEvent) => void;
  isSending: boolean;
  onOpenAttachmentSheet: () => void;
  onAttachImageClick: () => void;
  attachedImage: string | null;
  attachedProduct: Product | ChatAttachedProduct | null;
  selectedOrderRef: Order | null;
  onClearAttachments: () => void;
  onStartVoiceRecording: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onCloseEmojiPicker: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const GoogleMessagesComposer: React.FC<GoogleMessagesComposerProps> = ({
  inputText = '',
  onChangeInput,
  onSend,
  isSending,
  onOpenAttachmentSheet,
  onAttachImageClick,
  attachedImage,
  attachedProduct,
  selectedOrderRef,
  onClearAttachments,
  onStartVoiceRecording,
  showEmojiPicker,
  onToggleEmojiPicker,
  onCloseEmojiPicker,
  onSelectEmoji,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 110)}px`;
    }
  }, [inputText]);

  const hasContent = Boolean(
    (inputText || '').trim() || attachedImage || attachedProduct || selectedOrderRef
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent) {
      onStartVoiceRecording();
      return;
    }
    onSend(e);
  };

  return (
    <div className="bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-white/10 px-2.5 sm:px-3 py-2 sm:py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shrink-0 relative transition-colors">
      
      {/* Active Attachments Bar if any */}
      {(attachedProduct || attachedImage || selectedOrderRef) && (
        <div className="mb-2 p-1.5 sm:p-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-2 text-xs animate-fadeIn shadow-2xs">
          {attachedProduct && (
            <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
              <Package className="w-4 h-4 text-[#F27D26] shrink-0" />
              <span className="font-bold text-slate-800 dark:text-zinc-100 truncate text-[11px] sm:text-xs">
                {attachedProduct.name}
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] font-extrabold shrink-0">
                ${attachedProduct.price}
              </span>
            </div>
          )}
          {attachedImage && (
            <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
              <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-slate-800 dark:text-zinc-200 font-semibold truncate text-[11px] sm:text-xs">
                Photo attached
              </span>
              <img src={attachedImage} alt="Preview" className="w-6 h-6 rounded-md object-cover border border-slate-300 dark:border-white/20 shrink-0" />
            </div>
          )}
          {selectedOrderRef && (
            <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
              <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate text-[11px] sm:text-xs">
                PO #{selectedOrderRef.orderNumber}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClearAttachments}
            className="ml-auto p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 cursor-pointer shrink-0"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-2 sm:left-3 mb-2 z-50 max-w-[calc(100vw-16px)]">
          <ChatEmojiPicker
            onSelectEmoji={(emoji) => {
              onSelectEmoji(emoji);
              onCloseEmojiPicker();
            }}
            onClose={onCloseEmojiPicker}
          />
        </div>
      )}

      {/* Main Composer Row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
        
        {/* Left Attachment Button (+) */}
        <button
          type="button"
          onClick={onOpenAttachmentSheet}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs shrink-0 mb-0.5"
          title="Add attachment"
          aria-label="Add attachment"
        >
          <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
        </button>

        {/* Center Pill Input Container */}
        <div className="flex-1 min-w-0 bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl flex items-end px-2.5 sm:px-3.5 py-1 sm:py-1.5 shadow-2xs focus-within:border-[#F27D26]/60 focus-within:ring-2 focus-within:ring-[#F27D26]/10 transition-all">
          
          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your message..."
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none resize-none py-1 leading-relaxed font-sans max-h-24 sm:max-h-28"
          />

          {/* Action Icons Inside Pill */}
          <div className="flex items-center gap-0.5 shrink-0 ml-1 mb-0.5">
            
            {/* Emoji Smile Button */}
            <button
              type="button"
              onClick={onToggleEmojiPicker}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Add emoji"
              aria-label="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Gallery Image Attach Button */}
            <button
              type="button"
              onClick={onAttachImageClick}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Attach photo"
              aria-label="Attach photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Right Floating Action Button (FAB) */}
        <button
          type="submit"
          disabled={isSending}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer mb-0.5 ${
            hasContent
              ? 'bg-[#F27D26] text-black hover:bg-amber-500 font-bold'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
          }`}
          title={hasContent ? 'Send message' : 'Record voice memo'}
          aria-label={hasContent ? 'Send message' : 'Record voice memo'}
        >
          {hasContent ? (
            <Send className="w-4 h-4 stroke-[2.4]" />
          ) : (
            <Mic className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>

      </form>

    </div>
  );
};
