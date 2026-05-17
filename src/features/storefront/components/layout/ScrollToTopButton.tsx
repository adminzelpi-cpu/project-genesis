import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToTopButtonProps {
  threshold?: number;
  className?: string;
}

export const ScrollToTopButton = ({ 
  threshold = 300,
  className = "" 
}: ScrollToTopButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const [hasChatWidget, setHasChatWidget] = useState(false);
  const [hasFloatingBar, setHasFloatingBar] = useState(false);

  // Detect chat widget and floating bar
  useEffect(() => {
    const check = () => {
      const chatWidget = document.querySelector('[data-chat-widget]');
      const floatingBar = document.querySelector('[data-floating-bar]');
      setHasChatWidget(!!chatWidget);
      setHasFloatingBar(!!floatingBar);
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Hide when chat widget is active (chat replaces scroll-to-top)
  if (!isVisible || hasChatWidget) return null;

  // Move up when floating product bar is present
  const bottomClass = hasFloatingBar ? "bottom-24" : "bottom-6";

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={`fixed ${bottomClass} right-6 z-40 h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110 bg-foreground text-background hover:bg-foreground/90 ${className}`}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};
