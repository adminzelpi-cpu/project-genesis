// Persistent anonymous visitor ID for tracking match quality.
// Used as `external_id` fallback in Meta/TikTok/Pinterest/CAPI when the
// visitor hasn't yet identified (no CPF/email). Persists in localStorage
// so the same visitor across pageviews/sessions is recognized — improving
// EMQ (Event Match Quality) on top-of-funnel events.
//
// Important: this is NOT PII. It's an opaque random UUID generated locally,
// used purely to deduplicate and link events from the same browser/device.

import { storeKey } from "@/lib/storeStorageKeys";

const KEY = "tracking_anonymous_id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the persisted anonymous visitor ID for the current store,
 * generating and storing one on first call. Safe to call repeatedly.
 */
export function getAnonymousId(): string {
  try {
    const k = storeKey(KEY);
    const existing = localStorage.getItem(k);
    if (existing && existing.length > 8) return existing;
    const fresh = generateUUID();
    localStorage.setItem(k, fresh);
    return fresh;
  } catch {
    // SSR / private mode — return ephemeral id, not persisted
    return generateUUID();
  }
}
