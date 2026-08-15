import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Send, 
  MessageSquare, 
  Headphones, 
  Clock, 
  Check,
  CheckCheck, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Maximize2, 
  Download, 
  Search, 
  Package, 
  Trash2, 
  ChevronDown,
  Mic,
  FileText,
  UploadCloud,
  Truck,
  CreditCard,
  PhoneCall,
  ExternalLink,
  Reply,
  Copy,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getBrandLogo } from '../constants/branding';
import { 
  sendMessageInDatabase, 
  subscribeToCustomerThread, 
  markThreadAsRead, 
  toggleMessageReaction, 
  deleteMessageInDatabase,
  broadcastTypingStatus, 
  subscribeToTypingStatus, 
  sendPresenceHeartbeat,
  subscribeToPresence,
  generateChatTranscriptText,
  isStaffInternalNote,
  filterCustomerVisibleMessages
} from '../services/messageService';
import { Message, Product, ChatAttachedProduct } from '../types';
import { 
  playSendSound, 
  playReceiveSound, 
  isChatSoundEnabled, 
  setChatSoundEnabled 
} from '../utils/chatAudio';
import { 
  hasMessagePopupBeenDispatched, 
  dispatchMessagePopupOnce, 
  seedInitialLoadedMessageIds 
} from '../utils/messagePopupTracker';
import { 
  renderFormattedChatMessage, 
  formatChatDateGroup, 
  isDifferentChatDay 
} from '../utils/chatFormatters';
import { ChatProductCard } from './chat/ChatProductCard';
import { ChatQuoteCard } from './chat/ChatQuoteCard';
import { ChatEmojiPicker } from './chat/ChatEmojiPicker';
import { ProductSelectorModal } from './chat/ProductSelectorModal';
import { VoiceNoteRecorder } from './chat/VoiceNoteRecorder';
import { VoiceNotePlayer } from './chat/VoiceNotePlayer';
import { SlashCommandMenu, SlashCommandItem } from './chat/SlashCommandMenu';
import { useToast } from './Toast';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductInquiry?: Product | null;
  initialCustomMessage?: string | null;
  onOpenAuth: () => void;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  isOpen,
  onClose,
  initialProductInquiry,
  initialCustomMessage,
  onOpenAuth
}) => {
  const { currentUser, userProfile } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  // Persistent Guest ID for non-logged-in visitors so they can immediately chat
  const [guestId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'guest_default';
    let gId = localStorage.getItem('ee_guest_chat_id');
    if (!gId) {
      gId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('ee_guest_chat_id', gId);
    }
    return gId;
  });

  const activeCustomerId = currentUser?.uid || guestId;
  const activeCustomerName = userProfile?.displayName || currentUser?.displayName || (currentUser ? 'Wholesale Buyer' : 'Guest Buyer');
  const activeCustomerEmail = currentUser?.email || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [viewMode, setViewMode] = useState<'modal' | 'docked'>('modal');
  const [soundEnabled, setSoundEnabled] = useState(isChatSoundEnabled);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useModalFocusLock(isOpen && viewMode === 'modal', onClose);
  
  // Modals, attachments & tools
  const [attachedProduct, setAttachedProduct] = useState<ChatAttachedProduct | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeMobileActionMsgId, setActiveMobileActionMsgId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');

  // Typing & Presence state
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const [typingAgentName, setTypingAgentName] = useState<string>('Operations Desk');
  const [agentsOnline, setAgentsOnline] = useState<number>(1);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Safe inner container scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Find latest active Pro-Forma Quote in thread
  const latestQuote = useMemo(() => {
    const quoteMsgs = messages.filter(m => !!m.quoteData);
    return quoteMsgs.length > 0 ? quoteMsgs[quoteMsgs.length - 1].quoteData : null;
  }, [messages]);

  // Find the last customer message to show live inquiry review status
  const lastCustomerMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId === activeCustomerId || m.senderRole === 'customer') {
        return m.id;
      }
    }
    return null;
  }, [messages, activeCustomerId]);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
    showToast(next ? 'Chat sound alerts enabled' : 'Chat sound alerts muted', 'info');
  };

  // 1. Subscribe to real-time messages for active customer (works for both logged in & guests)
  const seenCustomerMsgIdsRef = useRef<Set<string>>(new Set());
  const isCustomerInitialRef = useRef<boolean>(true);

  useEffect(() => {
    if (!isOpen || !activeCustomerId) return;

    seenCustomerMsgIdsRef.current = new Set();
    isCustomerInitialRef.current = true;

    const unsubscribe = subscribeToCustomerThread(activeCustomerId, (msgs) => {
      const visibleMsgs = filterCustomerVisibleMessages(msgs);
      setMessages((prev) => {
        // Keep optimistic messages that haven't been matched yet by id or content
        const pendingOptimistic = prev.filter(
          p => p.id.startsWith('msg_opt_') && 
          !visibleMsgs.some(v => v.id === p.id || (v.message === p.message && Math.abs(new Date(v.createdAt).getTime() - new Date(p.createdAt).getTime()) < 20000))
        );
        return [...visibleMsgs, ...pendingOptimistic];
      });
      markThreadAsRead(activeCustomerId, 'customer');

      if (isCustomerInitialRef.current) {
        visibleMsgs.forEach(m => seenCustomerMsgIdsRef.current.add(m.id));
        seedInitialLoadedMessageIds(visibleMsgs.map(m => m.id));
        isCustomerInitialRef.current = false;
        return;
      }

      const newAdminMsgs: Message[] = [];
      for (const m of visibleMsgs) {
        const isAlreadyKnown = seenCustomerMsgIdsRef.current.has(m.id) || hasMessagePopupBeenDispatched(m.id);
        if (!isAlreadyKnown) {
          seenCustomerMsgIdsRef.current.add(m.id);
          if (m.senderRole === 'admin' && !isStaffInternalNote(m)) {
            newAdminMsgs.push(m);
          }
        }
      }

      if (newAdminMsgs.length > 0) {
        newAdminMsgs.forEach(msg => {
          dispatchMessagePopupOnce(msg.id, () => {
            playReceiveSound();
          });
        });
        scrollToBottom('smooth');
      }
    });

    return () => unsubscribe();
  }, [isOpen, activeCustomerId]);

  // 2. Subscribe to admin typing events
  useEffect(() => {
    if (!isOpen || !activeCustomerId) return;
    const unsub = subscribeToTypingStatus(activeCustomerId, 'admin', (isTyping, senderName) => {
      setAdminIsTyping(isTyping);
      if (senderName) setTypingAgentName(senderName);
      if (isTyping) {
        scrollToBottom('smooth');
      }
    });
    return () => unsub();
  }, [isOpen, activeCustomerId]);

  // Ensure scroll down when admin starts typing
  useEffect(() => {
    if (adminIsTyping) {
      scrollToBottom('smooth');
    }
  }, [adminIsTyping]);

  // 3. Heartbeat presence tracking
  useEffect(() => {
    if (!isOpen || !activeCustomerId) return;
    sendPresenceHeartbeat(activeCustomerId, 'customer', activeCustomerName, activeCustomerId);
    const interval = setInterval(() => {
      sendPresenceHeartbeat(activeCustomerId, 'customer', activeCustomerName, activeCustomerId);
    }, 20000);

    const unsubPresence = subscribeToPresence((data) => {
      setAgentsOnline(Math.max(1, data.agentsOnline));
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [isOpen, activeCustomerId, activeCustomerName]);

  // Handle initial product inquiry attachment
  useEffect(() => {
    if (initialProductInquiry && isOpen) {
      setAttachedProduct({
        id: initialProductInquiry.id,
        name: initialProductInquiry.name,
        sku: initialProductInquiry.sku,
        price: initialProductInquiry.price,
        image: initialProductInquiry.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
        category: initialProductInquiry.category,
        moq: initialProductInquiry.minOrderQty,
        unit: initialProductInquiry.unit || initialProductInquiry.packagingUnit || 'Carton'
      });
      setInputText(`Hello Operations Desk, I would like to request a formal bulk quotation and lead time for SKU: ${initialProductInquiry.sku} (${initialProductInquiry.name}).`);
    } else if (initialCustomMessage && isOpen) {
      setInputText(initialCustomMessage);
    }
  }, [initialProductInquiry, initialCustomMessage, isOpen]);

  // Auto scroll to latest conversation exchange on open or message updates
  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, adminIsTyping]);

  if (!isOpen) return null;

  // Filter messages by search and enforce customer-visible security
  const filteredMessages = messages.filter(m => {
    if (isStaffInternalNote(m)) return false;
    const cleanSearch = (searchQuery || '').trim();
    if (!cleanSearch) return true;
    const q = cleanSearch.toLowerCase();
    return (
      (m.message || '').toLowerCase().includes(q) ||
      (m.attachedProduct && (m.attachedProduct.name || '').toLowerCase().includes(q)) ||
      (m.attachedProduct && (m.attachedProduct.sku || '').toLowerCase().includes(q))
    );
  });

  // Handle text typing with typing broadcast
  const handleInputChange = (val: string) => {
    setInputText(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashQuery(val.substring(1));
    } else {
      setShowSlashMenu(false);
    }

    if (activeCustomerId) {
      broadcastTypingStatus(activeCustomerId, 'customer', true, activeCustomerName);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        broadcastTypingStatus(activeCustomerId, 'customer', false, activeCustomerName);
      }, 2000);
    }
  };

  // Slash commands
  const handleSelectSlashCommand = (cmd: SlashCommandItem) => {
    setShowSlashMenu(false);
    if (cmd.id === 'product') {
      setIsProductSelectorOpen(true);
      setInputText('');
    } else if (cmd.id === 'freight') {
      setInputText('What are your current sea freight container rates and transit times to Lagos / Douala port?');
    } else if (cmd.id === 'net30') {
      setInputText('I would like to inquire about eligibility and requirements for Net 30 Commercial Billing terms.');
    } else if (cmd.id === 'quote') {
      setInputText('Could you generate an official Pro-Forma Quotation with CIF shipping terms?');
    } else if (cmd.id === 'clear') {
      setInputText('');
      setAttachedProduct(null);
      setAttachedImage(null);
      setReplyingTo(null);
    }
    textareaRef.current?.focus();
  };

  // Clipboard Paste for screenshots
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast('Pasted image must be under 5MB', 'error');
            return;
          }
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result as string;
            setAttachedImage(dataUrl);
            showToast('Screenshot attached from clipboard!', 'success');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image file must be under 5MB', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setAttachedImage(uploadEvent.target?.result as string);
          showToast('Image dropped & attached!', 'success');
        };
        reader.readAsDataURL(file);
      } else {
        showToast('Please drop standard image files (PNG, JPG, WebP)', 'info');
      }
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = (inputText || '').trim();
    if (!activeCustomerId || (!cleanText && !attachedProduct && !attachedImage)) return;

    const textToSend = cleanText || (attachedProduct ? `Inquiring about ${attachedProduct.name} (${attachedProduct.sku})` : 'Attached file transmission');
    const attachmentsToSend = attachedImage ? [attachedImage] : [];
    const productToSend = attachedProduct || undefined;
    const replyToSend = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      senderRole: replyingTo.senderRole,
      message: replyingTo.message,
      messageType: replyingTo.messageType
    } : undefined;

    const optimisticId = `msg_opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: Message = {
      id: optimisticId,
      threadId: activeCustomerId,
      customerId: activeCustomerId,
      customerName: activeCustomerName,
      customerEmail: activeCustomerEmail,
      senderId: activeCustomerId,
      senderName: activeCustomerName,
      senderRole: 'customer',
      message: textToSend,
      attachments: attachmentsToSend,
      attachedProduct: productToSend,
      replyTo: replyToSend,
      reactions: {},
      isInternalNote: false,
      messageType: productToSend ? 'product_card' : 'text',
      readByAdmin: false,
      readByCustomer: true,
      deliveryStatus: 'delivered',
      deliveredAt: nowIso,
      createdAt: nowIso
    };

    // Instant optimistic 0ms render
    setMessages(prev => [...prev.filter(m => m.id !== optimisticId), optimisticMsg]);
    playSendSound();
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 10);

    setInputText('');
    setAttachedProduct(null);
    setAttachedImage(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setShowSlashMenu(false);

    broadcastTypingStatus(activeCustomerId, 'customer', false, activeCustomerName);
    setIsSending(true);

    try {
      const realMsg = await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        customerEmail: activeCustomerEmail,
        senderId: activeCustomerId,
        senderName: activeCustomerName,
        senderRole: 'customer',
        message: textToSend,
        attachments: attachmentsToSend,
        attachedProduct: productToSend,
        replyTo: replyToSend,
        messageType: productToSend ? 'product_card' : 'text'
      });

      if (realMsg && realMsg.id) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m));
      }
    } catch (err) {
      showToast('Failed to send message. Please retry.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Send voice note
  const handleSendVoiceNote = async (audioDataUrl: string, durationSec: number) => {
    if (!activeCustomerId) return;
    setIsRecordingVoice(false);

    const optimisticId = `msg_opt_vn_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: Message = {
      id: optimisticId,
      threadId: activeCustomerId,
      customerId: activeCustomerId,
      customerName: activeCustomerName,
      customerEmail: activeCustomerEmail,
      senderId: activeCustomerId,
      senderName: activeCustomerName,
      senderRole: 'customer',
      message: `Voice Note (${Math.round(durationSec)}s)`,
      voiceNote: {
        url: audioDataUrl,
        duration: durationSec
      },
      reactions: {},
      isInternalNote: false,
      messageType: 'voice_note',
      readByAdmin: false,
      readByCustomer: true,
      deliveryStatus: 'delivered',
      deliveredAt: nowIso,
      createdAt: nowIso
    };

    setMessages(prev => [...prev.filter(m => m.id !== optimisticId), optimisticMsg]);
    playSendSound();
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 10);

    try {
      const realMsg = await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        customerEmail: activeCustomerEmail,
        senderId: activeCustomerId,
        senderName: activeCustomerName,
        senderRole: 'customer',
        message: `Voice Note (${Math.round(durationSec)}s)`,
        voiceNote: {
          url: audioDataUrl,
          duration: durationSec
        },
        messageType: 'voice_note'
      });
      if (realMsg && realMsg.id) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m));
      }
      showToast('Voice memo transmitted to operations desk', 'success');
    } catch (err) {
      showToast('Failed to transmit voice memo', 'error');
    }
  };

  // Toggle emoji reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    setActiveReactionMsgId(null);
    await toggleMessageReaction(msgId, activeCustomerId, emoji, activeCustomerId);
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Message text copied to clipboard', 'info');
  };

  // Export transcript
  const handleExportTranscript = () => {
    const text = generateChatTranscriptText(messages, activeCustomerName);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EagleExcel_ChatTranscript_${activeCustomerId.substring(0, 8)}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat transcript downloaded', 'success');
  };

  const modalContent = (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-[#121212] shadow-2xl overflow-hidden flex flex-col transition-all text-slate-900 dark:text-zinc-100 relative ${
        viewMode === 'docked'
          ? 'fixed inset-x-0 bottom-0 z-[99999] w-full sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] h-[85dvh] sm:h-[620px] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-white/10'
          : 'fixed inset-0 z-[99999] w-full h-[100dvh] rounded-none sm:static sm:h-[680px] sm:max-w-xl sm:max-h-[90dvh] sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-white/10'
      }`}
    >
      {/* Drag & Drop Visual Backdrop */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-[#F27D26]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-black border-4 border-dashed border-black/40 animate-fadeIn">
          <UploadCloud className="w-16 h-16 animate-bounce mb-2" />
          <h3 className="text-lg font-black font-serif">Drop Image to Attach</h3>
          <p className="text-xs font-semibold">Release to immediately attach image to chat stream</p>
        </div>
      )}

      {/* 1. Header */}
      <div className="pt-[max(0.875rem,env(safe-area-inset-top))] px-4 pb-3.5 sm:p-4 bg-slate-50 dark:bg-[#0e0e0e] flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl brand-logo-badge flex items-center justify-center p-1.5 shrink-0 shadow-xs relative">
            <img 
              src={getBrandLogo(isDark)} 
              alt="Eagle Excel Ventures" 
              className="w-full h-full object-contain brand-logo-img"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0e0e0e] absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white font-serif truncate">Eagle Excel Support</h2>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Desk
              </span>
            </div>
            {adminIsTyping ? (
              <p className="text-[10px] sm:text-[11px] text-[#F27D26] font-bold truncate flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-ping shrink-0" />
                <span>{typingAgentName || 'Operations Desk'} is typing a reply...</span>
              </p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                B2B Freight &amp; Commercial Channel • SLA &lt; 2m
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="p-2 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound Alerts' : 'Unmute Sound Alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 sm:p-1.5 rounded-xl transition-colors cursor-pointer ${
              showSearch
                ? 'bg-[#F27D26] text-black font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleExportTranscript}
              className="p-2 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors hidden sm:flex cursor-pointer"
              title="Download Official Transcript"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'modal' ? 'docked' : 'modal')}
            className="p-2 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors hidden sm:block cursor-pointer"
            title={viewMode === 'modal' ? 'Dock to bottom corner' : 'Expand to center dialog'}
          >
            {viewMode === 'modal' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Guest notice banner (subtle, non-blocking) */}
      {!currentUser && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium truncate">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Chatting as Guest Buyer. Messages are active and live!</span>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="text-[10px] font-bold text-[#F27D26] hover:underline shrink-0 ml-2 cursor-pointer"
          >
            Sign In to Sync
          </button>
        </div>
      )}

      {/* Pinned Active Pro-Forma Quotation Bar */}
      {latestQuote && (
        <div className="bg-gradient-to-r from-[#F27D26]/15 via-amber-500/10 to-[#F27D26]/15 border-b border-[#F27D26]/30 px-3.5 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#F27D26] shrink-0" />
            <div className="truncate">
              <span className="font-extrabold text-[#F27D26]">Pro-Forma #{latestQuote.quoteRef}</span>
              <span className="text-slate-600 dark:text-zinc-300 ml-1.5 font-semibold">
                • Total: ${latestQuote.grandTotal.toLocaleString()} ({latestQuote.items.length} SKUs)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F27D26] text-black px-2 py-0.5 rounded-full shrink-0 ml-2">
            Active Quote
          </span>
        </div>
      )}

      {/* 2. In-Chat Search Bar */}
      {showSearch && (
        <div className="p-2.5 bg-slate-100 dark:bg-[#161616] border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversation text or SKU..."
            className="flex-1 px-2.5 py-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none focus:border-[#F27D26]"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* 3. Chat History Stream */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-[#0a0a0a]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 dark:text-zinc-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 text-[#F27D26] border border-slate-200 dark:border-white/10 flex items-center justify-center icon-morphism shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-sm">Wholesale Operations Channel</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                Connect with commercial specialists for bulk price quotes, pallet & sea freight to Africa, or Net 30 corporate terms.
              </p>
            </div>

            {/* Quick Inquiry Templates */}
            <div className="w-full space-y-1.5 text-left pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 text-center">
                Quick Inquiry Templates:
              </div>
              <button
                type="button"
                onClick={() => setInputText('Can you provide a custom volume discount quotation for 500+ units?')}
                className="w-full p-2.5 bg-white dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-left text-xs text-slate-700 dark:text-zinc-300 transition-colors btn-hover shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Package className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                <span>Request 500+ unit bulk tier quotation</span>
              </button>
              <button
                type="button"
                onClick={() => setInputText('What is the current estimated lead time and freight options for pallet shipping to Lagos/Douala?')}
                className="w-full p-2.5 bg-white dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-left text-xs text-slate-700 dark:text-zinc-300 transition-colors btn-hover shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Truck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Check pallet freight & container lead times</span>
              </button>
              <button
                type="button"
                onClick={() => setInputText('I would like to apply for Net 30 Commercial Invoice billing terms for my business.')}
                className="w-full p-2.5 bg-white dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-left text-xs text-slate-700 dark:text-zinc-300 transition-colors btn-hover shadow-xs cursor-pointer flex items-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Apply for Net 30 Commercial credit terms</span>
              </button>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.senderId === activeCustomerId || msg.senderRole === 'customer';
            const isAdminSender = msg.senderRole === 'admin';
            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Check if day changed from previous message
            const prevMsg = index > 0 ? filteredMessages[index - 1] : undefined;
            const showDateHeader = isDifferentChatDay(prevMsg?.createdAt, msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {/* Date separator pill */}
                {showDateHeader && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-zinc-400 shadow-2xs">
                      {formatChatDateGroup(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group relative`}
                >
                  {/* Sender badge & timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-500 px-1">
                    <span className="font-semibold">
                      {isMe ? 'You' : `${msg.senderName} (Operations Desk)`}
                    </span>
                    <span>•</span>
                    <span>{time}</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="relative max-w-[88%] sm:max-w-[84%]">
                    <div
                      onClick={() => setActiveMobileActionMsgId(prev => prev === msg.id ? null : msg.id)}
                      className={`p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs cursor-pointer select-text ${
                        isMe
                          ? 'bg-[#F27D26] text-black font-semibold rounded-tr-xs'
                          : isAdminSender
                          ? 'bg-white dark:bg-[#181818] text-slate-900 dark:text-zinc-100 rounded-tl-xs border border-slate-200 dark:border-white/10'
                          : 'bg-white dark:bg-[#161616] text-slate-800 dark:text-zinc-200 rounded-tl-xs border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {isAdminSender && !isMe && (
                        <div className="flex items-center gap-1 text-[10px] text-[#F27D26] font-extrabold mb-1.5 pb-1 border-b border-black/5 dark:border-white/5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Eagle Excel Operations
                        </div>
                      )}

                      {/* Replied Context Banner */}
                      {msg.replyTo && (
                        <div className="mb-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 border-l-2 border-[#F27D26] text-[11px]">
                          <span className="font-bold text-[#F27D26] block">
                            Replying to {msg.replyTo.senderRole === 'admin' ? 'Operations Desk' : msg.replyTo.senderName}:
                          </span>
                          <span className="truncate block opacity-80">{msg.replyTo.message}</span>
                        </div>
                      )}

                      {/* Attached Images */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 space-y-1.5">
                          {msg.attachments.map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(imgUrl);
                              }}
                              className="rounded-xl overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 max-h-48"
                            >
                              <img
                                src={imgUrl}
                                alt="Attachment"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attached Product Card */}
                      {msg.attachedProduct && (
                        <ChatProductCard product={msg.attachedProduct} isMe={isMe} />
                      )}

                      {/* Attached Pro-Forma Quote */}
                      {msg.quoteData && (
                        <ChatQuoteCard quote={msg.quoteData} isMe={isMe} />
                      )}

                      {/* Voice Note Player */}
                      {msg.voiceNote && (
                        <VoiceNotePlayer audioUrl={msg.voiceNote.url} isMe={isMe} />
                      )}

                      {/* Rich Formatted Text content */}
                      {msg.message && (
                        <div className="break-words">
                          {renderFormattedChatMessage(msg.message)}
                        </div>
                      )}

                      {/* Delivery & Read Receipts */}
                      {isMe && (
                        <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-1 border-t border-black/10 text-[10px] select-none">
                          {msg.readByAdmin ? (
                            <span 
                              className="inline-flex items-center gap-1 font-bold text-[#082046] bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded-md transition-all shadow-2xs" 
                              title={msg.readAt ? `Viewed by Admin Operations Desk at ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Viewed by Admin Operations Desk'}
                            >
                              <CheckCheck className="w-3.5 h-3.5 stroke-[2.8] text-blue-900" />
                              <span>Read by Admin</span>
                              {msg.readAt && (
                                <span className="font-normal opacity-80 text-[9px]">
                                  • {new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                          ) : msg.deliveryStatus === 'delivered' ? (
                            <span 
                              className="inline-flex items-center gap-1 font-medium text-black/75 bg-black/5 px-1.5 py-0.5 rounded-md" 
                              title="Delivered to Admin Operations Desk"
                            >
                              <CheckCheck className="w-3.5 h-3.5 stroke-[2.2] text-black/60" />
                              <span>Delivered</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 font-medium text-black/65 bg-black/5 px-1.5 py-0.5 rounded-md" 
                              title="Sent to Eagle Excel Network"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.2] text-black/50" />
                              <span>Sent</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inquiry Viewed Status beneath the latest customer message */}
                    {isMe && msg.id === lastCustomerMsgId && (
                      <div className="mt-1 flex items-center justify-end">
                        {msg.readByAdmin ? (
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/60 dark:border-blue-800/40 shadow-2xs animate-in fade-in slide-in-from-bottom-0.5 duration-200"
                            title={msg.readAt ? `Admin viewed inquiry at ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Admin viewed inquiry'}
                          >
                            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Inquiry viewed by Admin</span>
                            {msg.readAt && (
                              <span className="text-[9px] font-normal opacity-80">
                                ({new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 text-[10px] font-medium border border-slate-200/60 dark:border-white/10">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Delivered • Awaiting admin review</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message delivery & read timestamp details on tap */}
                    {activeMobileActionMsgId === msg.id && isMe && (
                      <div className="mt-1 p-2 rounded-xl bg-slate-100 dark:bg-[#1f1f22] border border-slate-200 dark:border-white/10 text-[10px] text-slate-600 dark:text-zinc-300 space-y-0.5 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-zinc-500">Sent:</span>
                          <span className="font-semibold">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-zinc-500">Admin Review:</span>
                          {msg.readByAdmin ? (
                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                              Viewed {msg.readAt ? `at ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-500">Delivered (Pending admin review)</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons on hover & mobile tap (Reply, React, Copy, Delete) */}
                    <div className={`absolute -top-7 ${isMe ? 'right-0 sm:right-auto sm:-left-20' : 'left-0 sm:left-auto sm:-right-20'} ${
                      activeMobileActionMsgId === msg.id ? 'flex' : 'hidden group-hover:flex'
                    } items-center gap-0.5 bg-white dark:bg-[#202020] p-1 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-10 animate-in fade-in zoom-in-95 duration-100`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(msg);
                          setActiveMobileActionMsgId(null);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                        title="Reply to message"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                          setActiveMobileActionMsgId(null);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                        title="Add reaction"
                      >
                        <Smile className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyMessage(msg.message);
                          setActiveMobileActionMsgId(null);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                        title="Copy text"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMessageInDatabase(msg.id, activeCustomerId);
                            setActiveMobileActionMsgId(null);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Floating emoji popover */}
                    {activeReactionMsgId === msg.id && (
                      <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} z-20`}>
                        <ChatEmojiPicker
                          quickMode
                          onSelectEmoji={(emoji) => handleToggleReaction(msg.id, emoji)}
                          onClose={() => setActiveReactionMsgId(null)}
                        />
                      </div>
                    )}

                    {/* Reaction badges */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.reactions).map(([emoji, uids]) => {
                          const userList = (uids || []) as string[];
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all cursor-pointer ${
                                userList.includes(activeCustomerId)
                                  ? 'bg-[#F27D26]/20 border-[#F27D26]/40 text-[#F27D26] font-bold'
                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold">{userList.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Admin real-time typing indicator bubble */}
        {adminIsTyping && (
          <div className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200" id="admin-typing-indicator">
            <div className="w-8 h-8 rounded-xl bg-[#F27D26] text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">{typingAgentName || 'Operations Desk'}</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Typing...
                </span>
              </div>
              <div className="px-3.5 py-2.5 bg-white dark:bg-[#1a1a1c] rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-2.5 w-fit">
                <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                  {typingAgentName || 'Admin'} is typing
                </span>
                <div className="flex items-center gap-1 px-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying banner */}
      {replyingTo && (
        <div className="px-3.5 py-2 bg-slate-100 dark:bg-white/10 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#F27D26]">
                Replying to {replyingTo.senderRole === 'admin' ? 'Operations Desk' : replyingTo.senderName}:
              </span>{' '}
              <span className="text-slate-600 dark:text-zinc-300 truncate">{replyingTo.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Attachment Previews */}
      {(attachedProduct || attachedImage) && (
        <div className="p-2 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/5 flex items-center gap-2 shrink-0">
          {attachedProduct && (
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-zinc-200">
              <Package className="w-4 h-4 text-[#F27D26]" />
              <span className="font-bold">Attached: {attachedProduct.name} ({attachedProduct.sku})</span>
            </div>
          )}
          {attachedImage && (
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-zinc-200">
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Image Attached</span>
              <img src={attachedImage} alt="Attachment" className="w-6 h-6 rounded object-cover" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setAttachedProduct(null);
              setAttachedImage(null);
            }}
            className="ml-auto p-1 text-slate-400 hover:text-red-500 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Audio Recorder Mode */}
      {isRecordingVoice ? (
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-[#121212] border-t border-slate-200 dark:border-white/5">
          <VoiceNoteRecorder
            onSendVoiceNote={handleSendVoiceNote}
            onCancel={() => setIsRecordingVoice(false)}
          />
        </div>
      ) : (
        /* 6. Standard Input Form */
        <div className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-[#121212] border-t border-slate-200 dark:border-white/5 relative">
          {/* Slash Commands Auto-suggest Popup */}
          {showSlashMenu && (
            <div className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-3 mb-2 z-30 shadow-2xl">
              <SlashCommandMenu
                query={slashQuery}
                role="customer"
                onSelect={handleSelectSlashCommand}
                onClose={() => setShowSlashMenu(false)}
              />
            </div>
          )}

          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-2 sm:left-3 mb-2 z-30 max-w-[calc(100vw-24px)]">
              <ChatEmojiPicker
                onSelectEmoji={(emoji) => {
                  setInputText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 dark:border-white/10 focus-within:border-[#F27D26] transition-colors">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type message, use / commands..."
                rows={1}
                className="flex-1 bg-transparent text-sm sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none resize-none max-h-24 py-1.5 font-sans"
              />

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer touch-manipulation"
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer touch-manipulation"
                  title="Upload image / document"
                >
                  <Paperclip className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        showToast('Attached file must be under 5MB', 'error');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        setAttachedImage(uploadEvent.target?.result as string);
                        showToast('File attached', 'success');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setIsProductSelectorOpen(true)}
                  className="p-2 sm:p-1.5 text-slate-400 hover:text-[#F27D26] dark:hover:text-[#F27D26] rounded-xl transition-colors cursor-pointer touch-manipulation"
                  title="Attach Wholesale Product SKU"
                >
                  <Package className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsRecordingVoice(true)}
                  className="p-2 sm:p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors cursor-pointer touch-manipulation"
                  title="Record Voice Memo"
                >
                  <Mic className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>

                <button
                  type="submit"
                  disabled={isSending || (!(inputText || '').trim() && !attachedProduct && !attachedImage)}
                  className={`p-2 sm:p-2 rounded-xl text-black font-extrabold transition-all cursor-pointer touch-manipulation ${
                    (inputText || '').trim() || attachedProduct || attachedImage
                      ? 'bg-[#F27D26] hover:bg-[#e06c15] shadow-md scale-100 active:scale-95'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Wholesale SKU Selector Modal */}
      {isProductSelectorOpen && (
        <ProductSelectorModal
          isOpen={isProductSelectorOpen}
          onClose={() => setIsProductSelectorOpen(false)}
          onSelectProduct={(p) => {
            setAttachedProduct(p);
            setIsProductSelectorOpen(false);
          }}
        />
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen Attachment"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );

  if (viewMode === 'docked') {
    return createPortal(modalContent, document.body);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      {modalContent}
    </div>,
    document.body
  );
};
