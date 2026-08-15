import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  ShieldCheck, 
  Paperclip, 
  Image as ImageIcon, 
  Sparkles, 
  FileText, 
  Printer, 
  Trash2, 
  MoreVertical, 
  Smile, 
  Check, 
  CheckCheck, 
  Download, 
  RefreshCw, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Package, 
  Plus, 
  X,
  Lock,
  Tag,
  Clock,
  ArrowDown,
  Mic,
  UploadCloud,
  Truck,
  CreditCard,
  ChevronRight,
  Info,
  UserX,
  AlertTriangle,
  Filter,
  CheckCircle2,
  Trash,
  ChevronLeft,
  Copy
} from 'lucide-react';
import { 
  Message, 
  UserProfile, 
  UserRole, 
  ChatAttachedProduct, 
  ChatQuoteData, 
  OrderStatus 
} from '../../types';
import { 
  sendMessageInDatabase, 
  toggleMessageReaction, 
  deleteMessageInDatabase, 
  markThreadAsRead, 
  markAllConversationsAsRead,
  deleteCustomerThread,
  deleteOrphanedCustomerChats,
  broadcastTypingStatus, 
  subscribeToTypingStatus, 
  subscribeToAllTypingStatus,
  generateChatTranscriptText 
} from '../../services/messageService';
import { 
  playSendSound, 
  playReceiveSound, 
  isChatSoundEnabled, 
  setChatSoundEnabled 
} from '../../utils/chatAudio';
import { 
  hasMessagePopupBeenDispatched, 
  dispatchMessagePopupOnce, 
  seedInitialLoadedMessageIds 
} from '../../utils/messagePopupTracker';
import { 
  renderFormattedChatMessage, 
  formatChatDateGroup, 
  isDifferentChatDay 
} from '../../utils/chatFormatters';
import { ChatProductCard } from './ChatProductCard';
import { ChatQuoteCard } from './ChatQuoteCard';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { ProductSelectorModal } from './ProductSelectorModal';
import { AdminQuoteModal } from './AdminQuoteModal';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { SlashCommandMenu, SlashCommandItem } from './SlashCommandMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../Toast';
import { useCurrency } from '../../context/CurrencyContext';

interface AdminSupportDeskProps {
  messages: Message[];
  users: UserProfile[];
  currentAdmin: UserProfile | null;
  activeCustomerId: string | null;
  onSelectCustomer: (customerId: string) => void;
  onNavigateToOrders?: (customerId?: string) => void;
}

// Preset Quick B2B Canned Responses
const CANNED_RESPONSES = [
  {
    id: 'freight_rates',
    category: 'Freight & Logistics',
    label: '🚚 Pallet & Container Freight Rates',
    text: 'Hello! For palletized freight to Lagos/Douala ports, our current consolidated sea container rate is $165/CBM with estimated 18-24 days transit. Customs duties and port clearance documentation are included in all CIF pro-forma billings.'
  },
  {
    id: 'net30_terms',
    category: 'Billing & Credit',
    label: '📋 Net 30 Credit Application',
    text: 'Greetings! To activate Net 30 Commercial Billing for your enterprise, please ensure your corporate RC/TIN number is registered in your Profile. Our credit compliance desk approves commercial credit limits within 24 business hours.'
  },
  {
    id: 'volume_discount',
    category: 'Discounts',
    label: '🏷️ 500+ / 1000+ High Volume Tier',
    text: 'Thank you for your bulk volume inquiry. For tier orders of 500+ units, we offer an additional 15% discount off wholesale base, along with customized outer master carton palletization. Let us know if you would like an official Pro-Forma Quotation dispatched.'
  },
  {
    id: 'oem_custom',
    category: 'Manufacturing',
    label: '🏭 China Factory OEM & Custom Tooling',
    text: 'For custom branding, silkscreen logo embossing, and custom packaging, minimum factory batch size is 500 units with 12-14 days production lead time at our Ningbo/Guangzhou manufacturing hubs.'
  },
  {
    id: 'wire_payment',
    category: 'Banking',
    label: '💳 Wire Transfer & Pro-Forma Banking',
    text: 'Our commercial US Dollar / Euro / Naira banking instructions are indicated on each Pro-Forma Invoice. Please remit SWIFT / wire confirmation receipt to this chat channel for immediate warehouse priority queue allocation.'
  }
];

