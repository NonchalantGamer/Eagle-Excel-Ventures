import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Smile, 
  Image as ImageIcon, 
  FileText, 
  Check, 
  CheckCheck, 
  Search, 
  Download, 
  Phone, 
  ExternalLink, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Package, 
  Truck, 
  CreditCard, 
  ChevronRight, 
  Mic, 
  X, 
  Building2, 
  ShoppingBag, 
  ArrowLeft, 
  Trash2, 
  Share2,
  Clock,
  Sparkles,
  Zap,
  HelpCircle,
  FileCheck,
  RotateCcw,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Product, Message, PageView, Order, ChatAttachedProduct } from '../types';
import { 
  sendMessageInDatabase, 
  subscribeToCustomerThread, 
  markThreadAsRead, 
  toggleMessageReaction, 
  deleteMessageInDatabase,
  broadcastTypingStatus,
  subscribeToTypingStatus,
  generateChatTranscriptText,
  fetchFreshCustomerMessages,
  isStaffInternalNote,
  filterCustomerVisibleMessages
} from '../services/messageService';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { getCustomerOrders } from '../services/orderService';
import { 
  playPopSound, 
  playSendSound, 
  playReceiveSound, 
  toggleSoundPreference, 
  isSoundEnabled 
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
import { ChatProductCard } from '../components/chat/ChatProductCard';
import { ChatQuoteCard } from '../components/chat/ChatQuoteCard';
import { ChatEmojiPicker } from '../components/chat/ChatEmojiPicker';
import { ProductSelectorModal } from '../components/chat/ProductSelectorModal';
import { VoiceNoteRecorder } from '../components/chat/VoiceNoteRecorder';
import { VoiceNotePlayer } from '../components/chat/VoiceNotePlayer';
import { SlashCommandMenu, SlashCommandItem } from '../components/chat/SlashCommandMenu';
import { GoogleMessagesHeader } from '../components/chat/GoogleMessagesHeader';
import { GoogleMessagesComposer } from '../components/chat/GoogleMessagesComposer';
import { AttachmentSheet } from '../components/chat/AttachmentSheet';
import { ChatPlaceholder } from '../components/chat/ChatPlaceholder';

export interface SupportPageProps {
  onNavigate: (view: PageView, options?: { category?: string; product?: string }) => void;
  onOpenAuth: () => void;
  initialProductInquiry?: Product | null;
  initialCustomMessage?: string | null;
  onClearInitialInquiry?: () => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({
  onNavigate,
  onOpenAuth,
  initialProductInquiry,
  initialCustomMessage,
  onClearInitialInquiry
}) => {
  const { currentUser, userProfile } = useAuth();
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
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedProduct, setAttachedProduct] = useState<Product | ChatAttachedProduct | null>(initialProductInquiry || null);
  const [isSending, setIsSending] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedOrderRef, setSelectedOrderRef] = useState<Order | null>(null);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [activeMobileActionMsgId, setActiveMobileActionMsgId] = useState<string | null>(null);
  const repName = 'Operations Desk';
  const isAdmin = userProfile?.role === 'admin' || currentUser?.email === 'operations@eagleexcel.com';

  // Slash commands state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileMessagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safe inner container scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
    if (mobileMessagesContainerRef.current) {
      mobileMessagesContainerRef.current.scrollTo({
        top: mobileMessagesContainerRef.current.scrollHeight,
        behavior
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load customer orders for reference sidebar
  useEffect(() => {
    if (currentUser) {
      getCustomerOrders(currentUser.uid).then(orders => {
        setCustomerOrders(orders);
      }).catch(() => {});
    }
  }, [currentUser]);

  const onClearRef = useRef(onClearInitialInquiry);
  useEffect(() => {
    onClearRef.current = onClearInitialInquiry;
  }, [onClearInitialInquiry]);

  // Sync initial passed inquiries (from Product page or Profile)
  useEffect(() => {
    if (initialProductInquiry) {
      setAttachedProduct(initialProductInquiry);
      setInputText(`Hello Operations Desk, I would like to inquire about bulk wholesale supply, sea container freight options, and volume tiered pricing for ${initialProductInquiry.name} (SKU: ${initialProductInquiry.sku}).`);
      onClearRef.current?.();
    } else if (initialCustomMessage) {
      setInputText(initialCustomMessage);
      onClearRef.current?.();
    }
  }, [initialProductInquiry, initialCustomMessage]);

  // Real-time subscription to customer messages
  const seenSupportPageMsgIdsRef = useRef<Set<string>>(new Set());
  const isSupportPageInitialRef = useRef<boolean>(true);

  useEffect(() => {
    if (!activeCustomerId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    seenSupportPageMsgIdsRef.current = new Set();
    isSupportPageInitialRef.current = true;
    setLoading(true);
    const unsubscribe = subscribeToCustomerThread(activeCustomerId, (incoming) => {
      const visible = filterCustomerVisibleMessages(incoming);
      setMessages((prev) => {
        // Keep any active optimistic messages that haven't been matched yet
        const unconfirmedOptimistic = prev.filter(
          (opt) =>
            !isStaffInternalNote(opt) &&
            opt.id.startsWith('msg_opt_') &&
            !visible.some(
              (inc) =>
                inc.message === opt.message &&
                Math.abs(new Date(inc.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 15000
            )
        );
        return [...visible, ...unconfirmedOptimistic];
      });
      setLoading(false);

      if (isSupportPageInitialRef.current) {
        visible.forEach(m => seenSupportPageMsgIdsRef.current.add(m.id));
        seedInitialLoadedMessageIds(visible.map(m => m.id));
        isSupportPageInitialRef.current = false;
      } else {
        const newAdminMsgs: Message[] = [];
        for (const m of visible) {
          const isAlreadyKnown = seenSupportPageMsgIdsRef.current.has(m.id) || hasMessagePopupBeenDispatched(m.id);
          if (!isAlreadyKnown) {
            seenSupportPageMsgIdsRef.current.add(m.id);
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
        }
      }

      // Mark as read by customer
      markThreadAsRead(activeCustomerId, 'customer').catch(() => {});
    });

    return () => {
      unsubscribe();
    };
  }, [activeCustomerId]);

  // Safety timer to smoothly transition out of initial placeholder even on slow mobile networks
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Subscribe to Admin typing status
  useEffect(() => {
    if (!activeCustomerId) return;
    const unsubTyping = subscribeToTypingStatus(activeCustomerId, 'admin', (isTyping) => {
      setAdminIsTyping(isTyping);
      if (isTyping) {
        scrollToBottom('smooth');
      }
    });

    return () => {
      unsubTyping();
    };
  }, [activeCustomerId]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (!loading) {
      scrollToBottom('smooth');
    }
  }, [messages.length, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Input typing and slash detection
  const handleInputChange = (val: string) => {
    setInputText(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashQuery(val.substring(1));
    } else {
      setShowSlashMenu(false);
    }

    if (!activeCustomerId) return;

    broadcastTypingStatus(activeCustomerId, 'customer', true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      broadcastTypingStatus(activeCustomerId, 'customer', false);
    }, 2000);
  };

  // Clipboard Paste for Images/Screenshots
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

  // Drag and Drop File Handlers
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

  // Slash commands selection
  const handleSelectSlashCommand = (cmd: SlashCommandItem) => {
    setShowSlashMenu(false);
    if (cmd.id === 'quote') {
      setInputText('Hello Operations, please prepare an official Pro-Forma Quotation for our consideration.');
    } else if (cmd.id === 'freight') {
      setInputText('What are the current consolidated sea container freight rates and sailing schedules to Lagos / Douala ports?');
    } else if (cmd.id === 'net30') {
      setInputText('How can our enterprise apply for Net 30 Commercial Invoice payment terms and credit line?');
    } else if (cmd.id === 'product') {
      setIsProductSelectorOpen(true);
      setInputText('');
    } else if (cmd.id === 'clear') {
      setInputText('');
      setAttachedProduct(null);
      setAttachedImage(null);
      setSelectedOrderRef(null);
    }
    textareaRef.current?.focus();
  };

  // Send message with OPTIMISTIC update (reflects immediately without refresh)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = (inputText || '').trim();
    if (!cleanText && !attachedProduct && !attachedImage && !selectedOrderRef) return;

    setIsSending(true);
    const textToSend = cleanText || (
      attachedProduct ? `Catalog inquiry regarding ${attachedProduct.name} (${attachedProduct.sku})` : 
      selectedOrderRef ? `Inquiry regarding Purchase Order #${selectedOrderRef.orderNumber}` : 
      'Attached file transmission'
    );
    const attachmentsToSend = attachedImage ? [attachedImage] : [];
    const productToSend: ChatAttachedProduct | undefined = attachedProduct ? {
      id: attachedProduct.id,
      name: attachedProduct.name,
      sku: attachedProduct.sku,
      price: attachedProduct.price,
      image: ('image' in attachedProduct && attachedProduct.image) ? attachedProduct.image : (('images' in attachedProduct && attachedProduct.images?.[0]) || ''),
      moq: ('moq' in attachedProduct && typeof attachedProduct.moq === 'number') ? attachedProduct.moq : (('minOrderQty' in attachedProduct && attachedProduct.minOrderQty) || 1),
      category: attachedProduct.category
    } : undefined;

    const orderToSend = selectedOrderRef ? {
      id: selectedOrderRef.id,
      orderNumber: selectedOrderRef.orderNumber,
      total: selectedOrderRef.total,
      status: selectedOrderRef.status,
      itemCount: selectedOrderRef.items.length
    } : undefined;

    // Reset input states immediately
    setInputText('');
    setAttachedProduct(null);
    setAttachedImage(null);
    setSelectedOrderRef(null);
    setShowEmojiPicker(false);
    setShowSlashMenu(false);
    broadcastTypingStatus(activeCustomerId, 'customer', false);

    // Create optimistic message object so it displays instantaneously (0ms)
    const optimisticId = `msg_opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
      attachedOrder: orderToSend,
      reactions: {},
      isInternalNote: false,
      messageType: productToSend ? 'product_card' : orderToSend ? 'order_ref' : 'text',
      readByAdmin: false,
      readByCustomer: true,
      createdAt: new Date().toISOString()
    };

    // Optimistically update state immediately
    setMessages(prev => [...prev.filter(m => m.id !== optimisticId), optimisticMsg]);
    playSendSound();
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 50);

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
        attachedOrder: orderToSend,
        messageType: productToSend ? 'product_card' : orderToSend ? 'order_ref' : 'text'
      });

      // Replace optimistic placeholder with confirmed message
      setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m));
    } catch (err) {
      showToast('Failed to send message. Please retry.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Send Voice Note with optimistic update
  const handleSendVoiceNote = async (audioDataUrl: string, durationSec: number) => {
    setIsRecordingVoice(false);

    const optimisticId = `msg_opt_vn_${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      threadId: activeCustomerId,
      customerId: activeCustomerId,
      customerName: activeCustomerName,
      customerEmail: activeCustomerEmail,
      senderId: activeCustomerId,
      senderName: activeCustomerName,
      senderRole: 'customer',
      message: 'Voice memo transmission',
      voiceNote: { url: audioDataUrl, duration: durationSec },
      reactions: {},
      isInternalNote: false,
      messageType: 'voice_note',
      readByAdmin: false,
      readByCustomer: true,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    playSendSound();

    try {
      const realMsg = await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        customerEmail: activeCustomerEmail,
        senderId: activeCustomerId,
        senderName: activeCustomerName,
        senderRole: 'customer',
        message: 'Voice memo transmission',
        voiceNote: { url: audioDataUrl, duration: durationSec },
        messageType: 'voice_note'
      });

      setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m));
    } catch (err) {
      showToast('Failed to send voice note.', 'error');
    }
  };

  // Toggle emoji reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    playPopSound();
    setActiveReactionMsgId(null);

    // Optimistic reaction update
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        const uids = reactions[emoji] ? [...reactions[emoji]] : [];
        const idx = uids.indexOf(activeCustomerId);
        if (idx >= 0) {
          uids.splice(idx, 1);
          if (uids.length === 0) delete reactions[emoji];
          else reactions[emoji] = uids;
        } else {
          uids.push(activeCustomerId);
          reactions[emoji] = uids;
        }
        return { ...m, reactions };
      }
      return m;
    }));

    try {
      await toggleMessageReaction(msgId, activeCustomerId, emoji, activeCustomerId);
    } catch (err) {
      console.warn('Failed to persist reaction:', err);
    }
  };

  // Delete customer's own message
  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await deleteMessageInDatabase(msgId, activeCustomerId);
      showToast('Message deleted', 'info');
    } catch (err) {
      showToast('Failed to delete message', 'error');
    }
  };

  // Pull-to-refresh handler for mobile live support
  const handlePullRefresh = async () => {
    try {
      await fetchFreshCustomerMessages(activeCustomerId);
    } catch (err) {
      console.warn('Pull refresh error:', err);
    }
  };

  // Export transcript
  const handleExportTranscript = () => {
    const customerSafeMessages = messages.filter(m => !isStaffInternalNote(m));
    if (customerSafeMessages.length === 0) {
      showToast('No chat history to export.', 'info');
      return;
    }
    const customerName = userProfile?.displayName || currentUser?.email || 'Commercial Buyer';
    const text = generateChatTranscriptText(customerSafeMessages, customerName);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EagleExcel_Chat_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Transcript exported to download folder!', 'success');
  };

  // File upload input handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file must be under 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAttachedImage(uploadEvent.target?.result as string);
        showToast('Image attached!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter messages based on search query (excluding any internal staff notes)
  const filteredMessages = useMemo(() => {
    const safeMessages = messages.filter(m => !isStaffInternalNote(m));
    const cleanSearch = (searchQuery || '').trim();
    if (!cleanSearch) return safeMessages;
    const q = cleanSearch.toLowerCase();
    return safeMessages.filter(m => 
      (m.message || '').toLowerCase().includes(q) ||
      m.attachedProduct?.name?.toLowerCase().includes(q) ||
      m.attachedProduct?.sku?.toLowerCase().includes(q) ||
      m.quoteData?.quoteRef?.toLowerCase().includes(q) ||
      m.attachedOrder?.orderNumber?.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Latest active Pro-Forma Quote if any
  const latestQuote = useMemo(() => {
    const quotes = messages.filter(m => !isStaffInternalNote(m) && m.quoteData && m.messageType === 'quote_offer');
    return quotes.length > 0 ? quotes[quotes.length - 1].quoteData : null;
  }, [messages]);

  return (
    <div 
      id="live-support-page"
      className="min-h-screen bg-slate-50 dark:bg-[#0c0c0d] text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-[#F27D26]/20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Image Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Drag & Drop File Active Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#F27D26]/20 backdrop-blur-xs border-4 border-dashed border-[#F27D26] flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-black p-6 rounded-2xl shadow-2xl text-center space-y-2 border border-[#F27D26]/40 animate-scaleUp">
            <ImageIcon className="w-12 h-12 text-[#F27D26] mx-auto animate-bounce" />
            <p className="font-extrabold text-sm text-slate-900 dark:text-white">Drop screenshot or spec sheet to attach</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">File will be transmitted directly into the live support stream</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE EXPERIENCE: Full Native-Grade Live Support (lg:hidden) */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="fixed inset-0 z-30 flex lg:hidden flex-col h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 overflow-hidden">
          <ChatPlaceholder onBack={() => onNavigate('home')} />
        </div>
      ) : (
        <div className="fixed inset-0 z-30 flex lg:hidden flex-col h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 overflow-hidden">
          {/* Mobile Header */}
          <GoogleMessagesHeader
            onBack={() => onNavigate('home')}
            onToggleSearch={() => setShowSearch(!showSearch)}
            showSearch={showSearch}
            soundOn={soundOn}
            onToggleSound={() => {
              const next = toggleSoundPreference();
              setSoundOn(next);
              if (next) playPopSound();
            }}
            onExportTranscript={handleExportTranscript}
            onOpenCatalog={() => setIsProductSelectorOpen(true)}
            isAdmin={isAdmin}
            onOpenAdminDesk={() => onNavigate('admin')}
            repName={repName}
          />

          {/* Search Bar Input (when showSearch is true) */}
          {showSearch && (
            <div className="px-3 py-2 bg-white dark:bg-[#141415] border-b border-slate-200 dark:border-white/10 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter messages, SKU, or PO..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-[#F27D26] px-1 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Active Pro-Forma Quote Notification Banner (if any active quote) */}
          {latestQuote && (
            <div className="px-3 py-2 bg-gradient-to-r from-amber-500/15 via-[#F27D26]/15 to-amber-600/15 border-b border-[#F27D26]/30 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#F27D26] text-black flex items-center justify-center font-bold text-xs shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                    <span>Pro-Forma #{latestQuote.quoteRef}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold uppercase">
                      Active
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                    Total: ${(latestQuote.grandTotal || latestQuote.totalAmount || 0).toLocaleString()} • Validity: {latestQuote.validDays || latestQuote.validityDays || 14} days
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleInputChange(`Regarding Pro-Forma Invoice #${latestQuote.quoteRef}: `);
                  textareaRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F27D26] text-black font-extrabold text-[10px] shrink-0 shadow-2xs cursor-pointer hover:bg-amber-500 transition-colors"
              >
                Inquire
              </button>
            </div>
          )}

          {/* Mobile Message Stream with Capacitive Pull-To-Refresh */}
          <PullToRefresh
            ref={mobileMessagesContainerRef}
            onRefresh={handlePullRefresh}
            pullText="Pull down to refresh support"
            releaseText="Release to sync live messages"
            refreshingText="Fetching live updates..."
            successText="Live messages synced"
            className="flex-1 min-h-0 px-3 py-3 space-y-3 bg-slate-50 dark:bg-[#0c0c0e]"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 text-[#F27D26] border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Eagle Excel Operations Desk
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                    Direct commercial line for container allocations, wholesale tiered pricing, customs documentation & order dispatch.
                  </p>
                </div>

                {/* Fast Inquiry Action Chips */}
                <div className="w-full max-w-sm grid grid-cols-2 gap-1.5 sm:gap-2 pt-2 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('Hello Operations, please send us wholesale volume & container pricing tiers.');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] transition-all text-xs font-semibold text-slate-800 dark:text-zinc-200 flex flex-col gap-1 cursor-pointer group"
                  >
                    <Package className="w-4 h-4 text-[#F27D26]" />
                    <span className="text-[10px] sm:text-[11px] leading-tight">Wholesale Pricing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('What is current sea freight transit time and cost to Lagos/Douala ports?');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] transition-all text-xs font-semibold text-slate-800 dark:text-zinc-200 flex flex-col gap-1 cursor-pointer group"
                  >
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] sm:text-[11px] leading-tight">Sea Freight Rates</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('Please issue a formal Pro-Forma Invoice for container allocation.');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] transition-all text-xs font-semibold text-slate-800 dark:text-zinc-200 flex flex-col gap-1 cursor-pointer group"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] sm:text-[11px] leading-tight">Pro-Forma Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('How can our enterprise apply for Net 30 Commercial credit terms?');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] transition-all text-xs font-semibold text-slate-800 dark:text-zinc-200 flex flex-col gap-1 cursor-pointer group"
                  >
                    <CreditCard className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] sm:text-[11px] leading-tight">Net 30 Credit</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const isMe = msg.senderId === activeCustomerId;
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const prevMsg = index > 0 ? filteredMessages[index - 1] : undefined;
                const showDateHeader = isDifferentChatDay(prevMsg?.createdAt, msg.createdAt);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider px-3 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                          {formatChatDateGroup(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group relative`}>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 px-1">
                        <span className="font-bold">
                          {isMe ? 'You' : `${msg.senderName || 'Operations Desk'}`}
                        </span>
                        <span>•</span>
                        <span>{time}</span>
                      </div>

                      <div className="relative max-w-[85%]">
                        <div 
                          onClick={() => setActiveMobileActionMsgId(activeMobileActionMsgId === msg.id ? null : msg.id)}
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs select-text cursor-pointer ${
                            isMe
                              ? 'bg-[#F27D26] text-black font-medium rounded-tr-xs'
                              : 'bg-white dark:bg-[#181819] text-slate-900 dark:text-zinc-100 rounded-tl-xs border border-slate-200/80 dark:border-white/10'
                          }`}
                        >
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-2 space-y-1.5">
                              {msg.attachments.map((imgUrl, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(imgUrl);
                                  }}
                                  className="rounded-xl overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 max-h-52"
                                >
                                  <img src={imgUrl} alt="Attachment" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.attachedProduct && (
                            <ChatProductCard product={msg.attachedProduct} isMe={isMe} />
                          )}

                          {msg.attachedOrder && (
                            <div className={`p-2.5 rounded-xl mb-2 border ${
                              isMe ? 'bg-black/10 border-black/20 text-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                            }`}>
                              <div className="flex items-center justify-between text-xs font-bold mb-0.5">
                                <span>PO #{msg.attachedOrder.orderNumber}</span>
                                <span className="capitalize">{msg.attachedOrder.status.replace('_', ' ')}</span>
                              </div>
                              <div className="text-[11px] opacity-85">
                                ${msg.attachedOrder.total.toLocaleString()} • {msg.attachedOrder.itemCount} Items
                              </div>
                            </div>
                          )}

                          {msg.quoteData && (
                            <ChatQuoteCard quote={msg.quoteData} isMe={isMe} />
                          )}

                          {msg.voiceNote && (
                            <VoiceNotePlayer audioUrl={msg.voiceNote.url} isMe={isMe} />
                          )}

                          {msg.message && (
                            <div className="break-words">
                              {renderFormattedChatMessage(msg.message)}
                            </div>
                          )}
                        </div>

                        {/* Read tick indicator for outgoing messages */}
                        {isMe && (
                          <div className="flex justify-end mt-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
                            {msg.readByAdmin ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#F27D26]" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        )}

                        {/* Tap Action / Reaction Toolbar */}
                        {activeMobileActionMsgId === msg.id && (
                          <div className="absolute -top-10 right-0 z-40 bg-white dark:bg-[#202023] rounded-full shadow-xl border border-slate-200 dark:border-white/10 px-2 py-1 flex items-center gap-1 animate-in zoom-in-90 duration-150">
                            {['👍', '❤️', '🚚', '📦', '💯'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReaction(msg.id, emoji);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="p-1 hover:scale-125 transition-transform text-sm cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(msg.message);
                                showToast('Message copied!', 'info');
                                setActiveMobileActionMsgId(null);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              title="Copy text"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {isMe && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(msg.id);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {adminIsTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 pl-2 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-[#E8DEF8] text-[#65558F] flex items-center justify-center font-bold text-[9px]">
                  A
                </div>
                <span>{repName} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </PullToRefresh>

          {/* Slash Command Autocomplete Menu */}
          {showSlashMenu && (
            <div className="px-3 pb-1">
              <SlashCommandMenu
                query={slashQuery}
                onSelect={handleSelectSlashCommand}
                onClose={() => setShowSlashMenu(false)}
              />
            </div>
          )}

          {/* Voice Note Recorder or Google Messages Style Mobile Composer */}
          {isRecordingVoice ? (
            <div className="p-3 bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-white/10 shrink-0">
              <VoiceNoteRecorder
                onSendVoiceNote={handleSendVoiceNote}
                onCancel={() => setIsRecordingVoice(false)}
              />
            </div>
          ) : (
            <GoogleMessagesComposer
              inputText={inputText}
              onChangeInput={handleInputChange}
              onSend={handleSend}
              isSending={isSending}
              onOpenAttachmentSheet={() => setShowAttachmentSheet(true)}
              onAttachImageClick={() => fileInputRef.current?.click()}
              attachedImage={attachedImage}
              attachedProduct={attachedProduct}
              selectedOrderRef={selectedOrderRef}
              onClearAttachments={() => {
                setAttachedProduct(null);
                setAttachedImage(null);
                setSelectedOrderRef(null);
              }}
              onStartVoiceRecording={() => setIsRecordingVoice(true)}
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
              onCloseEmojiPicker={() => setShowEmojiPicker(false)}
              onSelectEmoji={(emoji) => setInputText(prev => prev + emoji)}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP EXPERIENCE: Comprehensive Logistics Workspace & Chat (hidden lg:flex) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* Top Header Command Strip */}
        <div className="bg-white dark:bg-[#141415] rounded-3xl border border-slate-200 dark:border-white/10 p-4 mb-4 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20 flex items-center justify-center font-extrabold text-base">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#141415] rounded-full animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  Commercial Live Support & Freight Dispatch
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Online • Response &lt; 3 mins
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Active Freight Dispatchers: Guangzhou, Yiwu, Lagos (Apapa) & Douala Ports</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                showSearch 
                  ? 'bg-[#F27D26]/10 border-[#F27D26]/40 text-[#F27D26]' 
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = toggleSoundPreference();
                setSoundOn(next);
                if (next) playPopSound();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={soundOn ? 'Sound alerts enabled' : 'Mute chat sounds'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#F27D26]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              type="button"
              onClick={handleExportTranscript}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export Transcript</span>
            </button>

            <a
              href="https://wa.me/2348147485786?text=Hello%20Eagle%20Excel%20Operations%2C%20I%20am%20chatting%20from%20the%20live%20support%20portal%20regarding%20wholesale%20procurement."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Direct</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* 12-Column Split Grid */}
        <div className="grid grid-cols-12 gap-5 flex-1 items-start">
          
          {/* Left 4 Columns: Buyer Identity, Active Orders & Quick Actions */}
          <div className="col-span-4 space-y-4">
            
            {/* Buyer Card */}
            <div className="bg-white dark:bg-[#141415] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F27D26] to-amber-600 text-black font-extrabold flex items-center justify-center text-lg shadow-sm">
                  {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'B'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {userProfile?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Commercial Buyer')}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-[#F27D26] shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                    {currentUser?.email || 'Guest Visitor'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-[#F27D26] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                      {userProfile?.role === 'admin' ? 'Operations Admin' : 'Verified Importer'}
                    </span>
                  </div>
                </div>
              </div>

              {!currentUser && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full py-2 px-3 rounded-xl btn-primary-morphic text-black font-extrabold text-xs btn-hover cursor-pointer"
                  >
                    Sign In for Verified Pricing & Saved History
                  </button>
                </div>
              )}
            </div>

            {/* Active Orders Quick Reference */}
            {currentUser && (
              <div className="bg-white dark:bg-[#141415] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#F27D26]" />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Recent Purchase Orders</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400">
                    {customerOrders.length} Orders
                  </span>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center text-xs text-slate-500 dark:text-zinc-400">
                    <ShoppingBag className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <span>No placed purchase orders yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerOrders.slice(0, 3).map(order => (
                      <div
                        key={order.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-[#F27D26]/40 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            #{order.orderNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <span>${order.total.toLocaleString()}</span>
                            <span>•</span>
                            <span className="capitalize font-semibold text-[#F27D26]">{order.status.replace('_', ' ')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderRef(order);
                            showToast(`Attached PO #${order.orderNumber} to chat`, 'success');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-[#F27D26] hover:text-black text-slate-700 dark:text-zinc-200 font-bold text-[10px] transition-colors cursor-pointer shrink-0"
                        >
                          Reference
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Commercial Shortcuts */}
            <div className="bg-white dark:bg-[#141415] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Commercial Fast Actions</h4>
              </div>

              <button
                type="button"
                onClick={() => handleInputChange('Hello Operations, please send us a formal Pro-Forma Invoice for container allocation.')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#F27D26] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Request Pro-Forma Invoice</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('What is the current 20ft & 40ft container freight cost and transit duration to Lagos/Douala ports?')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#F27D26] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Check Sea Freight Rates</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('We would like to submit an application for Net 30 Commercial credit terms.')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#F27D26] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                  <span>Apply for Net 30 Credit</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] transition-colors" />
              </button>
            </div>

            {/* SLA Info */}
            <div className="p-4 rounded-3xl bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                <Clock className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Commercial Support SLA</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Mon - Sat: 8:00 AM - 6:00 PM (WAT / GMT+1). Urgent container clearances and customs releases are monitored 24/7.
              </p>
            </div>

          </div>

          {/* Right 8 Columns: Desktop Chat Window */}
          <div className="col-span-8 bg-white dark:bg-[#141415] rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col shadow-sm overflow-hidden h-[750px] relative">
            {loading ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ChatPlaceholder onBack={() => onNavigate('home')} isDesktop={true} />
              </div>
            ) : (
              <>
                {/* Desktop Messages Feed */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60 dark:bg-[#0c0c0d]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-zinc-400 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white dark:bg-white/5 text-[#F27D26] border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ready to Chat with Logistics Operations</h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-md leading-relaxed">
                      Direct communication channel with Eagle Excel commercial procurement desk. Inquire about bulk catalog discounts, sea container freight to Lagos/Douala, or custom machinery sourcing.
                    </p>
                  </div>
                </div>
              ) : (
                filteredMessages.map((msg, index) => {
                  const isMe = msg.senderId === activeCustomerId;
                  const isAdminSender = msg.senderRole === 'admin';
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  const prevMsg = index > 0 ? filteredMessages[index - 1] : undefined;
                  const showDateHeader = isDifferentChatDay(prevMsg?.createdAt, msg.createdAt);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateHeader && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider px-3.5 py-1 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                            {formatChatDateGroup(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group relative`}>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 px-1">
                          <span className="font-bold">
                            {isMe ? 'You' : `${msg.senderName} (Operations Desk)`}
                          </span>
                          <span>•</span>
                          <span>{time}</span>
                        </div>

                        <div className="relative max-w-[78%]">
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed break-words shadow-xs select-text ${
                            isMe
                              ? 'bg-[#F27D26] text-black font-medium rounded-tr-xs'
                              : 'bg-white dark:bg-[#181819] text-slate-900 dark:text-zinc-100 rounded-tl-xs border border-slate-200 dark:border-white/10'
                          }`}>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mb-2.5 space-y-2">
                                {msg.attachments.map((imgUrl, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => setLightboxImage(imgUrl)}
                                    className="rounded-xl overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 max-h-64"
                                  >
                                    <img src={imgUrl} alt="Attachment" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {msg.attachedProduct && (
                              <ChatProductCard product={msg.attachedProduct} isMe={isMe} />
                            )}

                            {msg.attachedOrder && (
                              <div className={`p-3 rounded-xl mb-2 border ${
                                isMe ? 'bg-black/10 border-black/20 text-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                              }`}>
                                <div className="flex items-center justify-between text-xs font-bold mb-1">
                                  <span>PO #{msg.attachedOrder.orderNumber}</span>
                                  <span className="capitalize">{msg.attachedOrder.status.replace('_', ' ')}</span>
                                </div>
                                <div className="text-[11px] opacity-85">
                                  ${msg.attachedOrder.total.toLocaleString()} • {msg.attachedOrder.itemCount} Items
                                </div>
                              </div>
                            )}

                            {msg.quoteData && (
                              <ChatQuoteCard quote={msg.quoteData} isMe={isMe} />
                            )}

                            {msg.voiceNote && (
                              <VoiceNotePlayer audioUrl={msg.voiceNote.url} isMe={isMe} />
                            )}

                            {msg.message && (
                              <div className="break-words">
                                {renderFormattedChatMessage(msg.message)}
                              </div>
                            )}
                          </div>

                          {isMe && (
                            <div className="flex justify-end mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
                              {msg.readByAdmin ? (
                                <CheckCheck className="w-4 h-4 text-[#F27D26]" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {adminIsTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 pl-2 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-[#E8DEF8] text-[#65558F] flex items-center justify-center font-bold text-[10px]">
                    A
                  </div>
                  <span>{repName} is typing...</span>
                </div>
              )}
            </div>

            {/* Desktop Composer */}
            <div className="p-3 bg-white dark:bg-[#141415] border-t border-slate-200 dark:border-white/10 shrink-0">
              {/* Attachment Preview Chips */}
              {(attachedProduct || attachedImage || selectedOrderRef) && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                  {attachedProduct && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <Package className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span className="font-semibold truncate max-w-[180px]">{attachedProduct.name}</span>
                    </div>
                  )}
                  {attachedImage && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Image attached</span>
                    </div>
                  )}
                  {selectedOrderRef && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <FileCheck className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>PO #{selectedOrderRef.orderNumber}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedProduct(null);
                      setAttachedImage(null);
                      setSelectedOrderRef(null);
                    }}
                    className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isRecordingVoice ? (
                <VoiceNoteRecorder
                  onSendVoiceNote={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1 pb-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Attach Image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProductSelectorOpen(true)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Attach Catalog Product"
                    >
                      <Package className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Voice Note"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Emoji"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <ChatEmojiPicker
                          isOpen={showEmojiPicker}
                          onClose={() => setShowEmojiPicker(false)}
                          onSelectEmoji={(emoji) => setInputText(prev => prev + emoji)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message or paste SKU / PO..."
                      rows={1}
                      className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm outline-none focus:border-[#F27D26] resize-none max-h-32 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={isSending || (!inputText.trim() && !attachedImage && !attachedProduct && !selectedOrderRef)}
                    className="p-2.5 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] disabled:opacity-40 disabled:hover:bg-[#F27D26] text-black transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS & DIALOGS */}
      {/* ========================================================================= */}

      {/* Attachment Bottom Sheet for Mobile */}
      <AttachmentSheet
        isOpen={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        onAttachImage={() => fileInputRef.current?.click()}
        onOpenCatalog={() => setIsProductSelectorOpen(true)}
        onSelectOrder={customerOrders.length > 0 ? () => {
          setSelectedOrderRef(customerOrders[0]);
          showToast(`Attached PO #${customerOrders[0].orderNumber}`, 'success');
        } : undefined}
      />

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        onSelectProduct={(p) => {
          setAttachedProduct(p);
          setIsProductSelectorOpen(false);
          showToast(`Attached ${p.name} to chat`, 'success');
        }}
      />

      {/* Lightbox Zoom for Images */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupportPage;
