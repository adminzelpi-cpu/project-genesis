import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredCustomerSession } from '@/features/auth';

type ActivityType = 
  | 'product_view'
  | 'page_view'
  | 'add_to_cart'
  | 'purchase'
  | 'favorite_add'
  | 'favorite_remove'
  | 'search'
  | 'chat_message';

interface ActivityData {
  product_id?: string;
  product_name?: string;
  product_slug?: string;
  product_price?: number;
  color_name?: string;
  color_code?: number;
  category_id?: string;
  category_name?: string;
  page_path?: string;
  search_query?: string;
  variant?: string;
  quantity?: number;
  [key: string]: unknown;
}

const DEBOUNCE_KEY_PREFIX = 'activity_debounce_';
const DEBOUNCE_MS = 5000; // Don't log same product_view within 5s

export function useActivityTracker(storeId: string | undefined) {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoggedRef = useRef<Map<string, number>>(new Map());

  const trackActivity = useCallback(
    (activityType: ActivityType, data: ActivityData = {}) => {
      if (!storeId) return;

      // Debounce product_view for same product
      if (activityType === 'product_view' && data.product_id) {
        const key = `${activityType}_${data.product_id}_${data.color_code ?? ''}`;
        const lastTime = lastLoggedRef.current.get(key);
        if (lastTime && Date.now() - lastTime < DEBOUNCE_MS) return;
        lastLoggedRef.current.set(key, Date.now());
      }

      // Get session and auth info
      const sessionId = sessionStorage.getItem(`chat-session-${storeId}`) || undefined;
      const customerSession = getStoredCustomerSession();
      const userAuthId = customerSession?.platform_user_id;
      const customerIdRef = customerSession?.customer_id;

      // Fire and forget — don't block UI
      (async () => {
        try {
          await supabase
            .from('customer_activity_log')
            .insert([{
              store_id: storeId,
              session_id: sessionId || null,
              user_auth_id: userAuthId || null,
              customer_id: customerIdRef || null,
              activity_type: activityType,
              activity_data: JSON.parse(JSON.stringify(data)),
            }]);
        } catch (err) {
          console.debug('Activity tracking error:', err);
        }
      })();
    },
    [storeId]
  );

  return { trackActivity };
}
