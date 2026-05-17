import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Routes whose scroll position should be preserved across navigation
 * (e.g. returning to a category from a product detail page should keep
 * the user at the same product card and same loaded count).
 *
 * Matched as suffixes against pathname so they work for both
 * /store/<slug>/category/... and /category/... (custom domain).
 */
const PRESERVE_SCROLL_PATTERNS = [/\/category\/[^/]+$/, /\/search$/];

const shouldPreserveScroll = (pathname: string) =>
  PRESERVE_SCROLL_PATTERNS.some((re) => re.test(pathname));

/**
 * Component that scrolls to top on route change.
 * Skips preservation routes (category/search) — those use
 * useListStatePersistence to restore their own scroll position.
 *
 * Also skips POP navigations (back/forward) to keep browser-native UX.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const wasPreserved = shouldPreserveScroll(prevPath.current);
    const isPreserved = shouldPreserveScroll(pathname);
    prevPath.current = pathname;

    // Don't override scroll on back/forward navigation
    if (navType === "POP") return;

    // If we're entering a route that manages its own scroll, let it handle it
    if (isPreserved) return;

    // If we're leaving a preserved route, also skip — the previous page
    // already saved its position; the new page will scroll to top naturally
    // via this same effect on its own mount only if it's not preserved.
    // (The check above already handles entering preserved routes.)
    void wasPreserved;

    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
};
