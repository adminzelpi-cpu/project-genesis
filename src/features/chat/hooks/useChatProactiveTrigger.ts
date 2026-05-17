import { useState, useEffect, useCallback, useRef } from "react";

interface ProactiveTriggerOptions {
  currentPage?: string;
  currentProductId?: string | null;
  isEnabled: boolean;
  isChatOpen: boolean;
}

const INACTIVITY_TIMEOUT_MS = 25_000;   // 25s sem scroll/mouse em produto
const MINICART_DELAY_MS = 12_000;        // 12s após abrir mini-cart

export function useChatProactiveTrigger({
  currentPage,
  currentProductId,
  isEnabled,
  isChatOpen,
}: ProactiveTriggerOptions) {
  const [showBadge, setShowBadge] = useState(false);
  const [badgeMessage, setBadgeMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const triggeredRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setShowBadge(false);
    setBadgeMessage("");
    setUnreadCount(0);
  }, []);

  const trigger = useCallback((message: string) => {
    if (triggeredRef.current) return;
    const sessionKey = "chat-proactive-triggered";
    if (sessionStorage.getItem(sessionKey)) return;

    triggeredRef.current = true;
    sessionStorage.setItem(sessionKey, "true");
    setShowBadge(true);
    setBadgeMessage(message);
    setUnreadCount(1);
    // Hide the bubble after 8s but keep the unread indicator
    setTimeout(() => setShowBadge(false), 8000);
  }, []);

  // Product page: inactivity-only (25s without scroll/mouse/touch/key)
  useEffect(() => {
    if (!isEnabled || isChatOpen || triggeredRef.current || !currentProductId) return;
    if (sessionStorage.getItem("chat-proactive-triggered")) return;

    const message = "Posso te ajudar com tamanho ou cor? 😊";

    const resetInactivity = () => {
      if (triggeredRef.current) return;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        trigger(message);
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Start inactivity timer immediately
    resetInactivity();

    // Reset on user activity
    const events = ["mousemove", "scroll", "touchstart", "keydown"] as const;
    events.forEach((evt) => window.addEventListener(evt, resetInactivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetInactivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isEnabled, isChatOpen, currentProductId, trigger]);

  // Mini-cart open trigger (12s after opening)
  useEffect(() => {
    if (!isEnabled || isChatOpen || triggeredRef.current) return;
    if (sessionStorage.getItem("chat-proactive-triggered")) return;

    let miniCartTimer: ReturnType<typeof setTimeout>;

    const handleMiniCartOpen = () => {
      if (triggeredRef.current) return;
      miniCartTimer = setTimeout(() => {
        trigger("Posso te ajudar a finalizar? 🛒");
      }, MINICART_DELAY_MS);
    };

    window.addEventListener("minicart-opened", handleMiniCartOpen);
    return () => {
      window.removeEventListener("minicart-opened", handleMiniCartOpen);
      if (miniCartTimer) clearTimeout(miniCartTimer);
    };
  }, [isEnabled, isChatOpen, trigger]);

  // Dismiss when chat opens
  useEffect(() => {
    if (isChatOpen) dismiss();
  }, [isChatOpen, dismiss]);

  return { showBadge, badgeMessage, unreadCount, dismiss };
}
