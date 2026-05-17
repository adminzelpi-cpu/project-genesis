import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useStoreChat, ChatMessage, ChatProduct } from "../hooks/useStoreChat";
import { useChatSettings } from "../hooks/useChatSettings";
import { useChatAnalytics } from "../hooks/useChatAnalytics";
import { useChatProactiveTrigger } from "../hooks/useChatProactiveTrigger";
import { ChatProductCard } from "./ChatProductCard";
import { ChatCartSummary } from "./ChatCartSummary";
import { ChatQuickActions } from "./ChatQuickActions";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { useCart } from "@/contexts/CartContext";
import type { CategoryProduct } from "@/features/storefront/types/category";
import ReactMarkdown from "react-markdown";

const CategoryQuickAddDialog = lazy(() =>
  import("@/features/storefront/components/category/CategoryQuickAddDialog").then((mod) => ({
    default: mod.CategoryQuickAddDialog,
  }))
);

interface GreetingContext {
  currentPage?: string;
  currentProductId?: string | null;
  cartItemCount?: number;
  cartTotal?: number;
}

function getContextualGreeting(ctx: GreetingContext): string {
  const { currentPage, currentProductId, cartItemCount = 0, cartTotal = 0 } = ctx;

  // Cart-aware greeting takes priority when user has items
  if (cartItemCount > 0 && currentPage !== "carrinho") {
    const totalFormatted = cartTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return `Vi que você tem ${cartItemCount} ${cartItemCount === 1 ? "item" : "itens"} no carrinho (${totalFormatted}). Posso te ajudar a finalizar ou encontrar mais alguma coisa?`;
  }

  if (currentProductId) {
    return "Posso te ajudar com esse produto ou sugerir opções parecidas.";
  }
  switch (currentPage) {
    case "categoria":
      return "Quer ajuda pra encontrar algo ou ver os mais procurados?";
    case "carrinho":
      return "Posso te ajudar a finalizar ou tirar alguma dúvida.";
    case "home":
      return "Posso te mostrar os mais procurados ou te ajudar a encontrar algo.";
    default:
      return "Como posso te ajudar?";
  }
}

function getContextualChips(ctx: GreetingContext, whatsappFallback?: string | null): QuickAction[] {
  const { currentPage, currentProductId, cartItemCount = 0 } = ctx;
  const chips: QuickAction[] = [];

  if (cartItemCount > 0) {
    chips.push({ label: "Finalizar compra", message: "Quero finalizar minha compra" });
    chips.push({ label: "Calcular frete", message: "Quanto fica o frete?" });
  } else if (currentProductId) {
    chips.push({ label: "Tem desconto?", message: "Esse produto tem desconto ou cupom?" });
    chips.push({ label: "Consultar tamanhos", message: "Quais tamanhos disponíveis?" });
    chips.push({ label: "Calcular frete", message: "Quanto fica o frete desse produto?" });
  } else if (currentPage === "categoria") {
    chips.push({ label: "Mais vendidos", message: "Quais os mais vendidos dessa categoria?" });
    chips.push({ label: "Em promoção", message: "Tem algum em promoção?" });
  } else if (currentPage === "carrinho") {
    chips.push({ label: "Aplicar cupom", message: "Tenho um cupom de desconto" });
    chips.push({ label: "Calcular frete", message: "Quanto fica o frete?" });
  } else {
    chips.push({ label: "Ver promoções", message: "Quais produtos estão em promoção?" });
    chips.push({ label: "Mais vendidos", message: "Quais os produtos mais vendidos?" });
  }

  if (whatsappFallback) {
    chips.push({ label: "Falar com humano", message: "__whatsapp__" });
  }

  return chips;
}

interface StoreChatWidgetProps {
  storeId: string;
  storeSlug: string;
  storeFaviconUrl?: string | null;
  currentProductId?: string | null;
  currentPage?: string;
}

interface QuickAction {
  label: string;
  message: string;
}

