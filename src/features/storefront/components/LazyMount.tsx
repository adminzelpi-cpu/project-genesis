import { useEffect, useRef, useState, ReactNode } from 'react';

interface LazyMountProps {
  children: ReactNode;
  /** Distance from viewport (in px) before mounting children. Default 600px. */
  rootMargin?: string;
  /** Optional placeholder to render while not mounted. */
  placeholder?: ReactNode;
  /** Minimum height while not mounted (avoids layout shift). */
  minHeight?: number | string;
}

/**
 * Mounts its children only when the placeholder enters (or nearly enters) the viewport.
 *
 * Useful for below-the-fold sections that trigger expensive data fetching
 * (e.g. recommendation carousels). Avoids competing for network/CPU with
 * above-the-fold content during the critical render path.
 */
export function LazyMount({
  children,
  rootMargin = '600px',
  placeholder = null,
  minHeight,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const el = ref.current;
    if (!el) return;

    // Fallback for environments without IntersectionObserver
    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  if (shouldRender) return <>{children}</>;

  return (
    <div ref={ref} style={minHeight !== undefined ? { minHeight } : undefined}>
      {placeholder}
    </div>
  );
}
