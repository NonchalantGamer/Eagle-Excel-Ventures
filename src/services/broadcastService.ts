import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { BroadcastCampaign } from '../types';
import { sendAppNotification } from './notificationService';

const BROADCASTS_TABLE = 'broadcasts';
const LOCAL_BROADCASTS_KEY = 'ee_cached_broadcast_campaigns';

// Get local cached broadcasts
export function getCachedBroadcastCampaigns(): BroadcastCampaign[] {
  try {
    const raw = localStorage.getItem(LOCAL_BROADCASTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save local cached broadcasts
function saveCachedBroadcasts(campaigns: BroadcastCampaign[]): void {
  try {
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(campaigns));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eagle_broadcasts_updated', { detail: campaigns }));
    }
  } catch (e) {
    console.warn('Failed to cache broadcasts:', e);
  }
}

/**
 * Send a new broadcast message or promotional update to wholesale customers
 */
export async function sendBroadcastCampaign(
  campaignData: Omit<BroadcastCampaign, 'id' | 'sentAt' | 'active'>
): Promise<BroadcastCampaign> {
  const newId = `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const campaign: BroadcastCampaign = {
    ...campaignData,
    id: newId,
    sentAt: new Date().toISOString(),
    active: true
  };

  // 1. Update local cache
  const cached = getCachedBroadcastCampaigns();
  const updatedList = [campaign, ...cached.filter(c => c.id !== newId)];
  saveCachedBroadcasts(updatedList);

  // 2. Post to server API
  try {
    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign)
    });
    if (res.ok) {
      const serverBroadcast = await res.json();
      if (serverBroadcast) {
        // Broadcast saved to server
      }
    }
  } catch (err) {
    console.warn('Server broadcast sync warning:', err);
  }

  // 3. Save campaign record to Supabase if enabled
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(BROADCASTS_TABLE).insert(campaign);
      } catch (error) {
        handleSupabaseError(error, OperationType.CREATE, `${BROADCASTS_TABLE}/${newId}`);
      }
    }
  }

  // 4. Dispatch real AppNotification(s) based on target audience
  const isPromotional = campaign.type === 'promotional';
  const notificationType = isPromotional ? 'promotional' : 'broadcast';
  const iconPrefix = isPromotional 
    ? '🏷️ [PROMO]' 
    : campaign.type === 'supply_chain' 
      ? '🚢 [LOGISTICS]' 
      : campaign.type === 'catalog_update' 
        ? '📦 [NEW ARRIVAL]' 
        : campaign.type === 'urgent' 
          ? '🚨 [URGENT NOTICE]' 
          : '📢 [ANNOUNCEMENT]';

  const notificationTitle = `${iconPrefix} ${campaign.title}`;

  if (campaign.targetAudience === 'selected' && campaign.targetUserIds && campaign.targetUserIds.length > 0) {
    // Send individual targeted notifications to each selected customer
    await Promise.all(
      campaign.targetUserIds.map(async (userId) => {
        try {
          await sendAppNotification({
            userId,
            recipientRole: 'customer',
            type: notificationType,
            title: notificationTitle,
            message: campaign.message,
            referenceId: campaign.id,
            targetView: campaign.actionTargetView || 'catalog',
            promoCode: campaign.promoCode,
            discountPercentage: campaign.discountPercentage,
            priority: campaign.priority || 'normal',
            actionLabel: campaign.actionLabel
          });
        } catch (err) {
          console.debug(`Failed to dispatch notification to user ${userId}:`, err);
        }
      })
    );
  } else {
    // Send audience broadcast notification (All, Nigeria, or Cameroon)
    const targetCountry = campaign.targetAudience === 'nigeria' 
      ? 'nigeria' 
      : campaign.targetAudience === 'cameroon' 
        ? 'cameroon' 
        : undefined;

    await sendAppNotification({
      recipientRole: 'customer',
      type: notificationType,
      title: notificationTitle,
      message: campaign.message,
      referenceId: campaign.id,
      targetView: campaign.actionTargetView || 'catalog',
      country: targetCountry,
      promoCode: campaign.promoCode,
      discountPercentage: campaign.discountPercentage,
      priority: campaign.priority || 'normal',
      actionLabel: campaign.actionLabel
    });
  }

  return campaign;
}

/**
 * Fetch all broadcast campaigns from Server / Supabase
 */
export async function getBroadcastCampaigns(): Promise<BroadcastCampaign[]> {
  try {
    const res = await fetch('/api/broadcasts');
    if (res.ok) {
      const serverBroadcasts: BroadcastCampaign[] = await res.json();
      if (Array.isArray(serverBroadcasts) && serverBroadcasts.length > 0) {
        saveCachedBroadcasts(serverBroadcasts);
        return serverBroadcasts;
      }
    }
  } catch {}

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(BROADCASTS_TABLE)
          .select('*')
          .order('sentAt', { ascending: false })
          .limit(50);

        if (data && !error && data.length > 0) {
          saveCachedBroadcasts(data as BroadcastCampaign[]);
          return data as BroadcastCampaign[];
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, BROADCASTS_TABLE);
      }
    }
  }

  return getCachedBroadcastCampaigns();
}

/**
 * Subscribe in real-time to broadcast campaigns
 */
export function subscribeToBroadcastCampaigns(
  onUpdate: (campaigns: BroadcastCampaign[]) => void,
  onError?: (err: unknown) => void
): () => void {
  onUpdate(getCachedBroadcastCampaigns());

  getBroadcastCampaigns().then(list => onUpdate(list)).catch(err => {
    if (onError) onError(err);
  });

  const handleLocalUpdate = (e: CustomEvent<BroadcastCampaign[]>) => {
    if (e.detail && Array.isArray(e.detail)) {
      onUpdate(e.detail);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('eagle_broadcasts_updated', handleLocalUpdate as EventListener);
  }

  // Supabase real-time channel fallback
  let supabaseChannel: any = null;
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel('public:broadcasts:all')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: BROADCASTS_TABLE },
            () => {
              getBroadcastCampaigns().then(list => onUpdate(list));
            }
          )
          .subscribe();
      } catch (error) {
        console.warn('Broadcast subscription fallback:', error);
      }
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('eagle_broadcasts_updated', handleLocalUpdate as EventListener);
    }
    if (supabaseChannel && isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    }
  };
}

/**
 * Toggle active status of a broadcast or promotion
 */
export async function toggleBroadcastStatus(campaignId: string, active: boolean): Promise<void> {
  const cached = getCachedBroadcastCampaigns();
  const updated = cached.map(c => c.id === campaignId ? { ...c, active } : c);
  saveCachedBroadcasts(updated);

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(BROADCASTS_TABLE).update({ active }).eq('id', campaignId);
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, `${BROADCASTS_TABLE}/${campaignId}`);
      }
    }
  }
}

/**
 * Delete a broadcast campaign record
 */
export async function deleteBroadcastCampaign(campaignId: string): Promise<void> {
  const cached = getCachedBroadcastCampaigns();
  const updated = cached.filter(c => c.id !== campaignId);
  saveCachedBroadcasts(updated);

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(BROADCASTS_TABLE).delete().eq('id', campaignId);
      } catch (error) {
        handleSupabaseError(error, OperationType.DELETE, `${BROADCASTS_TABLE}/${campaignId}`);
      }
    }
  }
}

/**
 * Retrieve active promotional updates for customer catalog / announcement banners
 */
export function getActivePromotions(campaigns: BroadcastCampaign[]): BroadcastCampaign[] {
  return campaigns.filter(c => c.active && (c.type === 'promotional' || c.promoCode || c.discountPercentage));
}
