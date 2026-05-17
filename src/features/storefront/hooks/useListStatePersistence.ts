import { useEffect, useRef } from "react";

interface PersistedState {
  displayedCount: number;
  scrollY: number;
  timestamp: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const PREFIX = "zelpi:list-state:";

function readState(key: string): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (Date.now() - parsed.timestamp > TTL_MS) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeState(key: string, state: Omit<PersistedState, "timestamp">) {
  try {
    sessionStorage.setItem(
      PREFIX + key,
      JSON.stringify({ ...state, timestamp: Date.now() })
    );
  } catch {
    // ignore quota errors
  }
}

/**
 * Persists infinite-scroll list state (displayed count + scroll position)
 * across navigation. When the user navigates back to the page, the list
 * is restored to where they left off.
 *
 * Usage:
 *   const { restore, save } = useListStatePersistence(`category-${slug}`, defaultCount);
 *   const [displayedCount, setDisplayedCount] = useState(restore().displayedCount);
 *   // call save(displayedCount) whenever it changes; scroll is captured on unload/unmount
 */
export function useListStatePersistence(key: string, defaultCount: number) {
  const initial = useRef<PersistedState | null>(readState(key));
  const latestCount = useRef<number>(initial.current?.displayedCount ?? defaultCount);

  // Restore scroll once after mount (next frame, so DOM has rendered)
  useEffect(() => {
    const stored = initial.current;
    if (!stored) return;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.scrollTo(0, stored.scrollY);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Save current state on unmount and on pagehide (back/forward, tab switch)
  useEffect(() => {
    const persist = () => {
      writeState(key, {
        displayedCount: latestCount.current,
        scrollY: window.scrollY,
      });
    };
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [key]);

  return {
    initialCount: initial.current?.displayedCount ?? defaultCount,
    setCount: (count: number) => {
      latestCount.current = count;
    },
    clear: () => {
      try {
        sessionStorage.removeItem(PREFIX + key);
      } catch {
        // ignore
      }
      latestCount.current = defaultCount;
    },
  };
}
