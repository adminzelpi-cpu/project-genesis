import { useEffect, useRef, useCallback } from "react";

interface UseCheckoutScrollOptions {
  /**
   * Whether to enable auto-scroll on mount
   */
  enabled?: boolean;
  /**
   * Delay in ms before scrolling (allows DOM to settle)
   */
  delay?: number;
  /**
   * Scroll behavior
   */
  behavior?: ScrollBehavior;
}

/**
 * Hook to auto-scroll a checkout step into view, positioning the step header
 * near the top with the continue button visible when possible.
 */
export function useCheckoutScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseCheckoutScrollOptions = {}
) {
  const { enabled = true, delay = 100, behavior = "smooth" } = options;
  const containerRef = useRef<T>(null);
  const hasScrolled = useRef(false);

  const scrollToView = useCallback(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Get the checkout header height (approx 64-80px) + progress bar (approx 80px) + some padding
    const headerOffset = 160;
    
    // Calculate target position: element top - header offset
    const targetScrollY = window.scrollY + rect.top - headerOffset;
    
    // Cap scroll so footer stays hidden: max scroll = element bottom - viewport + small padding
    const elementBottom = window.scrollY + rect.bottom;
    const maxScrollY = elementBottom - viewportHeight + 40;
    
    // Only scroll if the element is not already well positioned
    const isWellPositioned = rect.top >= headerOffset && rect.top < viewportHeight * 0.3;
    
    if (!isWellPositioned) {
      window.scrollTo({
        top: Math.max(0, Math.min(targetScrollY, maxScrollY)),
        behavior,
      });
    }
  }, [behavior]);

  useEffect(() => {
    if (!enabled || hasScrolled.current) return;

    const timeoutId = setTimeout(() => {
      scrollToView();
      hasScrolled.current = true;
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, delay, scrollToView]);

  // Expose manual scroll function
  return {
    containerRef,
    scrollToView,
  };
}

/**
 * Scrolls to make a specific element visible with the continue button in view
 */
export function scrollElementIntoViewWithButton(
  element: HTMLElement | null,
  buttonSelector?: string
) {
  if (!element) return;

  const headerOffset = 160;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  // Try to find the button if selector provided
  const button = buttonSelector 
    ? element.querySelector(buttonSelector) 
    : element.querySelector('button[type="submit"], button:last-of-type');
  
  if (button) {
    const buttonRect = button.getBoundingClientRect();
    const elementHeight = buttonRect.bottom - rect.top;
    
    // Cap scroll so footer stays hidden
    const elementBottom = window.scrollY + buttonRect.bottom;
    const maxScrollY = elementBottom - viewportHeight + 40;
    
    // Position so both header and button are visible
    const targetScrollY = window.scrollY + rect.top - headerOffset;
    window.scrollTo({
      top: Math.max(0, Math.min(targetScrollY, maxScrollY)),
      behavior: "smooth",
    });
  } else {
    // No button found, just scroll to element
    const targetScrollY = window.scrollY + rect.top - headerOffset;
    const elementBottom = window.scrollY + rect.bottom;
    const maxScrollY = elementBottom - viewportHeight + 40;
    window.scrollTo({
      top: Math.max(0, Math.min(targetScrollY, maxScrollY)),
      behavior: "smooth",
    });
  }
}
