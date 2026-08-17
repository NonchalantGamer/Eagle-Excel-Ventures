import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Upload, 
  Image as ImageIcon, 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  Layers, 
  AlertTriangle,
  Code,
  Send,
  Printer,
  ChevronRight,
  Sparkles,
  Database,
  Megaphone,
  Radio,
  Tag,
  BookOpen,
  HelpCircle,
  CheckSquare,
  FileText,
  Filter,
  Check,
  Zap,
  History,
  Phone, 
  Mail, 
  MapPin,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { 
  Product, 
  Order, 
  OrderStatus, 
  UserProfile, 
  UserRole, 
  Message, 
  WholesaleTier,
  PageView,
  Category 
} from '../types';
import { 
  getProductsFromDatabase, 
  createProductInDatabase, 
  updateProductInDatabase, 
  deleteProductFromDatabase, 
  seedCatalogToDatabase,
  uploadProductImage,
  getCachedProducts,
  subscribeToProducts,
  getCachedCategories,
  getCategoriesFromDatabase,
  subscribeToCategories
} from '../services/productService';
import { 
  getAllOrders, 
  updateOrderStatus, 
  subscribeToOrders,
  getLocalCachedOrders,
  deleteOrder
} from '../services/orderService';
import { 
  getAllUsers, 
  updateUserRole,
  deleteUserAccount,
  subscribeToAllUsers 
} from '../services/userService';
import { 
  getSupabaseConfig, 
  saveCustomSupabaseConfig, 
  resetSupabaseConfig, 
  isCustomSupabaseConfigActive 
} from '../lib/supabase';
import { 
  subscribeToAllMessages, 
  sendMessageInDatabase, 
  markThreadAsRead 
} from '../services/messageService';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useNotifications } from '../context/NotificationContext';
import { sendAppNotification } from '../services/notificationService';
import { INITIAL_CATEGORIES } from '../data/seedData';
import { AdminDashboardSkeleton } from './ui/Skeleton';
import { AnalyticsDashboard } from './admin/AnalyticsDashboard';
import { CategoryManagementModal } from './admin/CategoryManagementModal';
import { BroadcastManager } from './admin/BroadcastManager';
import { AdminSupportDesk } from './chat/AdminSupportDesk';
import { AdminStaffGuideModal } from './admin/AdminStaffGuideModal';
import { StaffGuidanceBanner } from './admin/StaffGuidanceBanner';
import { AdminUniversalSearch } from './admin/AdminUniversalSearch';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { UserManagementView } from './admin/UserManagementView';
import { AdminQuickActionDeck } from './admin/AdminQuickActionDeck';
import { AdminAuditLog } from './admin/AdminAuditLog';
import { useModalFocusLock } from '../hooks/useModalFocusLock';
import { playReceiveSound } from '../utils/chatAudio';
import { showBrowserNotification } from '../utils/browserNotification';
import { 
  hasMessagePopupBeenDispatched, 
  dispatchMessagePopupOnce, 
  seedInitialLoadedMessageIds 
} from '../utils/messagePopupTracker';


type AdminTab = 'overview' | 'analytics' | 'products' | 'orders' | 'customers' | 'messages' | 'broadcasts' | 'audit' | 'docs';