export const AdminSupportDesk: React.FC<AdminSupportDeskProps> = ({
  messages,
  users,
  currentAdmin,
  activeCustomerId,
  onSelectCustomer,
  onNavigateToOrders
}) => {
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [threadFilter, setThreadFilter] = useState<'all' | 'unread' | 'deleted'>('all');
  const [inputText, setInputText] = useState('');
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isChatSoundEnabled);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  
  // Modals & Popovers
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [attachedProduct, setAttachedProduct] = useState<ChatAttachedProduct | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeMobileActionMsgId, setActiveMobileActionMsgId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchInConversation, setSearchInConversation] = useState('');
  const [showSearchInChat, setShowSearchInChat] = useState(false);

  // Deletion Confirmation Modal State
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'all_orphaned';
    customerId?: string;
    customerName?: string;
    count?: number;
  }>({
    isOpen: false,
    type: 'single'
  });
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // Typing state
  const [customerIsTyping, setCustomerIsTyping] = useState(false);
  const [typingCustomersMap, setTypingCustomersMap] = useState<Record<string, { isTyping: boolean; senderName?: string }>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const prevActiveCustomerRef = useRef<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Set of verified existing user IDs
  const existingUserIds = useMemo(() => {
    return new Set(users.map(u => u.uid || u.id).filter(Boolean));
  }, [users]);

  // Sound preference toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
    showToast(next ? 'Chat sound alerts enabled' : 'Chat sound alerts muted', 'info');
  };

  // Group messages into customer threads
  const customerThreads = useMemo(() => {
    const threadMap = new Map<string, {
      customerId: string;
      customerName: string;
      customerEmail?: string;
      lastMsg: Message;
      unreadCount: number;
      messages: Message[];
      accountExists: boolean;
    }>();

    // Sort ascending for grouping
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach((msg) => {
      const cid = msg.customerId;
      if (!cid) return;
      const accountExists = existingUserIds.has(cid);
      const matchingUser = users.find(u => (u.uid || u.id) === cid);

      if (!threadMap.has(cid)) {
        threadMap.set(cid, {
          customerId: cid,
          customerName: msg.customerName || matchingUser?.displayName || (accountExists ? 'Wholesale Buyer' : 'Deleted Buyer Account'),
          customerEmail: msg.customerEmail || matchingUser?.email,
          lastMsg: msg,
          unreadCount: 0,
          messages: [],
          accountExists
        });
      }

      const entry = threadMap.get(cid)!;
      entry.lastMsg = msg;
      entry.messages.push(msg);
      if (msg.senderRole === 'customer' && !msg.readByAdmin) {
        entry.unreadCount += 1;
      }
    });

    // Also include registered customers who don't have messages yet
    users.forEach((u) => {
      const uId = u.uid || u.id;
      if (u.role === 'customer' && uId && !threadMap.has(uId)) {
        threadMap.set(uId, {
          customerId: uId,
          customerName: u.displayName || u.email,
          customerEmail: u.email,
          lastMsg: {
            id: `init_${uId}`,
            threadId: uId,
            customerId: uId,
            customerName: u.displayName || u.email,
            senderId: uId,
            senderName: u.displayName || u.email,
            senderRole: 'customer',
            message: 'No messages yet in this wholesale account thread.',
            readByAdmin: true,
            readByCustomer: true,
            createdAt: u.createdAt || new Date().toISOString()
          },
          unreadCount: 0,
          messages: [],
          accountExists: true
        });
      }
    });

    let list = Array.from(threadMap.values()).sort((a, b) => {
      return new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime();
    });

    if (threadFilter === 'unread') {
      list = list.filter(t => t.unreadCount > 0);
    } else if (threadFilter === 'deleted') {
      list = list.filter(t => !t.accountExists);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.customerName.toLowerCase().includes(q) ||
        (t.customerEmail && t.customerEmail.toLowerCase().includes(q)) ||
        t.messages.some(m => m.message.toLowerCase().includes(q))
      );
    }

    return list;
  }, [messages, users, existingUserIds, threadFilter, searchQuery]);

  // Overall counts
  const unreadThreadsCount = useMemo(() => {
    const unreadSet = new Set<string>();
    messages.forEach(m => {
      if (m.customerId && m.senderRole === 'customer' && !m.readByAdmin) {
        unreadSet.add(m.customerId);
      }
    });
    return unreadSet.size;
  }, [messages]);

  const orphanedThreadsCount = useMemo(() => {
    const threadCustomerIds = new Set(messages.map(m => m.customerId).filter(Boolean));
    let count = 0;
    threadCustomerIds.forEach(cId => {
      if (!existingUserIds.has(cId)) {
        count += 1;
      }
    });
    return count;
  }, [messages, existingUserIds]);

  // Set default active customer if not set
  const firstCustomerId = customerThreads[0]?.customerId;
  useEffect(() => {
    if (!activeCustomerId && firstCustomerId) {
      onSelectCustomer(firstCustomerId);
    }
  }, [activeCustomerId, firstCustomerId, onSelectCustomer]);

  // Active thread details
  const activeThread = useMemo(() => {
    if (!activeCustomerId) return null;
    return customerThreads.find(t => t.customerId === activeCustomerId) || null;
  }, [customerThreads, activeCustomerId]);

  const activeCustomerUser = useMemo(() => {
    if (!activeCustomerId) return null;
    return users.find(u => (u.uid || u.id) === activeCustomerId) || null;
  }, [users, activeCustomerId]);

  const isCurrentCustomerAccountDeleted = useMemo(() => {
    if (!activeCustomerId) return false;
    return !existingUserIds.has(activeCustomerId);
  }, [existingUserIds, activeCustomerId]);

  // Messages in active thread
  const activeThreadMessages = useMemo(() => {
    if (!activeCustomerId) return [];
    let msgs = messages.filter(m => m.customerId === activeCustomerId);
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if ((searchInConversation || '').trim()) {
      const q = searchInConversation.toLowerCase();
      msgs = msgs.filter(m => (m.message || '').toLowerCase().includes(q));
    }

    return msgs;
  }, [messages, activeCustomerId, searchInConversation]);

  // Unread messages in active thread
  const activeThreadUnreadCount = useMemo(() => {
    return activeThreadMessages.filter(m => m.senderRole === 'customer' && !m.readByAdmin).length;
  }, [activeThreadMessages]);

  // Latest active Pro-Forma Quote in thread
  const latestQuote = useMemo(() => {
    const quoteMsgs = activeThreadMessages.filter(m => !!m.quoteData);
    return quoteMsgs.length > 0 ? quoteMsgs[quoteMsgs.length - 1].quoteData : null;
  }, [activeThreadMessages]);

  // Play incoming message sound when new customer message arrives across any thread
  const seenAllMsgIdsRef = useRef<Set<string>>(new Set());
  const isAllInitialRef = useRef<boolean>(true);

  useEffect(() => {
    if (isAllInitialRef.current) {
      messages.forEach(m => seenAllMsgIdsRef.current.add(m.id));
      seedInitialLoadedMessageIds(messages.map(m => m.id));
      isAllInitialRef.current = false;
      return;
    }

    const newMsgs: Message[] = [];
    for (const m of messages) {
      const isAlreadyKnown = seenAllMsgIdsRef.current.has(m.id) || hasMessagePopupBeenDispatched(m.id);
      if (!isAlreadyKnown) {
        seenAllMsgIdsRef.current.add(m.id);
        if (m.senderRole === 'customer') {
          newMsgs.push(m);
        }
      }
    }

    if (newMsgs.length > 0) {
      newMsgs.forEach(msg => {
        dispatchMessagePopupOnce(msg.id, () => {
          playReceiveSound();
          if (msg.customerId === activeCustomerId) {
            scrollToBottom('smooth');
          } else {
            const preview = msg.message.length > 60 ? `${msg.message.substring(0, 57)}...` : msg.message;
            showToast(`💬 New inquiry from ${msg.customerName || 'Wholesale Buyer'}: "${preview}"`, {
              type: 'info',
              duration: 6000,
              action: {
                label: 'View Thread',
                onClick: () => onSelectCustomer(msg.customerId)
              }
            });
          }
        });
      });
    }
  }, [messages, activeCustomerId, onSelectCustomer, showToast]);

  // Subscribe to customer typing events for the active thread
  useEffect(() => {
    if (!activeCustomerId) return;
    const unsub = subscribeToTypingStatus(activeCustomerId, 'customer', (isTyping) => {
      setCustomerIsTyping(isTyping);
    });
    return () => unsub();
  }, [activeCustomerId]);

  // Subscribe to typing events across ALL customer threads for real-time sidebar indicators
  useEffect(() => {
    const unsubAll = subscribeToAllTypingStatus('customer', (map) => {
      setTypingCustomersMap(map);
    });
    return () => unsubAll();
  }, []);

  // AUTO-MARK AS READ: When active customer is selected or new unread messages arrive for this customer, mark them as read immediately
  useEffect(() => {
    if (activeCustomerId) {
      const hasUnread = messages.some(
        m => m.customerId === activeCustomerId && m.senderRole === 'customer' && !m.readByAdmin
      );
      if (hasUnread) {
        markThreadAsRead(activeCustomerId, 'admin');
      }
    }
  }, [activeCustomerId, messages]);

  // Safe inner container scroll to bottom (never scrolls the outer browser window or page)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Safe inner container scroll to top
  const scrollToTop = (behavior: ScrollBehavior = 'auto') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  };

  // When admin switches customer to chat with or opens conversation:
  // Position cleanly at the latest conversation exchange (bottom) so the conversation is immediately in view
  useEffect(() => {
    if (!activeCustomerId) return;
    if (prevActiveCustomerRef.current !== activeCustomerId) {
      prevActiveCustomerRef.current = activeCustomerId;
      try {
        localStorage.setItem('ee_last_viewed_admin_chat_customer_id', activeCustomerId);
      } catch {}
      // Immediate scroll & slight delayed safety pass after message bubbles render
      scrollToBottom('auto');
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeCustomerId]);

  // When new messages arrive in the active customer thread while viewing:
  const lastActiveMsgCountRef = useRef<number>(0);
  useEffect(() => {
    const currentCount = activeThreadMessages.length;
    if (lastActiveMsgCountRef.current > 0 && currentCount > lastActiveMsgCountRef.current) {
      scrollToBottom('smooth');
    }
    lastActiveMsgCountRef.current = currentCount;
  }, [activeThreadMessages.length]);

  // When customer is typing, if admin is already near bottom, smoothly update container
  useEffect(() => {
    if (customerIsTyping && messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (isNearBottom) {
        scrollToBottom('smooth');
      }
    }
  }, [customerIsTyping]);

  // Handle scroll detection inside the messages container for "Jump to Latest" button
  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    const isUp = el.scrollHeight - el.scrollTop - el.clientHeight > 200;
    setShowScrollBottomBtn(isUp);
  };

  // Handle Mark Single Active Thread as Read manually
  const handleMarkActiveThreadAsRead = async () => {
    if (!activeCustomerId) return;
    await markThreadAsRead(activeCustomerId, 'admin');
    showToast('Conversation marked as read', 'success');
  };

  // Handle Mark ALL Threads as Read across platform
  const handleMarkAllThreadsAsRead = async () => {
    await markAllConversationsAsRead('admin');
    showToast('All customer conversations marked as read', 'success');
  };

  // Handle Open Delete Confirmation for Single Customer Thread
  const handleOpenDeleteThread = (customerId: string, customerName: string) => {
    setDeleteConfirmDialog({
      isOpen: true,
      type: 'single',
      customerId,
      customerName
    });
  };

  // Handle Open Purge for All Orphaned/Deleted Accounts' Chats
  const handleOpenPurgeAllOrphaned = () => {
    setDeleteConfirmDialog({
      isOpen: true,
      type: 'all_orphaned',
      count: orphanedThreadsCount
    });
  };

  // Execute Confirmed Deletion
  const handleConfirmDelete = async () => {
    setIsDeletingChat(true);
    try {
      if (deleteConfirmDialog.type === 'all_orphaned') {
        const result = await deleteOrphanedCustomerChats(Array.from(existingUserIds));
        showToast(`Purged ${result.deletedThreads} chat thread(s) (${result.deletedMessages} messages) of deleted accounts.`, 'success');
        setDeleteConfirmDialog({ isOpen: false, type: 'single' });
        
        // If current thread was one of the purged ones, switch to remaining
        if (activeCustomerId && !existingUserIds.has(activeCustomerId)) {
          const remaining = customerThreads.filter(t => t.accountExists && t.customerId !== activeCustomerId);
          if (remaining.length > 0) {
            onSelectCustomer(remaining[0].customerId);
          }
        }
      } else if (deleteConfirmDialog.customerId) {
        const targetId = deleteConfirmDialog.customerId;
        const targetName = deleteConfirmDialog.customerName || 'Customer';
        await deleteCustomerThread(targetId);
        showToast(`Chat history for "${targetName}" deleted successfully.`, 'success');
        setDeleteConfirmDialog({ isOpen: false, type: 'single' });

        // Switch to next thread if active was deleted
        if (activeCustomerId === targetId) {
          const remaining = customerThreads.filter(t => t.customerId !== targetId);
          if (remaining.length > 0) {
            onSelectCustomer(remaining[0].customerId);
          }
        }
      }
    } catch (err) {
      showToast('Failed to delete chat records. Please retry.', 'error');
    } finally {
      setIsDeletingChat(false);
    }
  };

  // Handle typing broadcast from admin
  const handleInputChange = (val: string) => {
    setInputText(val);

    // Slash command detection
    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashQuery(val);
    } else {
      setShowSlashMenu(false);
    }

    if (!activeCustomerId) return;

    broadcastTypingStatus(activeCustomerId, 'admin', true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      broadcastTypingStatus(activeCustomerId, 'admin', false);
    }, 2000);
  };

  // Clipboard Paste handler for screenshots
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

  // Handle Slash Command Selection
  const handleSelectSlashCommand = (cmd: SlashCommandItem) => {
    setShowSlashMenu(false);
    if (cmd.id === 'quote') {
      setIsQuoteModalOpen(true);
      setInputText('');
    } else if (cmd.id === 'canned') {
      setShowCannedMenu(true);
      setInputText('');
    } else if (cmd.id === 'note') {
      setIsInternalNoteMode(prev => !prev);
      setInputText('');
      showToast(isInternalNoteMode ? 'Switched to Public Reply Mode' : 'Switched to Staff Internal Note Mode', 'info');
    } else if (cmd.id === 'product') {
      setIsProductSelectorOpen(true);
      setInputText('');
    } else if (cmd.id === 'freight') {
      setInputText('Hello! For palletized freight to Lagos/Douala ports, our current consolidated sea container rate is $165/CBM with estimated 18-24 days transit.');
    } else if (cmd.id === 'net30') {
      setInputText('Greetings! To activate Net 30 Commercial Billing for your enterprise, please ensure your corporate RC/TIN number is registered in your Profile.');
    } else if (cmd.id === 'clear') {
      setInputText('');
      setAttachedProduct(null);
      setAttachedImage(null);
    }
    textareaRef.current?.focus();
  };

  // Send Message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = (inputText || '').trim();
    if (!activeCustomerId || (!cleanText && !attachedProduct && !attachedImage)) {
      return;
    }

    const textToSend = cleanText || (attachedProduct ? `Catalog inquiry regarding ${attachedProduct.name} (${attachedProduct.sku})` : 'Attached file transmission');
    const attachmentsToSend = attachedImage ? [attachedImage] : [];
    const productToSend = attachedProduct || undefined;
    const isNote = isInternalNoteMode;

    // Reset input states
    setInputText('');
    setAttachedProduct(null);
    setAttachedImage(null);
    setShowEmojiPicker(false);
    setShowCannedMenu(false);
    setShowSlashMenu(false);
    if (activeCustomerId) broadcastTypingStatus(activeCustomerId, 'admin', false);

    try {
      await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeThread?.customerName || activeCustomerUser?.displayName || 'Wholesale Buyer',
        customerEmail: activeThread?.customerEmail || activeCustomerUser?.email,
        senderId: currentAdmin?.uid || currentAdmin?.id || 'admin_ops',
        senderName: currentAdmin?.displayName || 'Eagle Excel Operations',
        senderRole: 'admin',
        message: textToSend,
        attachments: attachmentsToSend,
        attachedProduct: productToSend,
        isInternalNote: isNote,
        messageType: isNote ? 'internal_note' : productToSend ? 'product_card' : 'text'
      });

      playSendSound();
      scrollToBottom('smooth');
    } catch (err) {
      showToast('Failed to dispatch message. Please retry.', 'error');
    }
  };

  // Send Voice Note from Admin
  const handleSendVoiceNote = async (audioDataUrl: string, durationSec: number) => {
    if (!activeCustomerId) return;
    setIsRecordingVoice(false);
    try {
      await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeThread?.customerName || activeCustomerUser?.displayName || 'Wholesale Buyer',
        customerEmail: activeThread?.customerEmail || activeCustomerUser?.email,
        senderId: currentAdmin?.uid || currentAdmin?.id || 'admin_ops',
        senderName: currentAdmin?.displayName || 'Eagle Excel Operations',
        senderRole: 'admin',
        message: `Voice Note (${Math.round(durationSec)}s)`,
        voiceNote: {
          url: audioDataUrl,
          duration: durationSec
        },
        messageType: 'voice_note'
      });
      playSendSound();
      scrollToBottom('smooth');
      showToast('Voice memo dispatched to buyer', 'success');
    } catch (err) {
      showToast('Failed to dispatch voice memo', 'error');
    }
  };

  // Send official quote offer
  const handleSendQuoteOffer = async (quote: ChatQuoteData) => {
    if (!activeCustomerId) return;
    try {
      await sendMessageInDatabase({
        customerId: activeCustomerId,
        customerName: activeThread?.customerName || activeCustomerUser?.displayName || 'Wholesale Buyer',
        customerEmail: activeThread?.customerEmail || activeCustomerUser?.email,
        senderId: currentAdmin?.uid || currentAdmin?.id || 'admin_ops',
        senderName: currentAdmin?.displayName || 'Eagle Excel Operations',
        senderRole: 'admin',
        message: `Commercial Pro-Forma Quotation #${quote.quoteRef} generated with ${quote.items.length} line items totaling ${formatPrice(quote.grandTotal)}. Payment Terms: ${quote.paymentTerms}. Valid for ${quote.validDays} days.`,
        quoteData: quote,
        messageType: 'quote_offer'
      });
      playSendSound();
      scrollToBottom('smooth');
    } catch (err) {
      showToast('Failed to send quotation.', 'error');
    }
  };

  // Handle reaction toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeCustomerId) return;
    try {
      await toggleMessageReaction(messageId, activeCustomerId, emoji, currentAdmin?.uid || currentAdmin?.id || 'admin_ops');
      setActiveReactionMsgId(null);
    } catch {}
  };

  // Handle delete single message in thread
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeCustomerId) return;
    if (confirm('Delete this individual message for all participants?')) {
      await deleteMessageInDatabase(messageId, activeCustomerId);
      showToast('Message deleted', 'info');
    }
  };

  // Handle Image Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setAttachedImage(dataUrl);
      showToast('Image attached. Add an optional note and click Send.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Export Transcript
  const handleExportTranscript = () => {
    if (!activeThread) return;
    const transcript = generateChatTranscriptText(activeThreadMessages, activeThread.customerName);
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EagleExcel_Chat_${activeThread.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat transcript downloaded', 'success');
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="bg-[#141414] rounded-3xl border border-white/10 shadow-2xl h-[calc(100dvh-180px)] min-h-[550px] lg:h-[780px] flex overflow-hidden font-sans relative"
    >
      {/* Drag & Drop Visual Backdrop */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-[#F27D26]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-black border-4 border-dashed border-black/40 animate-fadeIn">
          <UploadCloud className="w-16 h-16 animate-bounce mb-2" />
          <h3 className="text-xl font-black font-serif">Drop Image to Attach</h3>
          <p className="text-xs font-semibold">Release to immediately attach image to chat stream</p>
        </div>
      )}

      {/* 1. LEFT SIDEBAR: THREADS DIRECTORY */}
      <div className={`w-full md:w-80 border-r border-white/10 flex flex-col bg-[#101010] shrink-0 ${activeCustomerId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Top Header & Search */}
        <div className="p-3.5 border-b border-white/10 space-y-2.5 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">Support Channels</h3>
                <p className="text-[10px] text-zinc-400">Wholesale buyer inbox</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMarkAllThreadsAsRead}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Mark all conversations as read across platform"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Sound Alerts' : 'Unmute Sound Alerts'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              </button>
              <span className="bg-[#F27D26] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                {customerThreads.length}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search buyers, conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-black/40 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-[#F27D26] outline-none"
            />
          </div>

          {/* Filter Chips */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setThreadFilter('all')}
              className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate text-center ${
                threadFilter === 'all'
                  ? 'bg-white/15 text-white border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              All ({customerThreads.length})
            </button>
            <button
              type="button"
              onClick={() => setThreadFilter('unread')}
              className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate text-center relative ${
                threadFilter === 'unread'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Unread {unreadThreadsCount > 0 && `(${unreadThreadsCount})`}
            </button>
            <button
              type="button"
              onClick={() => setThreadFilter('deleted')}
              className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate text-center relative ${
                threadFilter === 'deleted'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : orphanedThreadsCount > 0
                  ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Deleted {orphanedThreadsCount > 0 && `(${orphanedThreadsCount})`}
            </button>
          </div>

          {/* Orphaned Cleanup Action Header Banner */}
          {orphanedThreadsCount > 0 && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-[11px] text-rose-300">
              <div className="flex items-center gap-1.5 truncate">
                <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate"><strong>{orphanedThreadsCount}</strong> deleted accounts</span>
              </div>
              <button
                type="button"
                onClick={handleOpenPurgeAllOrphaned}
                className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer shrink-0"
                title="Purge all chats belonging to deleted accounts"
              >
                Purge All
              </button>
            </div>
          )}

        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {customerThreads.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
              <p>No conversations found matching filters.</p>
              {threadFilter === 'deleted' && (
                <p className="text-[11px] text-emerald-400">All customer chats are associated with active, verified accounts!</p>
              )}
            </div>
          ) : (
            customerThreads.map((thread) => {
              const isActive = thread.customerId === activeCustomerId;
              const time = new Date(thread.lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isOrphaned = !thread.accountExists;
              
              return (
                <div
                  key={thread.customerId}
                  onClick={() => onSelectCustomer(thread.customerId)}
                  className={`p-3 cursor-pointer transition-all flex items-start gap-3 relative group ${
                    isActive
                      ? 'bg-white/10 text-white border-l-2 border-l-[#F27D26]'
                      : 'hover:bg-white/5 text-zinc-300'
                  }`}
                >
                  {/* User Avatar */}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 relative ${
                    isOrphaned 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'bg-gradient-to-br from-[#F27D26]/20 to-amber-500/10 border-white/10 text-[#F27D26]'
                  }`}>
                    {isOrphaned ? (
                      <UserX className="w-4 h-4" />
                    ) : (
                      thread.customerName.charAt(0).toUpperCase()
                    )}

                    {thread.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F27D26] text-black font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Thread Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs truncate text-white flex items-center gap-1.5">
                        <span className="truncate">{thread.customerName}</span>
                        {isOrphaned && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 shrink-0">
                            Deleted
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-zinc-500 shrink-0">{time}</span>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {typingCustomersMap[thread.customerId]?.isTyping ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                          <span className="flex gap-0.5 items-center">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" />
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce delay-100" />
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce delay-200" />
                          </span>
                          Customer is typing...
                        </span>
                      ) : thread.lastMsg.isInternalNote ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 inline" /> Internal: {thread.lastMsg.message}
                        </span>
                      ) : thread.lastMsg.quoteData ? (
                        <span className="text-[#F27D26] font-medium">📜 Pro-Forma Quote #{thread.lastMsg.quoteData.quoteRef}</span>
                      ) : thread.lastMsg.voiceNote ? (
                        <span className="text-emerald-400 font-medium">🎤 Voice Note ({Math.round(thread.lastMsg.voiceNote.duration)}s)</span>
                      ) : (
                        thread.lastMsg.message
                      )}
                    </p>
                  </div>

                  {/* Quick Delete action on hover for deleted accounts */}
                  {isOrphaned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteThread(thread.customerId, thread.customerName);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title="Delete chat history for deleted account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MAIN CHAT PANEL */}
      <div className={`flex-1 flex flex-col bg-[#121212] min-w-0 ${!activeCustomerId ? 'hidden md:flex' : 'flex'}`}>
        
        {activeThread ? (
          <>
            {/* Thread Header */}
            <div className="p-3 sm:p-3.5 bg-[#161616] border-b border-white/10 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Mobile Back to Threads Button */}
                <button
                  type="button"
                  onClick={() => onSelectCustomer('')}
                  className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white cursor-pointer shrink-0"
                  title="Back to inbox"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                  isCurrentCustomerAccountDeleted
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-[#F27D26]/10 border-white/10 text-[#F27D26]'
                }`}>
                  {isCurrentCustomerAccountDeleted ? (
                    <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    activeThread.customerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[150px] sm:max-w-none">{activeThread.customerName}</h3>
                    {isCurrentCustomerAccountDeleted ? (
                      <span className="text-[9px] sm:text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                        <UserX className="w-3 h-3" />
                        Deleted
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Verified
                      </span>
                    )}

                    {activeThreadUnreadCount > 0 ? (
                      <span className="text-[9px] sm:text-[10px] bg-[#F27D26] text-black font-extrabold px-1.5 py-0.2 rounded-full">
                        {activeThreadUnreadCount} unread
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] text-zinc-500 hidden sm:flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        All read
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                    {activeThread.customerEmail || activeCustomerUser?.email || (isCurrentCustomerAccountDeleted ? 'No active account email' : 'Commercial Account')}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Search In Chat */}
                <button
                  type="button"
                  onClick={() => setShowSearchInChat(!showSearchInChat)}
                  className={`p-1.5 sm:p-2 rounded-xl border border-white/10 transition-colors cursor-pointer ${
                    showSearchInChat ? 'bg-[#F27D26] text-black font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Search Messages"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                {/* Mark as read manual button */}
                {activeThreadUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkActiveThreadAsRead}
                    className="py-1.5 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Mark thread as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Read</span>
                  </button>
                )}

                {/* Toggle Customer Info Drawer */}
                <button
                  type="button"
                  onClick={() => setShowCustomerSidebar(!showCustomerSidebar)}
                  className={`py-1.5 px-2.5 rounded-xl border border-white/10 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    showCustomerSidebar ? 'bg-white/15 text-white' : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Customer Profile & Context"
                >
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Buyer Info</span>
                </button>

                {/* View Customer Orders */}
                {onNavigateToOrders && (
                  <button
                    type="button"
                    onClick={() => onNavigateToOrders(activeThread.customerId)}
                    className="py-1.5 px-2.5 rounded-xl border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Orders</span>
                  </button>
                )}

                {/* Create Pro-Forma Quote */}
                {!isCurrentCustomerAccountDeleted && (
                  <button
                    type="button"
                    onClick={() => setIsQuoteModalOpen(true)}
                    className="py-1.5 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs btn-hover cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Send Quote</span>
                  </button>
                )}

                {/* Export Transcript */}
                <button
                  type="button"
                  onClick={handleExportTranscript}
                  className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Export Chat Transcript"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Delete Entire Conversation Button (Highlighted if account is deleted) */}
                <button
                  type="button"
                  onClick={() => handleOpenDeleteThread(activeThread.customerId, activeThread.customerName)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isCurrentCustomerAccountDeleted
                      ? 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold'
                      : 'border-white/10 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                  title={isCurrentCustomerAccountDeleted ? 'Delete chats of deleted customer account' : 'Delete conversation thread'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Warning Banner if Customer Account is Deleted */}
            {isCurrentCustomerAccountDeleted && (
              <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 animate-fadeIn">
                <div className="flex items-center gap-2 text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>Customer Account Deleted:</strong> This user profile no longer exists in the ERP database. You can permanently delete this archived chat thread.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteThread(activeThread.customerId, activeThread.customerName)}
                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Chat History</span>
                </button>
              </div>
            )}

            {/* Pinned Active Pro-Forma Quote Bar */}
            {latestQuote && (
              <div className="bg-gradient-to-r from-[#F27D26]/15 via-amber-500/10 to-[#F27D26]/15 border-b border-[#F27D26]/30 px-3.5 py-2 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#F27D26] shrink-0" />
                  <div className="truncate">
                    <span className="font-extrabold text-[#F27D26]">Pro-Forma #{latestQuote.quoteRef}</span>
                    <span className="text-zinc-300 ml-1.5 font-semibold">
                      • Total: {formatPrice(latestQuote.grandTotal)} ({latestQuote.items.length} line items) • Terms: {latestQuote.paymentTerms}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F27D26] text-black px-2 py-0.5 rounded-full shrink-0 ml-2">
                  Active Quote
                </span>
              </div>
            )}

            {/* In-chat search bar */}
            {showSearchInChat && (
              <div className="p-2.5 bg-[#1a1a1a] border-b border-white/10 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchInConversation}
                  onChange={e => setSearchInConversation(e.target.value)}
                  placeholder="Filter messages in this conversation..."
                  className="flex-1 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#F27D26]"
                  autoFocus
                />
                {searchInConversation && (
                  <button
                    type="button"
                    onClick={() => setSearchInConversation('')}
                    className="text-xs text-zinc-400 hover:text-white px-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Chat Body + Optional Info Drawer */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Chat Stream History */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d] relative"
              >
                {activeThreadMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-xs text-zinc-300">Ready to chat with {activeThread.customerName}</h4>
                    <p className="text-[11px] max-w-xs text-zinc-500">
                      Use the canned response snippets, slash commands like /quote, or attach catalog products below.
                    </p>
                  </div>
                ) : (
                  activeThreadMessages.map((msg, index) => {
                    const isMe = msg.senderRole === 'admin';
                    const isInternal = msg.isInternalNote;
                    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // Date grouping header check
                    const prevMsg = index > 0 ? activeThreadMessages[index - 1] : undefined;
                    const showDateHeader = isDifferentChatDay(prevMsg?.createdAt, msg.createdAt);

                    return (
                      <React.Fragment key={msg.id}>
                        {/* Date separator pill */}
                        {showDateHeader && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-white/10 text-zinc-400 shadow-2xs">
                              {formatChatDateGroup(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group relative`}
                        >
                          {/* Sender label & timestamp */}
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 px-1">
                            {isInternal ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Staff Internal Note
                              </span>
                            ) : isMe ? (
                              <span className="font-semibold text-zinc-400">
                                {msg.senderName} (Operations)
                              </span>
                            ) : (
                              <span className="font-semibold text-zinc-400">
                                {msg.senderName} (Buyer)
                              </span>
                            )}
                            <span>•</span>
                            <span>{time}</span>
                            {!isMe && msg.readByAdmin && (
                              <span className="text-[9px] text-emerald-400/80 font-medium">Read</span>
                            )}
                          </div>

                          {/* Message Bubble Container */}
                          <div className="relative max-w-[85%] sm:max-w-[80%]">
                            <div
                              onClick={() => setActiveMobileActionMsgId(prev => prev === msg.id ? null : msg.id)}
                              className={`p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs cursor-pointer select-text ${
                                isInternal
                                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 rounded-tr-xs'
                                  : isMe
                                  ? 'bg-[#F27D26] text-black font-semibold rounded-tr-xs'
                                  : 'bg-[#1e1e1e] text-zinc-100 border border-white/10 rounded-tl-xs'
                              }`}
                            >
                              {/* Attached images */}
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
                                        alt="Chat attachment"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Attached Product Card */}
                              {msg.attachedProduct && (
                                <ChatProductCard product={msg.attachedProduct} isMe={isMe && !isInternal} />
                              )}

                              {/* Attached Quote Card */}
                              {msg.quoteData && (
                                <ChatQuoteCard quote={msg.quoteData} isMe={isMe && !isInternal} />
                              )}

                              {/* Voice Note Player */}
                              {msg.voiceNote && (
                                <VoiceNotePlayer audioUrl={msg.voiceNote.url} isMe={isMe && !isInternal} />
                              )}

                              {/* Text Body with rich markdown parsing */}
                              {msg.message && (
                                <div className="break-words">
                                  {renderFormattedChatMessage(msg.message)}
                                </div>
                              )}

                              {/* Read status checkmarks for admin sent messages */}
                              {isMe && !isInternal && (
                                <div className="flex justify-end mt-1 text-[10px] text-black/70">
                                  {msg.readByCustomer ? (
                                    <span title="Read by buyer">
                                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </span>
                                  ) : (
                                    <span title="Delivered to buyer">
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action Toolbar: Reaction, Copy & Delete on Hover & Mobile Tap */}
                            <div className={`absolute -top-7 ${isMe ? 'right-0 sm:right-auto sm:-left-16' : 'left-0 sm:left-auto sm:-right-16'} ${
                              activeMobileActionMsgId === msg.id ? 'flex' : 'hidden group-hover:flex'
                            } items-center gap-1 bg-[#222] p-1 rounded-xl border border-white/10 shadow-lg z-10 animate-in fade-in duration-100`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                                title="Add reaction"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (msg.message) {
                                    navigator.clipboard?.writeText(msg.message);
                                    showToast('Message copied', 'success');
                                  }
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                                title="Copy text"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(msg.id);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="p-1 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-white/10 cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Floating Emoji Selector for message */}
                            {activeReactionMsgId === msg.id && (
                              <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} z-20 max-w-[calc(100vw-32px)]`}>
                                <ChatEmojiPicker
                                  quickMode
                                  onSelectEmoji={(emoji) => handleToggleReaction(msg.id, emoji)}
                                  onClose={() => setActiveReactionMsgId(null)}
                                />
                              </div>
                            )}

                            {/* Display Reactions */}
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
                                        userList.includes(currentAdmin?.uid || currentAdmin?.id || '')
                                          ? 'bg-[#F27D26]/20 border-[#F27D26]/40 text-white'
                                          : 'bg-white/5 border-white/10 text-zinc-300'
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

                {/* Customer typing indicator */}
                {(customerIsTyping || (activeCustomerId && !!typingCustomersMap[activeCustomerId]?.isTyping)) && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 p-2 bg-white/5 rounded-2xl border border-white/10 w-fit animate-pulse shadow-xs">
                    <span className="font-semibold text-white">{activeThread.customerName} is typing</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-bounce delay-200" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />

                {/* Floating Jump to Latest Button */}
                {showScrollBottomBtn && (
                  <div className="sticky bottom-2 flex justify-center z-10 pointer-events-none">
                    <button
                      type="button"
                      onClick={() => scrollToBottom('smooth')}
                      className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-[#F27D26] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Jump to Latest</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Customer Profile & Context Drawer (Collapsible) */}
              {showCustomerSidebar && (
                <div className="w-72 bg-[#161616] border-l border-white/10 p-4 space-y-4 overflow-y-auto shrink-0 animate-in slide-in-from-right-3 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">Buyer Context Card</h4>
                    <button
                      onClick={() => setShowCustomerSidebar(false)}
                      className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-zinc-300">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold">Contact Name</div>
                      <div className="font-bold text-white text-sm">{activeThread.customerName}</div>
                      <div className="text-zinc-400">{activeThread.customerEmail || activeCustomerUser?.email || 'N/A'}</div>
                    </div>

                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold">Account Level</div>
                      <div className="flex items-center gap-1.5 font-bold">
                        {isCurrentCustomerAccountDeleted ? (
                          <span className="text-rose-400 flex items-center gap-1 font-bold">
                            <UserX className="w-3.5 h-3.5" /> Deleted Account
                          </span>
                        ) : (
                          <span className="text-[#F27D26] flex items-center gap-1 font-bold">
                            <Building2 className="w-3.5 h-3.5" /> Wholesale Enterprise
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">Total Thread Messages: {activeThreadMessages.length}</div>
                    </div>

                    {activeCustomerUser?.phone && (
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Phone / WhatsApp</div>
                        <div className="font-bold text-white">{activeCustomerUser.phone}</div>
                      </div>
                    )}

                    <div className="pt-2 space-y-2">
                      {onNavigateToOrders && (
                        <button
                          type="button"
                          onClick={() => onNavigateToOrders(activeThread.customerId)}
                          className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>View Order History</span>
                        </button>
                      )}
                      
                      {!isCurrentCustomerAccountDeleted && (
                        <button
                          type="button"
                          onClick={() => setIsQuoteModalOpen(true)}
                          className="w-full py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Draft Commercial Quote</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteThread(activeThread.customerId, activeThread.customerName)}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Chat Thread</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Composer Bar */}
            <div className="p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-[#181818] border-t border-white/10 shrink-0 space-y-2 relative">
              
              {/* Slash Command Autocomplete Popover */}
              {showSlashMenu && (
                <div className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-auto mb-2 z-50 max-w-[calc(100vw-24px)]">
                  <SlashCommandMenu
                    isAdmin
                    query={slashQuery}
                    onSelect={handleSelectSlashCommand}
                    onClose={() => setShowSlashMenu(false)}
                  />
                </div>
              )}

              {/* Attachment Previews */}
              {(attachedProduct || attachedImage) && (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                  {attachedProduct && (
                    <div className="flex items-center gap-2 text-xs text-zinc-200 min-w-0">
                      <Package className="w-4 h-4 text-[#F27D26] shrink-0" />
                      <span className="font-bold truncate">Attached: {attachedProduct.name} ({attachedProduct.sku})</span>
                    </div>
                  )}
                  {attachedImage && (
                    <div className="flex items-center gap-2 text-xs text-zinc-200">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Attached Image</span>
                      <img src={attachedImage} alt="Attached" className="w-6 h-6 rounded object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedProduct(null);
                      setAttachedImage(null);
                    }}
                    className="ml-auto p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mode Toggle & Quick Templates Toolbar */}
              <div className="flex items-center justify-between gap-2">
                
                <div className="flex items-center gap-1">
                  {/* Customer Chat vs Internal Note Mode */}
                  <button
                    type="button"
                    onClick={() => setIsInternalNoteMode(false)}
                    className={`py-1 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                      !isInternalNoteMode
                        ? 'bg-[#F27D26] text-black shadow-xs'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Reply
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInternalNoteMode(true)}
                    className={`py-1 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isInternalNoteMode
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'text-zinc-400 hover:text-amber-400 hover:bg-white/5'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    Internal
                  </button>
                </div>

                {/* Canned Responses Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCannedMenu(!showCannedMenu)}
                    className="py-1 px-2 sm:px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#F27D26]" />
                    <span>Snippets</span>
                  </button>

                  {showCannedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 max-w-[calc(100vw-32px)] bg-[#222] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 flex items-center justify-between">
                        <span>Commercial Templates</span>
                        <kbd className="px-1 py-0.5 rounded bg-black/40 text-[9px]">Click to insert</kbd>
                      </div>
                      {CANNED_RESPONSES.map(snippet => (
                        <button
                          key={snippet.id}
                          type="button"
                          onClick={() => {
                            setInputText(snippet.text);
                            setShowCannedMenu(false);
                            textareaRef.current?.focus();
                          }}
                          className="w-full p-2 rounded-xl text-left text-xs text-zinc-200 hover:text-white hover:bg-[#F27D26]/20 transition-all block cursor-pointer"
                        >
                          <div className="font-bold text-xs">{snippet.label}</div>
                          <div className="text-[10px] text-zinc-400 truncate mt-0.5">{snippet.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Voice Memo Recorder Mode */}
              {isRecordingVoice ? (
                <VoiceNoteRecorder
                  onSendVoiceNote={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                /* Main Input Form */
                <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
                  
                  {/* Secondary toolbar buttons */}
                  <div className="flex items-center gap-0.5 sm:gap-1 pb-1">
                    
                    {/* Attach Image */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                      title="Attach Spec Sheet / Image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Attach Catalog Product */}
                    <button
                      type="button"
                      onClick={() => setIsProductSelectorOpen(true)}
                      className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                      title="Attach Product from Wholesale Catalog"
                    >
                      <Package className="w-4 h-4" />
                    </button>

                    {/* Record Voice Note */}
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                      title="Record Voice Memo"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Emoji Picker toggle */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                        title="Insert Emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50 max-w-[calc(100vw-32px)]">
                          <ChatEmojiPicker
                            onSelectEmoji={(emoji) => {
                              setInputText(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Textarea with clipboard paste & shortcuts */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={e => handleInputChange(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      isInternalNoteMode
                        ? 'Type internal note...'
                        : `Message ${activeThread.customerName}...`
                    }
                    className={`flex-1 px-3 py-2 text-xs rounded-xl outline-none resize-none border max-h-32 transition-all ${
                      isInternalNoteMode
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 placeholder-amber-400/50 focus:border-amber-400'
                        : 'bg-black/50 border-white/10 text-white placeholder-zinc-500 focus:border-[#F27D26]'
                    }`}
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!(inputText || '').trim() && !attachedProduct && !attachedImage}
                    className={`p-2.5 sm:p-3 rounded-xl font-bold transition-all disabled:opacity-40 btn-hover shrink-0 cursor-pointer shadow-xs touch-manipulation ${
                      isInternalNoteMode
                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                        : 'bg-[#F27D26] hover:bg-[#e06d1a] text-black'
                    }`}
                    title={isInternalNoteMode ? 'Save Internal Note' : 'Send Message'}
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                  </button>

                </form>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-3">
            <MessageSquare className="w-12 h-12 text-zinc-700" />
            <p>Select a customer conversation from the list to view and reply.</p>
          </div>
        )}

      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        onSelectProduct={(p) => setAttachedProduct(p)}
      />

      {/* Admin Quote Modal */}
      {activeThread && (
        <AdminQuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          customerName={activeThread.customerName}
          onSendQuote={handleSendQuoteOffer}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Chat Thread Deletions */}
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        onClose={() => setDeleteConfirmDialog({ isOpen: false, type: 'single' })}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingChat}
        title={
          deleteConfirmDialog.type === 'all_orphaned'
            ? 'Purge All Deleted Customer Chats?'
            : `Delete Chat with "${deleteConfirmDialog.customerName}"?`
        }
        message={
          deleteConfirmDialog.type === 'all_orphaned' ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to purge all <strong>{deleteConfirmDialog.count || orphanedThreadsCount}</strong> chat conversation threads belonging to non-existent or deleted buyer accounts?
              </p>
              <p className="text-zinc-400">
                This will delete all associated chat messages from both local cache and database records. Active customer threads will remain untouched.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to permanently delete all messages and history for <strong>{deleteConfirmDialog.customerName}</strong>?
              </p>
              <p className="text-zinc-400">
                This will remove all communication records, attached quotes, voice memos, and transcripts for this buyer thread.
              </p>
            </div>
          )
        }
        confirmText={deleteConfirmDialog.type === 'all_orphaned' ? 'Purge Orphaned Chats' : 'Delete Chat History'}
        variant="danger"
        icon="trash"
      />

    </div>
  );
};
