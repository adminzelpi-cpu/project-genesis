/**
 * Concurrency-limited, connection-aware prefetch queue.
 *
 * - Caps concurrent prefetches at MAX_CONCURRENT (default 3) so we never
 *   compete with above-the-fold requests.
 * - Skips entirely on slow connections (effectiveType "slow-2g" / "2g")
 *   or when the user has Save-Data enabled.
 * - Deduplicates in-flight requests by key.
 * - Silent: errors are swallowed (prefetch is a hint, never critical).
 */

const MAX_CONCURRENT = 3;
const inFlight = new Set<string>();
const queue: Array<{ key: string; run: () => Promise<unknown> }> = [];
let active = 0;

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
}

export function isPrefetchAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as unknown as { connection?: NetworkInformation })
    .connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return false;
  return true;
}

function drain() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()!;
    active++;
    next
      .run()
      .catch(() => {
        // swallow — prefetch failures must never surface
      })
      .finally(() => {
        active--;
        inFlight.delete(next.key);
        drain();
      });
  }
}

/**
 * Enqueue a prefetch task. If a task with the same key is already pending
 * or in flight, the call is a no-op.
 */
export function enqueuePrefetch(key: string, task: () => Promise<unknown>) {
  if (!isPrefetchAllowed()) return;
  if (inFlight.has(key)) return;
  if (queue.some((q) => q.key === key)) return;
  inFlight.add(key);
  queue.push({ key, run: task });
  drain();
}