export function StoreChatWidget({ storeId, storeSlug, storeFaviconUrl, currentProductId, currentPage }: StoreChatWidgetProps) {
  const { data: settings, isLoading: settingsLoading } = useChatSettings(storeId);
  const { items: cartItems, total: cartTotal, itemCount: cartItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isTypingGreeting, setIsTypingGreeting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greetingShownRef = useRef(false);
  const { trackEvent } = useChatAnalytics(storeId);

  // Quick Add Dialog state
  const [quickAddProduct, setQuickAddProduct] = useState<CategoryProduct | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [hasFloatingBar, setHasFloatingBar] = useState(false);
  const navigate = useNavigate();
  const { buildPath } = useStorePath();

  // Detect floating buy bar to adjust position
  useEffect(() => {
    const check = () => {
      setHasFloatingBar(!!document.querySelector('[data-floating-bar]'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const { messages, sendMessage, isLoading, clearChat, injectGreeting, userHasInteracted, resetGreeting } = useStoreChat({
    storeId,
    currentProductId,
    currentPage,
  });

  // Track previous page context to detect navigation
  const prevContextRef = useRef({ currentPage, currentProductId });

  // When page changes in pre-conversation, reset greeting so a new contextual one is generated
  useEffect(() => {
    const prev = prevContextRef.current;
    const pageChanged = prev.currentPage !== currentPage || prev.currentProductId !== currentProductId;
    prevContextRef.current = { currentPage, currentProductId };

    if (pageChanged && !userHasInteracted) {
      // Reset: clear old greeting and allow a fresh one on next open
      resetGreeting();
      greetingShownRef.current = false;
    }
  }, [currentPage, currentProductId, userHasInteracted, resetGreeting]);

  // Listen for size guide "discover size" button
  useEffect(() => {
    const handleSizeHelp = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Clear any previous conversation so the size-help greeting always shows
      clearChat();
      setIsOpen(true);
      greetingShownRef.current = true;
      setIsTypingGreeting(true);
      setTimeout(() => {
        setIsTypingGreeting(false);
        injectGreeting("Oi! 😊 Posso te ajudar a encontrar o tamanho perfeito pra essa peça! Me conta: qual seu **peso**, **altura** e **idade**?");
        setQuickActions([]);
      }, 1200);
    };
    window.addEventListener('open-chat-size-help', handleSizeHelp);
    return () => window.removeEventListener('open-chat-size-help', handleSizeHelp);
  }, [injectGreeting, clearChat]);

  // Proactive trigger
  const { showBadge, badgeMessage, unreadCount, dismiss: dismissProactive } = useChatProactiveTrigger({
    currentPage,
    currentProductId,
    isEnabled: !!settings?.is_enabled,
    isChatOpen: isOpen,
  });

  const handleQuickAdd = useCallback((product: ChatProduct) => {
    const catProduct: CategoryProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      sale_price: product.sale_price,
      images: product.images || [],
      _colorValueId: product._colorValueId,
      _colorAttributeId: product._colorAttributeId,
      _colorName: product._colorName,
      _colorCode: product._colorCode,
      _productCode: product._productCode,
    };
    setQuickAddProduct(catProduct);
    setQuickAddOpen(true);
    trackEvent("product_added", { product_id: product.id });
  }, [trackEvent]);

  const handleQuickAction = useCallback((message: string) => {
    trackEvent("quick_action_click", { message });
    setQuickActions([]); // Hide after first click
    sendMessage(message);
  }, [sendMessage, trackEvent]);

  const handleViewDetails = useCallback(() => {
    if (quickAddProduct) {
      setQuickAddOpen(false);
      const slugPart = quickAddProduct._productCode 
        ? `${quickAddProduct.slug}-${quickAddProduct._productCode}` 
        : quickAddProduct.slug;
      navigate(buildPath(`/product/${slugPart}`));
    }
  }, [quickAddProduct, navigate, buildPath]);

  // Don't render if settings not loaded or chat disabled
  if (settingsLoading || !settings?.is_enabled) return null;

  const accentColor = settings.primary_color || "#000000";
  // Cascading avatar: custom → favicon → letter
  const avatarUrl = (settings as any).avatar_url || storeFaviconUrl || null;

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          input={input}
          setInput={setInput}
          onSend={() => {
            if (input.trim()) {
              trackEvent("message_sent");
              if (messages.length === 0 || (messages.length === 1 && messages[0].role === "assistant")) {
                trackEvent("first_message");
              }
              sendMessage(input);
              setInput("");
              setQuickActions([]); // Hide after user types
            }
          }}
          onClose={() => setIsOpen(false)}
          onQuickAdd={handleQuickAdd}
          quickActions={quickActions}
          onQuickAction={handleQuickAction}
          whatsappFallback={settings.whatsapp_fallback}
          assistantName={settings.assistant_name}
          accentColor={accentColor}
          avatarUrl={avatarUrl}
          messagesEndRef={messagesEndRef}
          inputRef={inputRef}
          isTypingGreeting={isTypingGreeting}
          onCheckout={() => {
            trackEvent("checkout_from_chat");
            navigate(buildPath("/checkout"));
          }}
          onGoToCart={() => {
            navigate(buildPath("/cart"));
          }}
        />
      )}

      {/* Floating button with proactive badge */}
      {!isOpen && (
        <div className={`fixed right-5 z-50 transition-all duration-300 ${hasFloatingBar ? 'bottom-24' : 'bottom-5'}`}>
          {showBadge && badgeMessage && (
            <div
              className="absolute bottom-16 right-0 w-56 rounded-xl bg-background border shadow-lg p-3 text-sm animate-in fade-in slide-in-from-bottom-2"
              style={{ borderColor: accentColor }}
            >
              <p>{badgeMessage}</p>
            </div>
          )}
          <button
            data-chat-widget
            onClick={() => {
              setIsOpen(true);
              dismissProactive();
              trackEvent("opened");
              // Show local contextual greeting on first open
              if (!greetingShownRef.current && messages.length === 0) {
                greetingShownRef.current = true;
                const greetingCtx: GreetingContext = { currentPage, currentProductId, cartItemCount, cartTotal };
                const greetingText = badgeMessage || getContextualGreeting(greetingCtx);
                const chips = getContextualChips(greetingCtx, settings?.whatsapp_fallback);
                setIsTypingGreeting(true);
                setTimeout(() => {
                  setIsTypingGreeting(false);
                  injectGreeting(greetingText);
                  setQuickActions(chips);
                }, 1200);
              }
              // Only auto-focus on desktop to avoid mobile keyboard popping up
              if (window.innerWidth >= 768) {
                setTimeout(() => inputRef.current?.focus(), 300);
              }
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 overflow-hidden"
            style={{ backgroundColor: accentColor, color: "#fff" }}
            aria-label="Abrir chat"
          >
            <MessageCircle className="h-6 w-6" />
            {(showBadge || unreadCount > 0) && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-white text-[10px] font-bold text-white">
                {unreadCount > 0 ? unreadCount : ""}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Quick Add Dialog */}
      {quickAddProduct && (
        <Suspense fallback={null}>
          <CategoryQuickAddDialog
            product={quickAddProduct}
            open={quickAddOpen}
            onOpenChange={setQuickAddOpen}
            onViewDetails={handleViewDetails}
            storeSlug={storeSlug}
          />
        </Suspense>
      )}
    </>
  );
}

// ── Chat Panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  onQuickAdd: (product: ChatProduct) => void;
  quickActions: QuickAction[];
  onQuickAction: (message: string) => void;
  whatsappFallback?: string | null;
  assistantName: string;
  accentColor: string;
  avatarUrl: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  isTypingGreeting?: boolean;
  onCheckout: () => void;
  onGoToCart: () => void;
}

function ChatPanel({
  messages,
  isLoading,
  input,
  setInput,
  onSend,
  onClose,
  onQuickAdd,
  quickActions,
  onQuickAction,
  whatsappFallback,
  assistantName,
  accentColor,
  avatarUrl,
  messagesEndRef,
  inputRef,
  isTypingGreeting,
  onCheckout,
  onGoToCart,
}: ChatPanelProps) {
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTypingGreeting]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      data-chat-widget
      className="fixed bottom-0 right-0 z-50 flex flex-col border bg-background shadow-2xl overflow-hidden
        w-full max-w-full rounded-t-2xl
        sm:bottom-5 sm:right-5 sm:w-[400px] sm:max-w-[calc(100vw-40px)] sm:rounded-2xl"
      style={{ height: "min(520px, calc(100vh - 60px))" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={assistantName} className="h-full w-full object-cover" />
            ) : (
              assistantName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{assistantName}</p>
            <p className="text-[10px] opacity-80">Online agora</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Typing greeting indicator */}
        {isTypingGreeting && messages.length === 0 && (
          <div className="flex gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {assistantName.charAt(0).toUpperCase()}
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {assistantName.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
                  msg.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm bg-muted"
                }`}
                style={msg.role === "user" ? { backgroundColor: accentColor } : undefined}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
            {/* Inline product cards - horizontal scroll carousel */}
            {msg.products && msg.products.length > 0 && (
              <div className="mt-2 ml-9 -mr-4">
                <div className="overflow-x-auto pb-2 pr-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                  <div className="flex gap-2 snap-x snap-mandatory">
                    {msg.products.map((p) => (
                      <ChatProductCard
                        key={p.id}
                        product={p}
                        accentColor={accentColor}
                        onQuickAdd={onQuickAdd}
                        onNavigate={onClose}
                      />
                    ))}
                  </div>
                </div>
                {msg.products.length > 2 && (
                  <p className="text-[9px] text-muted-foreground/60 ml-1 mt-0.5">
                    Deslize para ver mais →
                  </p>
                )}
              </div>
            )}
            {/* Cart summary card */}
            {msg.cartSummary && msg.cartSummary.items.length > 0 && (
              <ChatCartSummary
                items={msg.cartSummary.items}
                total={msg.cartSummary.total}
                accentColor={accentColor}
                onCheckout={onCheckout}
                onAdjust={onGoToCart}
              />
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {assistantName.charAt(0).toUpperCase()}
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
