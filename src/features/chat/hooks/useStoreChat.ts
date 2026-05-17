import { useState, useCallback, useRef, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { trackAddToCart } from "@/features/tracking/lib/trackEvent";
import { useStoreCurrency } from "@/features/tracking/hooks/useStoreCurrency";
import { supabase } from "@/integrations/supabase/client";

export interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images?: string[];
  image_url?: string;
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

export interface ChatCartSummaryData {
  items: { name: string; price: number; quantity: number; variant?: string }[];
  total: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
  suggestedActions?: { label: string; message: string }[];
  cartSummary?: ChatCartSummaryData;
}

interface UsStoreChatOptions {
  storeId: string;
  currentProductId?: string | null;
  currentPage?: string;
}

function getSessionId(storeId: string): string {
  const key = `chat-session-${storeId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useStoreChat({ storeId, currentProductId, currentPage }: UsStoreChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const { addItem, items } = useCart();
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const storeCurrency = useStoreCurrency(storeId);
  const abortRef = useRef<AbortController | null>(null);

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-chat`;

  const pendingProductsRef = useRef<ChatProduct[]>([]);
  const pendingSuggestedRef = useRef<{ label: string; message: string }[]>([]);
  const pendingCartSummaryRef = useRef<ChatCartSummaryData | null>(null);

  const handleAction = useCallback(
    (action: any) => {
      if (action.__action === "add_to_cart") {
        // Resolve retailer_id AND product/color/size codes BEFORE adding to cart so
        // downstream events (InitiateCheckout, AddPaymentInfo, Purchase) build the
        // exact same feed-format ID (P{code}-C{x}-S{y}) — never falling back to
        // P{code}-C{x} or UUID.
        (async () => {
          let retailerId: string | null = null;
          let productCode: number | undefined;
          let colorCode: number | undefined;
          let sizeCode: number | undefined;
          let displaySeparately = false;

          try {
            const { data: prod } = await supabase
              .from("products")
              .select("id, product_code, display_variations_separately")
              .eq("id", action.product_id)
              .maybeSingle();
            if (prod?.product_code != null) productCode = prod.product_code;
            displaySeparately = !!(prod as any)?.display_variations_separately;

            if (action.variation_id) {
              const { data: variation } = await supabase
                .from("product_variations_v2")
                .select("id, attributes")
                .eq("id", action.variation_id)
                .maybeSingle();
              if (variation?.attributes && prod?.product_code) {
                const { data: defs } = await supabase
                  .from("attributes").select("id, type").eq("store_id", storeId);
                const valueIds = Object.values(variation.attributes as Record<string, string>);
                const { data: vals } = await supabase
                  .from("attribute_values").select("id, attribute_id, value_code")
                  .in("id", valueIds);

                const defMap = new Map((defs || []).map((d: any) => [d.id, d.type]));
                const valMap = new Map((vals || []).map((v: any) => [v.id, v.value_code]));
                for (const [attrId, valueId] of Object.entries(variation.attributes as Record<string, string>)) {
                  const t = defMap.get(attrId);
                  const c = valMap.get(valueId);
                  if (t === 'color' && c != null) colorCode = c as number;
                  else if (t === 'size' && c != null) sizeCode = c as number;
                }

                const { getVariationRetailerId } = await import("@/features/tracking/lib/retailerId");
                retailerId = getVariationRetailerId(
                  { id: prod.id, product_code: prod.product_code },
                  { id: action.variation_id, attributes: variation.attributes as any },
                  (defs || []) as any,
                  (vals || []) as any,
                );
              }
            } else if (prod?.product_code) {
              retailerId = `P${prod.product_code}`;
            }
          } catch (err) {
            console.warn("[chat] Failed to resolve retailer_id, skipping AddToCart pixel:", err);
          }

          // Add to cart with resolved codes so downstream events stay consistent
          addItem(
            {
              id: action.product_id,
              name: action.product_name,
              price: action.price,
              image: action.image || "",
              variant: [action.color, action.size].filter(Boolean).join(" / ") || undefined,
              variationId: action.variation_id || undefined,
              color: action.color || undefined,
              size: action.size || undefined,
              productCode,
              colorCode,
              sizeCode,
              displaySeparately,
            },
            { skipCartOpen: false }
          );

          if (!retailerId) {
            console.warn("[chat] Could not resolve retailer_id for product, skipping AddToCart pixel to preserve catalog match quality.");
            return;
          }

          const { getContentGroupId } = await import("@/features/tracking/lib/retailerId");
          trackAddToCart({
            id: retailerId,
            name: action.product_name,
            price: action.price,
            variant: [action.color, action.size].filter(Boolean).join(" / ") || undefined,
            quantity: 1,
            currency: storeCurrency,
          }, storeId, undefined, getContentGroupId(retailerId, displaySeparately));
        })();
      } else if (action.__action === "show_products") {
        pendingProductsRef.current = action.products || [];
      } else if (action.__action === "suggested_actions") {
        pendingSuggestedRef.current = action.actions || [];
      } else if (action.__action === "show_cart_summary") {
        pendingCartSummaryRef.current = {
          items: action.items || [],
          total: action.total || 0,
        };
      } else if (action.__action === "navigate") {
        const { page_type, slug } = action;
        switch (page_type) {
          case "product":
            if (slug) navigate(buildPath(`/product/${slug}`));
            break;
          case "category":
            if (slug) navigate(buildPath(`/category/${slug}`));
            break;
          case "cart":
            navigate(buildPath("/cart"));
            break;
          case "checkout":
            navigate(buildPath("/checkout"));
            break;
          case "home":
            navigate(buildPath("/"));
            break;
        }
      }
    },
    [addItem, navigate, buildPath]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = { role: "user", content: content.trim() };
      setUserHasInteracted(true);
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantSoFar = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        const products = pendingProductsRef.current.length > 0 ? [...pendingProductsRef.current] : undefined;
        const suggestedActions = pendingSuggestedRef.current.length > 0 ? [...pendingSuggestedRef.current] : undefined;
        const cartSummary = pendingCartSummaryRef.current ? { ...pendingCartSummaryRef.current } : undefined;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar, ...(products ? { products } : {}), ...(suggestedActions ? { suggestedActions } : {}), ...(cartSummary ? { cartSummary } : {}) } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar, products, suggestedActions, cartSummary }];
        });
      };

      try {
        const allMessages = [...messages, userMsg];
        // Build cart items for context
        const cartItems = items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant || undefined,
        }));
        // Get current user auth ID for favorites context
        let userAuthId: string | undefined;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) userAuthId = user.id;
        } catch {}

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            store_id: storeId,
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            current_product_id: currentProductId || undefined,
            current_page: currentPage || undefined,
            session_id: getSessionId(storeId),
            cart_items: cartItems.length > 0 ? cartItems : undefined,
            user_auth_id: userAuthId || undefined,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao enviar mensagem");
        }

        // Check content type
        const ct = resp.headers.get("content-type") || "";

        if (ct.includes("application/json")) {
          // Non-streamed response
          const data = await resp.json();
          if (data.content) {
            upsertAssistant(data.content);
          }
        } else {
          // SSE stream
          const reader = resp.body!.getReader();
          const decoder = new TextDecoder();
          let textBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;

              try {
                const parsed = JSON.parse(jsonStr);

                // Check for actions
                if (parsed.actions) {
                  for (const action of parsed.actions) {
                    handleAction(action);
                  }
                  continue;
                }

                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent) upsertAssistant(deltaContent);
              } catch {
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }

          // Flush remaining
          if (textBuffer.trim()) {
            for (let raw of textBuffer.split("\n")) {
              if (!raw) continue;
              if (raw.endsWith("\r")) raw = raw.slice(0, -1);
              if (raw.startsWith(":") || raw.trim() === "") continue;
              if (!raw.startsWith("data: ")) continue;
              const jsonStr = raw.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.actions) {
                  for (const action of parsed.actions) handleAction(action);
                  continue;
                }
                const c = parsed.choices?.[0]?.delta?.content;
                if (c) upsertAssistant(c);
              } catch {}
            }
          }
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("Chat error:", e);
        upsertAssistant("Desculpe, ocorreu um erro. Tente novamente. 😊");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
        pendingProductsRef.current = [];
        pendingSuggestedRef.current = [];
        pendingCartSummaryRef.current = null;
      }
    },
    [messages, isLoading, storeId, currentProductId, currentPage, handleAction, CHAT_URL]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setUserHasInteracted(false);
    abortRef.current?.abort();
  }, []);

  // Reset only the greeting (pre-conversation state) without affecting interaction flag
  const resetGreeting = useCallback(() => {
    if (!userHasInteracted) {
      setMessages([]);
    }
  }, [userHasInteracted]);

  const injectGreeting = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length > 0) return prev; // Don't inject if messages exist
      return [{ role: "assistant" as const, content }];
    });
  }, []);

  return { messages, sendMessage, isLoading, clearChat, injectGreeting, userHasInteracted, resetGreeting };
}
