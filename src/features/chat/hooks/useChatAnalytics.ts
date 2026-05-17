import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type ChatEventType = "opened" | "first_message" | "message_sent" | "quick_action_click" | "product_added" | "checkout_redirect" | "checkout_from_chat";

export function useChatAnalytics(storeId: string) {
  const trackedRef = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(
    (eventType: ChatEventType, metadata?: Record<string, unknown>) => {
      // Deduplicate "opened" and "first_message" per session
      if (["opened", "first_message"].includes(eventType)) {
        const key = `${eventType}-${storeId}`;
        if (trackedRef.current.has(key)) return;
        trackedRef.current.add(key);
      }

      const sessionKey = `chat-session-${storeId}`;
      const sessionId = sessionStorage.getItem(sessionKey) || "unknown";

      supabase
        .from("chat_analytics")
        .insert([{
          store_id: storeId,
          session_id: sessionId,
          event_type: eventType,
          metadata: (metadata || {}) as any,
        }])
        .then(() => {});
    },
    [storeId]
  );

  return { trackEvent };
}