interface AdminDashboardProps {
  onNavigate?: (view: PageView) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentUser, userProfile, isAdmin, role, isHydrated, loading: authLoading, setSimulatedRole } = useAuth();
  const { showToast } = useToast();
  const { notifyCustomerOrderStatus } = useNotifications();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const searchParams = new URLSearchParams(hashQuery || window.location.search || '');
        const tabParam = searchParams.get('tab');
        const validTabs: AdminTab[] = ['overview', 'analytics', 'products', 'orders', 'customers', 'messages', 'broadcasts', 'audit', 'docs'];
        if (tabParam && validTabs.includes(tabParam as AdminTab)) {
          return tabParam as AdminTab;
        }
        const stored = sessionStorage.getItem('ee_admin_active_tab') || localStorage.getItem('ee_admin_active_tab');
        if (stored && validTabs.includes(stored as AdminTab)) {
          return stored as AdminTab;
        }
      }
    } catch {}
    return 'overview';
  });
  const [directBroadcastUserId, setDirectBroadcastUserId] = useState<string | null>(null);

  // Synchronize activeTab to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('ee_admin_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // Data states initialized immediately from cache
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [categories, setCategories] = useState<Category[]>(getCachedCategories);
  const [orders, setOrders] = useState<Order[]>(() => getLocalCachedOrders(null, true));
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSortBy, setOrderSortBy] = useState<string>('date_desc');
  const [orderSearch, setOrderSearch] = useState('');
  const [isStaffGuideOpen, setIsStaffGuideOpen] = useState(false);

  // Modals & Active selections
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [userToToggleRole, setUserToToggleRole] = useState<UserProfile | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('Freight Express Logistics');
  const LAST_VIEWED_ADMIN_CHAT_KEY = 'ee_last_viewed_admin_chat_customer_id';
  const [activeMessageCustomerId, setActiveMessageCustomerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ee_last_viewed_admin_chat_customer_id') || null;
    } catch {
      return null;
    }
  });
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initial Product Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('electronics');
  const [formPrice, setFormPrice] = useState('49.99');
  const [formFreight, setFormFreight] = useState('25.00');
  const [formStock, setFormStock] = useState('250');
  const [formMoq, setFormMoq] = useState('10');
  const [formUnit, setFormUnit] = useState('Master Carton (10 Units)');
  const [formDesc, setFormDesc] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formTiers, setFormTiers] = useState<WholesaleTier[]>([
    { minQty: 10, pricePerUnit: 49.99, discountPercentage: 0 },
    { minQty: 50, pricePerUnit: 44.99, discountPercentage: 10 },
    { minQty: 200, pricePerUnit: 39.99, discountPercentage: 20 }
  ]);

  // Load initial products and users in background
  const loadData = async () => {
    try {
      const [prods, allUsers] = await Promise.all([
        getProductsFromDatabase(),
        getAllUsers()
      ]);
      if (prods && prods.length > 0) setProducts(prods);
      if (allUsers && allUsers.length > 0) setUsers(allUsers);
    } catch (err) {
      console.warn('Background admin data sync:', err);
    }
  };

  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef<boolean>(false);
  const activeTabRef = useRef<AdminTab>(activeTab);
  const activeCustomerRef = useRef<string | null>(activeMessageCustomerId);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeCustomerRef.current = activeMessageCustomerId;
  }, [activeMessageCustomerId]);

  useEffect(() => {
    loadData();

    // Subscribe to Products, Orders, Messages & Users real-time
    const unsubProducts = subscribeToProducts((liveProds) => {
      if (liveProds && liveProds.length > 0) {
        setProducts(liveProds);
      }
    });

    const unsubOrders = subscribeToOrders(null, true, (newOrders) => {
      setOrders(newOrders);
    });

    const unsubMessages = subscribeToAllMessages((allMsgs) => {
      setMessages(allMsgs);

      if (!initialLoadedRef.current) {
        for (const m of allMsgs) {
          knownMessageIdsRef.current.add(m.id);
        }
        seedInitialLoadedMessageIds(allMsgs.map(m => m.id));
        initialLoadedRef.current = true;
        return;
      }

      // Check for newly arrived messages from customers
      const incomingCustomerMsgs: Message[] = [];
      for (const m of allMsgs) {
        const isAlreadyKnown = knownMessageIdsRef.current.has(m.id) || hasMessagePopupBeenDispatched(m.id);
        if (!isAlreadyKnown) {
          knownMessageIdsRef.current.add(m.id);
          if (m.senderRole === 'customer') {
            incomingCustomerMsgs.push(m);
          }
        }
      }

      if (incomingCustomerMsgs.length > 0) {
        // Dispatch notifications to immediately appear in the admin's notification icon in the header once
        incomingCustomerMsgs.forEach(msg => {
          const previewText = msg.message.length > 90 ? `${msg.message.substring(0, 87)}...` : msg.message;
          sendAppNotification({
            userId: 'all_admins',
            recipientRole: 'admin',
            type: 'new_message',
            title: `💬 Inquiry from ${msg.customerName || 'Wholesale Buyer'}`,
            message: previewText,
            referenceId: msg.customerId,
            targetView: 'admin',
            importance: 'high',
            isImportant: true,
            status: 'new'
          }).catch(() => {});
        });

        // Trigger pop up notification strictly once per message
        incomingCustomerMsgs.forEach(msg => {
          dispatchMessagePopupOnce(msg.id, () => {
            const isCurrentlyChatting = activeTabRef.current === 'messages' && activeCustomerRef.current === msg.customerId;

            if (!isCurrentlyChatting) {
              playReceiveSound();

              const preview = msg.message.length > 80 ? `${msg.message.substring(0, 77)}...` : msg.message;
              showToast(`💬 New inquiry from ${msg.customerName || 'Wholesale Buyer'}: "${preview}"`, {
                type: 'info',
                duration: 8000,
                action: {
                  label: 'Open Thread',
                  onClick: () => {
                    setActiveTab('messages');
                    setActiveMessageCustomerId(msg.customerId);
                    markThreadAsRead(msg.customerId, 'admin');
                  }
                }
              });

              showBrowserNotification(`💬 Wholesale Inquiry - ${msg.customerName || 'Customer'}`, {
                body: msg.message,
                tag: `admin_msg_${msg.id}`,
                onClick: () => {
                  setActiveTab('messages');
                  setActiveMessageCustomerId(msg.customerId);
                  markThreadAsRead(msg.customerId, 'admin');
                }
              });
            }
          });
        });
      }
    });

    const unsubUsers = subscribeToAllUsers((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        setUsers(liveUsers);
      }
    });

    // Support opening a specific customer chat when clicked from the header notification dropdown or navigation
    const handleOpenAdminChat = (e: Event) => {
      const customEvt = e as CustomEvent<{ customerId?: string }>;
      setActiveTab('messages');
      const targetCid = customEvt.detail?.customerId || (() => {
        try {
          return localStorage.getItem(LAST_VIEWED_ADMIN_CHAT_KEY);
        } catch {
          return null;
        }
      })();

      if (targetCid) {
        setActiveMessageCustomerId(targetCid);
        try {
          localStorage.setItem(LAST_VIEWED_ADMIN_CHAT_KEY, targetCid);
        } catch {}
        markThreadAsRead(targetCid, 'admin');
      }
    };
    window.addEventListener('ee_open_admin_chat', handleOpenAdminChat);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubMessages();
      unsubUsers();
      window.removeEventListener('ee_open_admin_chat', handleOpenAdminChat);
    };
  }, []);

  useModalFocusLock(isProductModalOpen, () => setIsProductModalOpen(false));
  useModalFocusLock(Boolean(shippingModalOrder), () => setShippingModalOrder(null));
  useModalFocusLock(Boolean(selectedOrder), () => setSelectedOrder(null));

  // Compute analytics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const lowStockProducts = products.filter(p => p.stock < 100);
  const unreadMessagesCount = messages.filter(m => m.senderRole === 'customer' && !m.readByAdmin).length;

  // Group messages into customer threads
  const customerThreads = useMemo(() => {
    const threadMap: Record<string, { customerId: string; customerName: string; lastMsg: Message; unreadCount: number }> = {};
    for (const msg of messages) {
      if (!threadMap[msg.customerId]) {
        threadMap[msg.customerId] = {
          customerId: msg.customerId,
          customerName: msg.customerName || 'Customer',
          lastMsg: msg,
          unreadCount: 0
        };
      }
      if (msg.senderRole === 'customer' && !msg.readByAdmin) {
        threadMap[msg.customerId].unreadCount += 1;
      }
    }
    return Object.values(threadMap);
  }, [messages]);

  // Auto-select last viewed thread or first available thread if not selected
  useEffect(() => {
    if (customerThreads.length > 0) {
      if (!activeMessageCustomerId) {
        try {
          const savedLastViewed = localStorage.getItem(LAST_VIEWED_ADMIN_CHAT_KEY);
          if (savedLastViewed && customerThreads.some(t => t.customerId === savedLastViewed)) {
            setActiveMessageCustomerId(savedLastViewed);
            return;
          }
        } catch {}
        setActiveMessageCustomerId(customerThreads[0].customerId);
      }
    }
  }, [customerThreads, activeMessageCustomerId]);

  const handleSelectMessageCustomer = useCallback((cId: string | null) => {
    setActiveMessageCustomerId(cId);
    try {
      if (cId) {
        localStorage.setItem(LAST_VIEWED_ADMIN_CHAT_KEY, cId);
      }
    } catch {}
  }, []);

  // Lock body scroll when any modal is open to ensure pristine overlay positioning
  useEffect(() => {
    if (isProductModalOpen || shippingModalOrder || selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProductModalOpen, shippingModalOrder, selectedOrder]);

  // Handle Product Add/Edit Modal
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormSku(product.sku);
      setFormCategory(product.category);
      setFormPrice(product.price.toString());
      setFormFreight(product.estimatedFreight !== undefined ? product.estimatedFreight.toString() : '25.00');
      setFormStock(product.stock.toString());
      setFormMoq(product.minOrderQty.toString());
      setFormUnit(product.unit);
      setFormDesc(product.description);
      setFormImages(product.images || []);
      setFormTiers(product.wholesaleTiers || []);
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku(`EE-${Math.floor(100 + Math.random() * 900)}`);
      setFormCategory('electronics');
      setFormPrice('45.00');
      setFormFreight('25.00');
      setFormStock('500');
      setFormMoq('10');
      setFormUnit('Master Carton (10 Units)');
      setFormDesc('High-grade commercial wholesale inventory item manufactured for enterprise distribution.');
      setFormImages(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80']);
      setFormTiers([
        { minQty: 10, pricePerUnit: 45.00, discountPercentage: 0 },
        { minQty: 50, pricePerUnit: 39.00, discountPercentage: 13 },
        { minQty: 200, pricePerUnit: 32.50, discountPercentage: 28 }
      ]);
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Product Name is required.', 'error');
      return;
    }
    if (!formSku.trim()) {
      showToast('SKU item code is required.', 'error');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Please provide a valid price.', 'error');
      return;
    }

    const freightNum = parseFloat(formFreight);
    const validFreight = !isNaN(freightNum) && freightNum >= 0 ? freightNum : 0;

    const stockNum = parseInt(formStock);
    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Please provide a valid stock quantity.', 'error');
      return;
    }

    const moqNum = parseInt(formMoq);
    if (isNaN(moqNum) || moqNum < 1) {
      showToast('Minimum Order Quantity (MOQ) must be at least 1.', 'error');
      return;
    }

    // Auto-include any pending image URL typed into input
    let finalImages = [...formImages];
    if (newImageUrl.trim() && !finalImages.includes(newImageUrl.trim())) {
      finalImages.push(newImageUrl.trim());
      setNewImageUrl('');
    }
    if (finalImages.length === 0) {
      finalImages = ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'];
    }

    const payload = {
      name: formName.trim(),
      sku: formSku.trim().toUpperCase(),
      category: formCategory,
      price: priceNum,
      estimatedFreight: validFreight,
      stock: stockNum,
      minOrderQty: moqNum,
      unit: formUnit.trim() || 'Master Carton (10 Units)',
      description: formDesc.trim() || `${formName.trim()} commercial inventory item.`,
      images: finalImages,
      wholesaleTiers: formTiers.length > 0 ? formTiers : [
        { minQty: moqNum, pricePerUnit: priceNum, discountPercentage: 0 }
      ],
      specs: editingProduct?.specs || {
        'Packaging Type': formUnit.trim() || 'Master Carton',
        'Compliance': 'Standard ISO9001 Commercial',
        'Lead Time': '1-3 Business Days Freight Dispatch'
      }
    };

    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        const updated = await updateProductInDatabase(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        showToast(`Product "${payload.name}" updated successfully!`);
      } else {
        const created = await createProductInDatabase(payload);
        setProducts(prev => [created, ...prev.filter(p => p.id !== created.id)]);
        showToast(`New product "${payload.name}" published to catalog!`);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadData().catch(() => {});
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('Failed to save product.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Image Upload handler
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    setUploadProgress(10);

    try {
      const file = files[0];
      const uploadedUrl = await uploadProductImage(file, (progress) => {
        setUploadProgress(progress);
      });
      setFormImages(prev => [...prev, uploadedUrl]);
      showToast('Product image uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('Failed to upload image.', 'error');
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormImages(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  // Handle Order Status Changes
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'shipped') {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        setShippingModalOrder(targetOrder);
        setTrackingNumberInput(`TRK-EE-${Math.floor(100000 + Math.random() * 900000)}`);
        return;
      }
    }

    try {
      await updateOrderStatus(orderId, newStatus);
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        notifyCustomerOrderStatus(targetOrder.orderNumber, newStatus, targetOrder.trackingNumber);
      }
      showToast(`Order status updated to "${newStatus}".`);
    } catch (err) {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleConfirmShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder) return;

    try {
      await updateOrderStatus(
        shippingModalOrder.id, 
        'shipped', 
        trackingNumberInput.trim(), 
        carrierInput.trim()
      );
      notifyCustomerOrderStatus(
        shippingModalOrder.orderNumber, 
        'shipped', 
        trackingNumberInput.trim()
      );
      showToast(`Order ${shippingModalOrder.orderNumber} marked as SHIPPED with carrier ${carrierInput}!`);
      setShippingModalOrder(null);
    } catch (err) {
      showToast('Failed to update shipping info.', 'error');
    }
  };

  // Handle User Role Toggle
  const handleToggleUserRole = (targetUser: UserProfile) => {
    setUserToToggleRole(targetUser);
  };

  const confirmToggleUserRole = async () => {
    if (!userToToggleRole) return;
    const newRole: UserRole = userToToggleRole.role === 'admin' ? 'customer' : 'admin';
    try {
      await updateUserRole(userToToggleRole.id, newRole, userToToggleRole.email);
      showToast(`Updated ${userToToggleRole.displayName || userToToggleRole.email}'s role to ${newRole === 'admin' ? 'Administrator' : 'Wholesale Buyer'}. Role is permanently active.`);
      setUserToToggleRole(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update user role.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUser?.uid === userId || currentUser?.id === userId) {
      showToast('You cannot delete your own active administrator account.', 'error');
      return;
    }
    try {
      await deleteUserAccount(userId);
      showToast(`User account "${userName}" was permanently deleted.`);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete user account.', 'error');
      throw err;
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProductAction = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await deleteProductFromDatabase(productToDelete.id);
      showToast(`Removed product "${productToDelete.name}".`);
      setProductToDelete(null);
      loadData().catch(() => {});
    } catch (err) {
      showToast('Failed to delete product.', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const confirmDeleteOrderAction = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const success = await deleteOrder(orderToDelete.id);
      if (success) {
        showToast(`Purchase order #${orderToDelete.orderNumber} deleted successfully.`);
        setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
        if (selectedOrder?.id === orderToDelete.id) {
          setSelectedOrder(null);
        }
        setOrderToDelete(null);
      } else {
        showToast('Failed to delete purchase order.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete purchase order.', 'error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const count = await seedCatalogToDatabase();
      showToast(`Successfully seeded ${count || 8} products into database!`);
      setIsSeedConfirmOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to seed catalog.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Handle Admin Message Reply
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeMessageCustomerId) return;

    const thread = customerThreads.find(t => t.customerId === activeMessageCustomerId);

    try {
      await sendMessageInDatabase({
        threadId: activeMessageCustomerId,
        customerId: activeMessageCustomerId,
        customerName: thread?.customerName || 'Wholesale Buyer',
        customerEmail: thread?.lastMsg.customerEmail || '',
        senderId: currentUser?.uid || 'admin_ops',
        senderName: userProfile?.displayName || 'Operations Desk',
        senderRole: 'admin',
        message: adminReplyText.trim()
      });
      setAdminReplyText('');
      showToast('Reply dispatched to customer!');
    } catch (err) {
      showToast('Failed to send reply.', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());
    
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;

    const matchesStock = 
      productStockFilter === 'all' ||
      (productStockFilter === 'in_stock' && p.stock >= 100) ||
      (productStockFilter === 'low_stock' && p.stock > 0 && p.stock < 100) ||
      (productStockFilter === 'out_of_stock' && p.stock <= 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const filteredOrders = useMemo(() => {
    // 1. Filter
    const filtered = orders.filter(o => {
      let matchesStatus = true;
      if (orderFilter === 'all') {
        matchesStatus = true;
      } else if (orderFilter === 'confirmed' || orderFilter === 'paid') {
        matchesStatus = o.paymentStatus === 'paid' || o.status === 'confirmed';
      } else if (orderFilter === 'pending') {
        matchesStatus = o.status === 'pending' || o.paymentStatus === 'pending';
      } else if (orderFilter === 'cancelled') {
        matchesStatus = o.status === 'cancelled';
      } else if (orderFilter === 'failed') {
        matchesStatus = o.paymentStatus === 'failed';
      } else {
        matchesStatus = o.status === orderFilter;
      }

      const term = orderSearch.toLowerCase().trim();
      const matchesSearch = !term ||
        o.orderNumber.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.companyName && o.companyName.toLowerCase().includes(term)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(term)) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(term)) ||
        o.items.some(i => i.name.toLowerCase().includes(term) || (i.sku && i.sku.toLowerCase().includes(term)));

      return matchesStatus && matchesSearch;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      switch (orderSortBy) {
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount_desc':
          return (b.total || 0) - (a.total || 0);
        case 'amount_asc':
          return (a.total || 0) - (b.total || 0);
        case 'status_priority': {
          const getRank = (ord: Order) => {
            if (ord.paymentStatus === 'paid' || ord.status === 'confirmed') return 1;
            if (ord.status === 'processing') return 2;
            if (ord.status === 'shipped') return 3;
            if (ord.status === 'delivered') return 4;
            if (ord.status === 'pending') return 5;
            if (ord.status === 'cancelled') return 6;
            if (ord.paymentStatus === 'failed') return 7;
            return 8;
          };
          return getRank(a) - getRank(b);
        }
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [orders, orderFilter, orderSortBy, orderSearch]);

  const activeThreadMessages = messages.filter(m => m.customerId === activeMessageCustomerId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if ((!isHydrated || authLoading || isLoading) && products.length === 0 && orders.length === 0) {
    return <AdminDashboardSkeleton />;
  }

  if (isHydrated && !isAdmin) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-[#F27D26]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
            Administrative Access Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto">
            This console is strictly restricted to authorized Eagle Excel Ventures administrators. Only accounts explicitly granted administrator privileges by the executive director can access these features.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => onNavigate?.('catalog')}
            className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs transition-colors cursor-pointer"
          >
            Return to Product Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 sm:py-4 space-y-6 animate-fadeIn text-slate-900 dark:text-zinc-100">
      
      {/* Top Banner with Role Indicator & Search Bar */}
      <div className="bg-slate-900 dark:bg-gradient-to-r dark:from-[#181818] dark:via-[#141414] dark:to-[#0d0d0d] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 dark:border-white/5 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26] font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-serif">
                  Eagle Excel Operations & Admin Console
                </h1>
                <span className="bg-[#F27D26] text-black font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full">
                  Live Admin
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Supabase Synced
                </span>
              </div>
              <p className="text-xs text-slate-300 dark:text-zinc-400 mt-0.5">
                Logged in as: <strong className="text-white">{userProfile?.displayName || currentUser?.displayName || 'Joshua Egesienyinnaya'}</strong> ({userProfile?.email || currentUser?.email || 'admin@eagleexcel.com'}) • Super Administrator
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsStaffGuideOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] border border-[#F27D26]/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Open full Employee Operating Manual and SOP Guide"
            >
              <BookOpen className="w-4 h-4 text-[#F27D26]" />
              <span>Staff SOP Manual</span>
            </button>
            <button
              onClick={() => {
                setDirectBroadcastUserId(null);
                setActiveTab('broadcasts');
              }}
              className="py-2 px-3.5 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer btn-hover"
              title="Compose and broadcast announcement or promotional update to registered buyers"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Send Broadcast</span>
            </button>
            <button
              onClick={() => setIsSeedConfirmOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-100 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Seed initial wholesale catalog products into database"
            >
              <Database className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Seed Catalog</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-colors cursor-pointer"
              title="Reload Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integrated Universal Fast Search */}
        <div className="pt-2 border-t border-slate-800 dark:border-white/5">
          <AdminUniversalSearch
            products={products}
            orders={orders}
            users={users}
            onSelectTab={(tab) => setActiveTab(tab as AdminTab)}
            onSelectProduct={(p) => {
              setActiveTab('products');
              setProductSearch(p.sku);
            }}
            onSelectOrder={(o) => {
              setSelectedOrder(o);
              setActiveTab('orders');
            }}
            onOpenProductModal={() => openProductModal()}
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            onOpenStaffManual={() => setIsStaffGuideOpen(true)}
          />
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 dark:bg-[#121212] p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap btn-hover ${
            activeTab === 'overview'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap btn-hover ${
            activeTab === 'analytics'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics & Trade Visuals</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap btn-hover ${
            activeTab === 'products'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Inventory ({products.length})</span>
          {lowStockProducts.length > 0 && (
            <span className="bg-amber-500 text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {lowStockProducts.length} low
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap relative btn-hover ${
            activeTab === 'orders'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Orders & Dispatch ({orders.length})</span>
          {pendingOrders.length > 0 && (
            <span className="bg-[#F27D26] text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap btn-hover ${
            activeTab === 'customers'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customers & RBAC ({users.length})</span>
        </button>

        <button
          onClick={() => {
            setDirectBroadcastUserId(null);
            setActiveTab('broadcasts');
          }}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap relative btn-hover ${
            activeTab === 'broadcasts'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast & Promos</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap relative btn-hover ${
            activeTab === 'messages'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Support Helpdesk</span>
          {unreadMessagesCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap relative btn-hover ${
            activeTab === 'audit'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit & Sync Trail</span>
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap btn-hover ${
            activeTab === 'docs'
              ? 'bg-[#F27D26] text-black font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Supabase & Architecture Guide</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* SOP Guidance Banner for Overview */}
          <StaffGuidanceBanner
            title="Operations Command Deck & Shift Briefing"
            description="Welcome to the Eagle Excel Operations Console. Monitor wholesale commercial orders, replenish inventory thresholds, broadcast announcements, and coordinate live support for enterprise buyers across West Africa."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="overview"
            tips={[
              "Review & Fulfill Pending Purchase Orders: Clear pending commercial orders before the daily carrier cutoff.",
              "Live Support Desk: Answer inbound inquiries and issue official Pro-Forma Quotations with custom freight fees.",
              "Safety Threshold Alerts: Restock items running below 100 units to ensure prompt delivery for master cartons.",
              "Trade Broadcasts: Notify registered accounts in Nigeria & Cameroon when new container shipments arrive at port."
            ]}
          />
          
          {/* Shift Morning Operations Action Deck */}
          <div className="bg-slate-900 dark:bg-[#121212] text-white rounded-3xl p-5 sm:p-6 border border-slate-800 dark:border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2 font-serif">
                  <Zap className="w-4 h-4 text-[#F27D26]" />
                  <span>Daily Operations Command & Action Deck</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any actionable card below to immediately jump into that operational workflow.
                </p>
              </div>
              <button
                onClick={() => setIsStaffGuideOpen(true)}
                className="text-xs text-[#F27D26] hover:underline flex items-center gap-1 font-semibold self-start sm:self-auto cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" /> Read Full Staff SOP Guide
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Card 1: Pending Orders */}
              <div 
                onClick={() => {
                  setOrderFilter('pending');
                  setActiveTab('orders');
                }}
                className="bg-slate-800/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-700/60 dark:border-white/5 hover:border-[#F27D26]/50 cursor-pointer transition-all hover:bg-slate-800 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">1. Orders to Fulfill</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    pendingOrders.length > 0 ? 'bg-[#F27D26] text-black animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {pendingOrders.length > 0 ? `${pendingOrders.length} Pending` : 'All Clear'}
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-2 flex items-center justify-between">
                  <span>{pendingOrders.length} POs</span>
                  <ShoppingCart className="w-5 h-5 text-slate-500 group-hover:text-[#F27D26] transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 text-[#F27D26] font-semibold">
                  <span>Review & Dispatch Freight</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 2: Live Support Inquiries */}
              <div 
                onClick={() => setActiveTab('messages')}
                className="bg-slate-800/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-700/60 dark:border-white/5 hover:border-emerald-500/50 cursor-pointer transition-all hover:bg-slate-800 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">2. Live Buyer Helpdesk</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    unreadMessagesCount > 0 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {unreadMessagesCount > 0 ? `${unreadMessagesCount} Unread` : 'Up to Date'}
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-2 flex items-center justify-between">
                  <span>{unreadMessagesCount} Messages</span>
                  <MessageSquare className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 text-emerald-400 font-semibold">
                  <span>Reply & Issue Pro-Formas</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 3: Low Stock Alerts */}
              <div 
                onClick={() => {
                  setProductStockFilter('low_stock');
                  setActiveTab('products');
                }}
                className="bg-slate-800/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-700/60 dark:border-white/5 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-slate-800 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">3. Inventory Thresholds</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    lowStockProducts.length > 0 ? 'bg-amber-500 text-black' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {lowStockProducts.length > 0 ? `${lowStockProducts.length} Low Stock` : 'Healthy'}
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-2 flex items-center justify-between">
                  <span>{lowStockProducts.length} SKUs</span>
                  <AlertTriangle className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 text-amber-400 font-semibold">
                  <span>Replenish Inventory</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 4: Broadcasts */}
              <div 
                onClick={() => {
                  setDirectBroadcastUserId(null);
                  setActiveTab('broadcasts');
                }}
                className="bg-slate-800/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-700/60 dark:border-white/5 hover:border-purple-500/50 cursor-pointer transition-all hover:bg-slate-800 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">4. Push Broadcasts</span>
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Direct Channel
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-2 flex items-center justify-between">
                  <span>{users.filter(u => u.role === 'customer').length || users.length} Buyers</span>
                  <Megaphone className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 text-purple-400 font-semibold">
                  <span>Launch Trade Promo</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>

            {/* Quick Actions Row */}
            <div className="pt-2 border-t border-slate-800 dark:border-white/5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Quick Actions:</span>
              <button
                onClick={() => openProductModal()}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#F27D26]" /> + Add Wholesale SKU
              </button>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#F27D26]" /> Manage Categories
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#F27D26]" /> Fulfill Orders
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" /> Live Support Desk
              </button>
              <button
                onClick={() => setIsStaffGuideOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-[#F27D26]/20 hover:bg-[#F27D26]/30 text-[#F27D26] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
              >
                <BookOpen className="w-3.5 h-3.5" /> Staff SOP Guide
              </button>
            </div>

          </div>
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Gross Wholesale Volume</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                  ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% month-over-month
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Purchase Orders</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                  {orders.length}
                </div>
                <div className="text-[11px] text-[#F27D26] font-semibold mt-1">
                  {orders.filter(o => o.status === 'delivered').length} Fulfilled
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Pending Review & Dispatch</span>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {pendingOrders.length}
                </div>
                <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-semibold mt-1">
                  Action required for freight
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Active Wholesale Buyers</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                  {users.length || 1}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-1">
                  Enterprise commercial accounts
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Quick Broadcast Campaign CTA Banner */}
          <div className="bg-linear-to-r from-amber-500/10 via-[#F27D26]/10 to-orange-500/10 border border-[#F27D26]/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#F27D26] text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Wholesale Broadcast & Promotional Push</span>
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live Channel
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  Send instant tariff updates, container arrival notices, flash promos, or discount codes to all {users.filter(u => u.role === 'customer').length || users.length} registered buyers in Nigeria & Cameroon.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setDirectBroadcastUserId(null);
                setActiveTab('broadcasts');
              }}
              className="py-2.5 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs btn-hover"
            >
              <span>Launch Campaign</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Action Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Inventory Replenishment Notice:</span> {lowStockProducts.length} wholesale SKUs are running below safety threshold (e.g. {lowStockProducts.map(p => p.sku).join(', ')}).
              </div>
              <button
                onClick={() => {
                  setProductStockFilter('low_stock');
                  setActiveTab('products');
                }}
                className="font-bold text-amber-400 underline hover:text-amber-300 cursor-pointer"
              >
                Manage Stock
              </button>
            </div>
          )}

          {/* Operational Quick Action Deck, Shift Checklist & Wholesale Glossary */}
          <AdminQuickActionDeck
            pendingOrdersCount={pendingOrders.length}
            lowStockCount={lowStockProducts.length}
            unreadMessagesCount={unreadMessagesCount}
            totalUsersCount={users.length}
            onOpenProductModal={() => openProductModal()}
            onNavigateTab={(tab) => {
              if (tab === 'products' || tab === 'orders' || tab === 'messages' || tab === 'customers' || tab === 'broadcasts' || tab === 'analytics' || tab === 'docs') {
                setActiveTab(tab as AdminTab);
              }
            }}
            onOpenStaffGuide={() => setIsStaffGuideOpen(true)}
          />

          {/* Recent Orders Overview */}

          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Recent Commercial Purchase Orders</h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-semibold text-[#F27D26] hover:text-[#e06d1a] flex items-center gap-1 cursor-pointer"
              >
                View All Orders <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-500 py-6 text-center">No orders recorded in database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-white/5">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Company / Buyer</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total Value</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-zinc-100">{o.orderNumber}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{o.companyName || o.customerName}</td>
                        <td className="p-3 text-slate-600 dark:text-zinc-400">{o.items.length} SKUs</td>
                        <td className="p-3 font-bold text-[#F27D26]">${o.total.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            o.status === 'shipped' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300' :
                            o.status === 'processing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' :
                            o.status === 'cancelled' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="text-[#F27D26] hover:text-[#e06d1a] font-semibold cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB: B2B TRADE & REGIONAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <AnalyticsDashboard orders={orders} products={products} />
      )}

      {/* TAB 2: PRODUCT MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">

          {/* SOP Guidance Banner for Products */}
          <StaffGuidanceBanner
            title="Wholesale Inventory & SKU Management SOP"
            description="Manage your enterprise product catalog. Set base unit pricing, define tiered volume rate schedules, configure Minimum Order Quantities (MOQs), and upload high-res commercial imagery."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="products"
            tips={[
              "Pricing & Bulk Discounts: Tiered volume schedules are automatically applied in the buyer's checkout cart based on quantity ordered.",
              "MOQ Enforcement: Always set the Minimum Order Quantity to match master carton packaging (e.g., MOQ 50 for carton packaging).",
              "Instant Multi-Device Sync: Any SKU modifications or stock adjustments made here propagate immediately to all buyer devices via Supabase real-time channels.",
              "Safety Stock Restock: Products with under 100 units trigger low-stock alerts on the dashboard overview."
            ]}
          />
          
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search by product name or SKU..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder-slate-400 dark:placeholder-zinc-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Layers className="w-4 h-4 text-[#F27D26]" />
                  <span>Manage Categories</span>
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('manage-products')}
                    className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Package className="w-4 h-4" />
                    <span>Dedicated Catalog Manager</span>
                  </button>
                )}
                <button
                  onClick={() => openProductModal()}
                  className="w-full sm:w-auto py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 btn-hover whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Wholesale Product</span>
                </button>
              </div>
            </div>

            {/* Quick Category & Stock Level Filter Chips */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase shrink-0">Category:</span>
                <button
                  onClick={() => setProductCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    productCategoryFilter === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  All Categories ({products.length})
                </button>
                {['electronics', 'building', 'textiles', 'machinery', 'packaging', 'industrial', 'safety'].map((cat) => {
                  const count = products.filter(p => p.category?.toLowerCase() === cat).length;
                  if (count === 0 && !categories.some(c => c.id === cat)) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setProductCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-colors cursor-pointer ${
                        productCategoryFilter === cat
                          ? 'bg-[#F27D26] text-black font-bold'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Stock Status Filter Chips */}
              <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none pb-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase shrink-0">Stock:</span>
                <button
                  onClick={() => setProductStockFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    productStockFilter === 'all'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 hover:bg-slate-200'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  onClick={() => setProductStockFilter('in_stock')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    productStockFilter === 'in_stock'
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  In Stock ({products.filter(p => p.stock >= 100).length})
                </button>
                <button
                  onClick={() => setProductStockFilter('low_stock')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    productStockFilter === 'low_stock'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  Low Stock ({lowStockProducts.length})
                </button>
                <button
                  onClick={() => setProductStockFilter('out_of_stock')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    productStockFilter === 'out_of_stock'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Out ({products.filter(p => p.stock <= 0).length})
                </button>
              </div>

            </div>

          </div>

          {/* Product Inventory Table */}
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
              <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> wholesale SKUs</span>
              {(productSearch || productCategoryFilter !== 'all' || productStockFilter !== 'all') && (
                <button
                  onClick={() => {
                    setProductSearch('');
                    setProductCategoryFilter('all');
                    setProductStockFilter('all');
                  }}
                  className="text-[#F27D26] hover:underline font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="p-3.5">Product & SKU</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Base Unit Price</th>
                    <th className="p-3.5">Bulk Tier Pricing</th>
                    <th className="p-3.5">Stock Level</th>
                    <th className="p-3.5">MOQ</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                        No products match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img
                            src={product.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=80'}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">{product.name}</div>
                            <div className="text-[10px] font-mono text-[#F27D26] font-bold">SKU: {product.sku}</div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">{product.unit || 'Master Carton'}</div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-semibold px-2 py-0.5 rounded uppercase text-[10px] border border-slate-200 dark:border-white/5">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-zinc-100 text-sm">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {product.wholesaleTiers && product.wholesaleTiers.length > 0 ? (
                              product.wholesaleTiers.map((t, idx) => (
                                <span key={idx} className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5 text-zinc-300">
                                  {t.minQty}+: ${t.pricePerUnit.toFixed(2)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Base rate only</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            product.stock > 100 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            product.stock > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700 dark:text-zinc-300">
                          {product.minOrderQty || 1} units
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openProductModal(product)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-[#F27D26] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ORDER MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">

          {/* SOP Guidance Banner for Orders */}
          <StaffGuidanceBanner
            title="4-Stage Purchase Order Fulfillment Pipeline SOP"
            description="Manage inbound commercial purchase orders from wholesale buyers across West Africa. Follow the standard fulfillment stages to dispatch cargo with accredited freight carriers."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="orders"
            tips={[
              "Stage 1 (Pending Review): Verify payment method (Wire, Net 30, COD, Card). Confirm buyer company details.",
              "Stage 2 (Processing): Direct warehouse team to pick, pack master cartons, and strap freight pallets.",
              "Stage 3 (Shipped): Changing status to 'Shipped' opens the Dispatch Modal. Enter Carrier name (e.g., FedEx Freight, Maersk, Bolloré) and PRO tracking number.",
              "Stage 4 (Delivered): Confirmed receipt at buyer warehouse or seaport clearing terminal."
            ]}
          />
          
          {/* Order Filters & Controls */}
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none pb-1 lg:pb-0">
                {[
                  { id: 'all', label: 'All Orders', count: orders.length },
                  { id: 'pending', label: 'Pending Review', count: pendingOrders.length },
                  { id: 'confirmed', label: 'Confirmed / Paid', count: orders.filter(o => o.status === 'confirmed' || o.paymentStatus === 'paid').length },
                  { id: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
                  { id: 'shipped', label: 'In Transit', count: orders.filter(o => o.status === 'shipped').length },
                  { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
                  { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
                  { id: 'failed', label: 'Failed', count: orders.filter(o => o.paymentStatus === 'failed').length }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setOrderFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      orderFilter === st.id
                        ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      orderFilter === st.id ? 'bg-black/20 text-black font-extrabold' : 'bg-white/10 text-slate-500 dark:text-zinc-400'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                {/* Sorting dropdown */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-700 dark:text-zinc-300 w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                  <span className="font-semibold text-slate-500 dark:text-zinc-400 hidden xl:inline">Sort:</span>
                  <select
                    value={orderSortBy}
                    onChange={(e) => setOrderSortBy(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 dark:text-zinc-100 outline-none cursor-pointer text-xs w-full sm:w-auto"
                  >
                    <option value="date_desc" className="bg-white dark:bg-[#161616]">Date: Newest First</option>
                    <option value="date_asc" className="bg-white dark:bg-[#161616]">Date: Oldest First</option>
                    <option value="amount_desc" className="bg-white dark:bg-[#161616]">Total Amount: High to Low</option>
                    <option value="amount_asc" className="bg-white dark:bg-[#161616]">Total Amount: Low to High</option>
                    <option value="status_priority" className="bg-white dark:bg-[#161616]">Status: Paid → Pending → Cancelled</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search PO #, buyer or company..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder-slate-400 dark:placeholder-zinc-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="p-3.5">PO Number</th>
                    <th className="p-3.5">Buyer & Business</th>
                    <th className="p-3.5">Ordered Items</th>
                    <th className="p-3.5">Total Invoiced</th>
                    <th className="p-3.5">Payment Term</th>
                    <th className="p-3.5">Status Update</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                        No purchase orders found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                      const isDeletable = order.status === 'cancelled' || order.paymentStatus === 'failed';
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-zinc-100">
                            {order.orderNumber}
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-zinc-100">{order.companyName || order.customerName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">{order.customerEmail}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 dark:text-zinc-200 font-semibold">{order.items.length} line items</div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                              {order.items.reduce((s, i) => s + i.quantity, 0)} total units
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-[#F27D26] text-sm">
                            ${order.total.toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/5">
                              {order.paymentMethod?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                                className="bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-lg px-2.5 py-1 text-xs font-semibold focus:border-[#F27D26] outline-none cursor-pointer"
                              >
                                <option value="pending">Pending Review</option>
                                <option value="confirmed">Confirmed & Paid</option>
                                <option value="processing">Processing & Packing</option>
                                <option value="shipped">Shipped / In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              {order.paymentStatus === 'paid' ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  ✓ Paid {order.flwTransactionId ? `(#${order.flwTransactionId})` : ''}
                                </span>
                              ) : order.paymentStatus === 'failed' ? (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                  ✕ Payment Failed
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  ⏳ Payment Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="py-1 px-2.5 rounded-lg bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] font-semibold text-xs transition-colors cursor-pointer"
                              >
                                View PO
                              </button>
                              {isDeletable && (
                                <button
                                  onClick={() => setOrderToDelete(order)}
                                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer"
                                  title="Delete failed or cancelled transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: CUSTOMER DIRECTORY & RBAC */}
      {activeTab === 'customers' && (
        <UserManagementView
          users={users}
          orders={orders}
          messages={messages}
          currentUser={currentUser}
          onRefreshUsers={loadData}
          onToggleUserRole={handleToggleUserRole}
          onDirectBroadcast={(userId) => {
            setDirectBroadcastUserId(userId === 'ALL' ? null : userId);
            setActiveTab('broadcasts');
          }}
          onOpenStaffManual={() => setIsStaffGuideOpen(true)}
          onViewOrder={(order) => setSelectedOrder(order)}
          onOpenChat={(customerId) => {
            setActiveMessageCustomerId(customerId);
            setActiveTab('messages');
          }}
          onDeleteUser={handleDeleteUser}
        />
      )}


      {/* TAB 5: BROADCAST & PROMOTIONS MANAGEMENT */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-4">
          <StaffGuidanceBanner
            title="Push Broadcasts & Trade Promotions SOP"
            description="Publish instant operational updates, container arrival notifications, tariff adjustments, and bulk promotional discount codes directly to registered wholesale clients."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="broadcasts"
            tips={[
              "Targeted Geo-Push: Segment broadcasts by country/port (Nigeria or Cameroon) or send direct company notifications.",
              "Rich Attachments: Include promotional coupon codes (e.g., 'BULK15') or container manifest details to accelerate order commitments.",
              "Instant Notification Bell: Broadcasts automatically trigger the real-time notification popups in active buyer sessions."
            ]}
          />
          <BroadcastManager
            users={users}
            currentAdmin={userProfile}
            onNavigate={onNavigate}
            initialSelectedUserId={directBroadcastUserId}
            onCloseDirectModal={() => setDirectBroadcastUserId(null)}
          />
        </div>
      )}

      {/* TAB 6: SUPPORT HELPDESK & MESSAGING INBOX */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <StaffGuidanceBanner
            title="Live Customer Support Desk SOP"
            description="Real-time multi-agent communications hub. Chat with wholesale buyers, share product spec cards, and construct binding Pro-Forma Quotations with custom freight rates."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="messages"
            tips={[
              "Instant Quote Builder: Use 'Attach Pro-Forma Quote' inside the chat conversation to generate formal invoices with custom discount terms.",
              "Product Card Sharing: Easily paste product specs and live inventory counts directly into chat.",
              "Fast PO Conversion: Click 'Inspect PO' in customer chat headers to view their order history."
            ]}
          />
          <AdminSupportDesk
            messages={messages}
            users={users}
            currentAdmin={userProfile}
            activeCustomerId={activeMessageCustomerId}
            onSelectCustomer={(cId) => handleSelectMessageCustomer(cId)}
            onNavigateToOrders={(cId) => {
              if (cId) {
                setOrderSearch(cId);
              }
              setActiveTab('orders');
            }}
          />
        </div>
      )}

      {/* TAB 7: SUPABASE SETUP & ARCHITECTURE GUIDE */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <StaffGuidanceBanner
            title="Supabase Architecture & Technical Reference"
            description="Comprehensive PostgreSQL schema documentation, Row Level Security (RLS) policies, and environment credential guidance for Eagle Excel Wholesale ERP."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="docs"
            tips={[
              "PostgreSQL Tables: Products, Orders, Users, Messages, Broadcasts, and Notifications are hosted on Supabase.",
              "Row Level Security: Enforces isolated tenant data access while empowering administrator oversight.",
              "Real-Time Subscriptions: Leverages WebSocket channels for zero-polling instant synchronization."
            ]}
          />
          <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 sm:p-8 space-y-6 shadow-xs text-xs text-zinc-300">
            <div>
              <h2 className="text-xl font-bold text-white font-serif">
                Eagle Excel Wholesale • Supabase Architecture & Database Guide
              </h2>
              <p className="text-zinc-400 mt-1">
                Complete technical reference for PostgreSQL tables, real-time channels, Row Level Security (RLS), and API credentials.
              </p>
            </div>

            <div className="space-y-6">
              
              {/* 1. Supabase Configuration */}
              <div className="p-5 rounded-2xl bg-[#0f0f0f] text-zinc-100 font-mono space-y-3 border border-white/10">
                <div className="flex justify-between items-center text-[#F27D26] font-bold text-xs font-sans">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" /> 1. Supabase Environment Variables
                  </span>
                  <span className="text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full text-[11px]">Database: Supabase (PostgreSQL)</span>
                </div>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Configure your project credentials in <code className="text-amber-300">.env</code>:
                </p>
                <pre className="text-[11px] overflow-x-auto text-amber-300 bg-black/50 p-3 rounded-xl border border-white/5">
{`# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key`}
                </pre>
              </div>

              {/* 2. Supabase Tables Structure */}
              <div className="border border-white/5 rounded-2xl p-5 space-y-3 bg-[#121212]">
                <h3 className="text-sm font-bold text-white">2. PostgreSQL Tables Structure</h3>
                <ul className="space-y-2 text-zinc-300">
                  <li>
                    <strong className="text-white">users:</strong> Stores id, email, display_name, company_name, phone, address, and role (<code className="bg-white/10 px-1 py-0.5 rounded text-amber-300">"admin"</code> or <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300">"customer"</code>).
                  </li>
                  <li>
                    <strong className="text-white">products:</strong> Wholesale catalog with base price, wholesale tiered discounts, SKU, packaging unit, stock, and image URLs.
                  </li>
                  <li>
                    <strong className="text-white">categories:</strong> Wholesale product categories and display hierarchies.
                  </li>
                  <li>
                    <strong className="text-white">orders:</strong> Purchase orders with itemized products, shipping address, payment terms (Net 30, Wire, COD, Card), and real-time status tracker.
                  </li>
                  <li>
                    <strong className="text-white">messages:</strong> Real-time support messaging system between buyers and operations administrators.
                  </li>
                  <li>
                    <strong className="text-white">broadcasts:</strong> Marketing campaigns and logistics broadcast updates sent to registered wholesale buyers.
                  </li>
                  <li>
                    <strong className="text-white">notifications:</strong> Real-time system, shipment, and operational notification events.
                  </li>
                </ul>
              </div>

              {/* 3. Security & Access Control */}
              <div className="border border-white/5 rounded-2xl p-5 space-y-3 bg-[#121212]">
                <h3 className="text-sm font-bold text-white">3. Role-Based Access Control (RBAC) & Row Level Security</h3>
                <p className="text-zinc-300">
                  Row Level Security (RLS) policies enforce that regular customers can only read/write their own orders and support messages, while administrators (verified via user role) have complete catalog management, order fulfillment, and user administration rights.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 8: ADMIN PRODUCT AUDIT LOG & LIVE SYNC MONITOR */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <StaffGuidanceBanner
            title="Product Audit Trail & Real-Time Sync Inspector"
            description="Inspect all live product modifications, price and inventory adjustments, deletions, and Supabase Postgres real-time replication events with detailed attribute diffs and zero-latency parity diagnostics."
            onOpenManual={() => setIsStaffGuideOpen(true)}
            storageKey="audit_log"
            tips={[
              "Instant Event Tracking: Every product addition, price change, or stock depletion generates an immutable audit record.",
              "Live Replication Debugger: Inspect Supabase Postgres WebSocket changes and Server-Sent Events (SSE) in real-time.",
              "Parity Verification: Use the 'Verify Sync Parity' button to test data alignment between Browser Cache, Express API, and Supabase Postgres.",
              "Detailed Value Diffs: Click 'View Details' on any event to inspect previous vs synced values and raw JSON payloads."
            ]}
          />

          <AdminAuditLog
            onSelectProduct={(productId) => {
              setActiveTab('products');
              setProductSearch(productId);
            }}
            onNavigateToProducts={() => setActiveTab('products')}
          />
        </div>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProductModalOpen(false);
          }}
        >
          <div className="bg-[#121212] rounded-3xl shadow-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] sm:max-h-[88vh] overflow-hidden flex flex-col text-zinc-100 animate-scaleUp">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#0f0f0f] text-white flex items-center justify-between shrink-0 border-b border-white/5">
              <h2 className="text-base font-bold font-serif">
                {editingProduct ? 'Edit Wholesale Product' : 'Add New Wholesale Product'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form id="admin-product-form" onSubmit={handleSaveProduct} noValidate className="p-6 overflow-y-auto overscroll-contain space-y-4 text-xs flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. ApexPro Hybrid ANC Wireless Headsets"
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    placeholder="EE-AUD-902"
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none font-mono placeholder-zinc-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Product Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#161616] border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none capitalize"
                  >
                    <option value="electronics">Electronics & Audio</option>
                    <option value="building">Building Materials & Hardware</option>
                    <option value="textiles">Textiles & Garments</option>
                    <option value="machinery">Machinery & Equipment</option>
                    <option value="packaging">General Merchandise & Packaging</option>
                    <option value="industrial">Industrial Hardware</option>
                    <option value="office">Office & Facility</option>
                    <option value="safety">Safety & PPE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Base Single Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none font-bold placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Est. Freight Shipping ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formFreight}
                    onChange={e => setFormFreight(e.target.value)}
                    placeholder="25.00"
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none font-bold placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Packaging Unit Format</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="Master Carton (10 Units)"
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Total Stock Available (Units) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none font-bold placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Minimum Order Quantity (MOQ) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMoq}
                    onChange={e => setFormMoq(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none font-bold placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Detailed commercial description..."
                  className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder-zinc-600"
                />
              </div>

              {/* Wholesale Tier Schedules */}
              <div className="bg-[#161616] p-3.5 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-200">Tiered Wholesale Bulk Rates</label>
                  <button
                    type="button"
                    onClick={() => setFormTiers([...formTiers, { minQty: 100, pricePerUnit: (parseFloat(formPrice) * 0.8) }])}
                    className="text-[#F27D26] font-bold hover:underline cursor-pointer"
                  >
                    + Add Tier
                  </button>
                </div>

                {formTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-400 text-[11px]">Min Qty:</span>
                    <input
                      type="number"
                      value={tier.minQty}
                      onChange={e => {
                        const updated = [...formTiers];
                        updated[idx].minQty = parseInt(e.target.value) || 1;
                        setFormTiers(updated);
                      }}
                      className="w-20 p-1.5 bg-white/5 border border-white/10 rounded-lg text-center font-bold text-zinc-100"
                    />
                    <span className="font-semibold text-zinc-400 text-[11px]">Price / Unit ($):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.pricePerUnit}
                      onChange={e => {
                        const updated = [...formTiers];
                        updated[idx].pricePerUnit = parseFloat(e.target.value) || 1;
                        setFormTiers(updated);
                      }}
                      className="w-24 p-1.5 bg-white/5 border border-white/10 rounded-lg text-center font-bold text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => setFormTiers(formTiers.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Image Upload / Storage Section */}
              <div className="bg-[#161616] p-3.5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#F27D26]" />
                    Product Images (Cloud Storage & URLs)
                  </label>
                  {isUploadingImage && (
                    <span className="text-[#F27D26] font-bold animate-pulse">
                      Uploading Image ({uploadProgress}%)...
                    </span>
                  )}
                </div>

                {/* Upload from Computer */}
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer py-2 px-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold flex items-center gap-1.5 shadow-xs text-zinc-200">
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-zinc-500">or</span>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Paste image web URL..."
                    className="flex-1 p-2 bg-white/5 border border-white/10 text-zinc-100 rounded-xl outline-none placeholder-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="py-2 px-3 bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold rounded-xl cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {/* Images Preview List */}
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden shrink-0 group">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </form>

            {/* Pinned Action Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0f0f0f] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="admin-product-form"
                id={editingProduct ? "btn-save-product-changes" : "btn-publish-product"}
                disabled={isSavingProduct}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold rounded-xl transition-all text-xs btn-hover flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingProduct && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>
                  {isSavingProduct
                    ? (editingProduct ? 'Saving Product Changes...' : 'Publishing to Catalog...')
                    : (editingProduct ? 'Save Product Changes' : 'Publish Product to Catalog')}
                </span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* SHIPPING CARRIER & TRACKING MODAL */}
      {shippingModalOrder && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShippingModalOrder(null);
          }}
        >
          <div className="bg-[#121212] rounded-3xl shadow-2xl border border-white/10 max-w-md w-full p-6 space-y-4 text-zinc-100 animate-scaleUp">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 font-serif">
                <Truck className="w-4 h-4 text-[#F27D26]" />
                Dispatch & Shipping Details
              </h3>
              <button onClick={() => setShippingModalOrder(null)} className="cursor-pointer">
                <XCircle className="w-5 h-5 text-zinc-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleConfirmShipping} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Freight Carrier</label>
                <input
                  type="text"
                  required
                  value={carrierInput}
                  onChange={e => setCarrierInput(e.target.value)}
                  placeholder="e.g. FedEx Freight / Old Dominion / R+L"
                  className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl outline-none placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Tracking / PRO Number</label>
                <input
                  type="text"
                  required
                  value={trackingNumberInput}
                  onChange={e => setTrackingNumberInput(e.target.value)}
                  placeholder="TRK-EE-9908123"
                  className="w-full p-2.5 bg-white/5 border border-white/10 text-zinc-100 rounded-xl outline-none font-mono font-bold placeholder-zinc-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold rounded-xl transition-all mt-2 btn-hover cursor-pointer"
              >
                Confirm Dispatch & Notify Customer
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ORDER INVOICE POPUP FOR ADMIN */}
      {selectedOrder && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null);
          }}
        >
          <div className="bg-[#121212] rounded-3xl shadow-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col text-zinc-100 animate-scaleUp">
            <div className="p-5 bg-[#0f0f0f] text-white flex justify-between items-center border-b border-white/5">
              <div>
                <h3 className="font-bold text-sm font-serif">Purchase Order: {selectedOrder.orderNumber}</h3>
                <span className="text-xs text-zinc-400">Placed: {new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#161616] p-3.5 rounded-xl border border-white/5 text-zinc-300">
                <div>
                  <strong className="text-zinc-200">Customer:</strong> {selectedOrder.companyName || selectedOrder.customerName}<br />
                  <strong className="text-zinc-200">Email:</strong> {selectedOrder.customerEmail}<br />
                  <strong className="text-zinc-200">Phone:</strong> {selectedOrder.phone || 'N/A'}
                </div>
                <div>
                  <strong className="text-zinc-200">Payment Terms:</strong> <span className="capitalize">{selectedOrder.paymentMethod?.replace('_', ' ')}</span><br />
                  <strong className="text-zinc-200">Payment Status:</strong> <span className={`uppercase font-bold ${selectedOrder.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedOrder.paymentStatus || 'pending'}</span><br />
                  {selectedOrder.flwTransactionId && (
                    <>
                      <strong className="text-zinc-200">Flutterwave Tx:</strong> <span className="font-mono text-emerald-400">{selectedOrder.flwTransactionId}</span><br />
                    </>
                  )}
                  <strong className="text-zinc-200">Status:</strong> <span className="uppercase font-bold text-[#F27D26]">{selectedOrder.status}</span><br />
                  <strong className="text-zinc-200">Address:</strong> {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city} {selectedOrder.shippingAddress?.state}
                </div>
              </div>

              <div>
                <div className="font-bold text-zinc-200 mb-2">Itemized Breakdown:</div>
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#161616]">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 font-bold border-b border-white/5 text-zinc-300">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-zinc-100">{it.name} <span className="font-mono text-zinc-500 font-normal">({it.sku})</span></td>
                          <td className="p-2.5 text-center font-bold text-zinc-100">{it.quantity}</td>
                          <td className="p-2.5 text-right text-zinc-300">${it.unitPrice.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold text-[#F27D26]">${it.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {(selectedOrder.status === 'cancelled' || selectedOrder.paymentStatus === 'failed') && (
                    <button
                      onClick={() => setOrderToDelete(selectedOrder)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/20"
                      title="Permanently remove this transaction record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Record</span>
                    </button>
                  )}
                </div>

                <div className="w-64 space-y-1 bg-[#161616] p-3 rounded-xl border border-white/5 text-zinc-300">
                  <div className="flex justify-between"><span>Subtotal:</span><strong className="text-zinc-100">${selectedOrder.subtotal.toFixed(2)}</strong></div>
                  <div className="flex justify-between"><span>Est. Freight:</span><strong className="text-zinc-100">${selectedOrder.shippingCost.toFixed(2)}</strong></div>
                  <div className="pt-1 border-t border-white/10 flex justify-between font-bold text-sm text-[#F27D26]">
                    <span>Total:</span><span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE ORDER DIALOG */}
      {orderToDelete && (
        <ConfirmDialog
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={confirmDeleteOrderAction}
          isLoading={isDeletingOrder}
          title="Delete Purchase Order Record?"
          message={
            <span>
              Are you sure you want to permanently delete purchase order <strong>#{orderToDelete.orderNumber}</strong> ({orderToDelete.customerName || orderToDelete.companyName || 'Buyer'})?
            </span>
          }
          confirmText="Yes, Delete Record"
          cancelText="Cancel & Keep"
          variant="danger"
          icon="trash"
          impactDetails={
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              This will permanently purge this cancelled/failed transaction from all admin metrics, inventory tracking, and client order histories.
            </p>
          }
        />
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        products={products}
      />

      {/* CONFIRM DELETE PRODUCT DIALOG */}
      {productToDelete && (
        <ConfirmDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={confirmDeleteProductAction}
          isLoading={isDeletingProduct}
          title="Delete Product from Catalog?"
          message={
            <span>
              Are you sure you want to permanently remove <strong>"{productToDelete.name}"</strong> (SKU: {productToDelete.sku}) from your database?
            </span>
          }
          confirmText="Yes, Delete Product"
          cancelText="Cancel & Keep"
          variant="danger"
          icon="trash"
          impactDetails={
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              This will remove this SKU from the wholesale catalog. Active historical invoices and orders will retain their line items.
            </p>
          }
        />
      )}

      {/* CONFIRM USER ROLE TOGGLE DIALOG */}
      {userToToggleRole && (
        <ConfirmDialog
          isOpen={!!userToToggleRole}
          onClose={() => setUserToToggleRole(null)}
          onConfirm={confirmToggleUserRole}
          title="Change Administrator Permissions?"
          message={
            <span>
              Are you sure you want to change <strong>{userToToggleRole.displayName}</strong>'s role to <strong>{(userToToggleRole.role === 'admin' ? 'Customer' : 'Admin').toUpperCase()}</strong>?
            </span>
          }
          confirmText="Confirm Permission Change"
          cancelText="Cancel"
          variant="warning"
          icon="alert"
        />
      )}

      {/* CONFIRM SEED CATALOG DIALOG */}
      <ConfirmDialog
        isOpen={isSeedConfirmOpen}
        onClose={() => setIsSeedConfirmOpen(false)}
        onConfirm={handleSeedDatabase}
        isLoading={isSeeding}
        title="Seed Sample Wholesale Products?"
        message="Populate initial sample wholesale products and category tiers into your database?"
        confirmText="Yes, Seed Database"
        cancelText="Cancel"
        variant="info"
        icon="info"
      />

      {/* STAFF ONBOARDING & SOP OPERATING MANUAL MODAL */}
      <AdminStaffGuideModal
        isOpen={isStaffGuideOpen}
        onClose={() => setIsStaffGuideOpen(false)}
        onJumpToTab={(tab) => {
          setActiveTab(tab as AdminTab);
          setIsStaffGuideOpen(false);
        }}
      />

    </div>
  );
};
