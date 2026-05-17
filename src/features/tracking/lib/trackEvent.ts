// E-commerce Tracking Events Library
// Supports: Meta, Google Analytics 4, Google Ads, TikTok, Pinterest

import { supabase } from "@/integrations/supabase/client";
import { storeKey } from "@/lib/storeStorageKeys";
import { getAnonymousId } from "./anonymousId";

/**
 * Detect Meta content_type from a retailer_id format.
 * - "P{code}"           → product_group (parent SKU, no variant)
 * - "P{code}-C{x}"      → product_group (color group, no size)
 * - "P{code}-C{x}-S{y}" → product (variant SKU, matches feed item)
 * - anything else (raw UUID, legacy) → product (best-effort)
 */
function detectContentType(id: string): "product" | "product_group" {
  if (/^P[\w]+(-C\d+)?$/.test(id)) return "product_group";
  if (/^P[\w]+-C\d+-S\d+$/.test(id)) return "product";
  return "product";
}

/** Dedupe an array of content_ids preserving order. */
function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Hybrid grouping for multi-item events (InitiateCheckout, AddPaymentInfo, Purchase).
 * - content_ids   = unique group ids (mirrors feed item_group_id)
 * - contents[].id = full SKU (granularity preserved)
 * - content_type  = "product_group" if any item has a real group, else inferred from SKUs
 */
function buildGroupedContent(products: ProductData[]): {
  contentIds: string[];
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  contentType: "product" | "product_group";
} {
  const groups = products.map((p) => p.contentGroupId || p.id);
  const anyGrouped = products.some((p) => p.contentGroupId && p.contentGroupId !== p.id);
  const contentIds = dedupeIds(groups);
  const contents = products.map((p) => ({
    id: p.id,
    quantity: p.quantity || 1,
    item_price: round2(p.price),
  }));
  let contentType: "product" | "product_group";
  if (anyGrouped) {
    contentType = "product_group";
  } else {
    const ctTypes = new Set(contentIds.map(detectContentType));
    contentType = ctTypes.size === 1 && ctTypes.has("product") ? "product" : "product_group";
  }
  return { contentIds, contents, contentType };
}

/**
 * Round to 2 decimal places — eliminates JS float artifacts
 * (e.g. 3820.4000000000024 → 3820.4) and keeps Pixel ↔ CAPI consistent.
 */
function round2(n: number | undefined | null): number {
  if (typeof n !== "number" || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Wait for at least one tracking pixel to be available.
 */
function waitForPixels(timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.fbq || window.gtag || window.ttq || window.pintrk) {
      resolve(true);
      return;
    }
    const interval = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      if (window.fbq || window.gtag || window.ttq || window.pintrk) {
        clearInterval(timer);
        resolve(true);
      } else if (elapsed >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, interval);
  });
}

export interface ProductData {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  brand?: string;
  variant?: string;
  image_url?: string;
  /** Loja-specific currency (default BRL). Override per event when needed. */
  currency?: string;
  /** Hybrid grouping: pre-computed Meta `content_ids` value matching the catalog
   *  feed `item_group_id`. When omitted the SKU is used as the group (legacy). */
  contentGroupId?: string;
}

export interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface PurchaseData {
  orderId: string;
  value: number;
  currency?: string;
  products: ProductData[];
  shipping?: number;
  tax?: number;
  coupon?: string;
}

export interface TrackingOptions {
  excludeShipping?: boolean;
  userData?: UserData;
  googleAdsConversionLabel?: string | null;
  googleAdsId?: string | null;
  /** Pre-generated event ID — pass when the server-side webhook already
   *  fired (or will fire) the same event, so platforms can deduplicate. */
  eventId?: string;
}

// Generate unique event ID for deduplication
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get external_id from checkout data (CPF) for Advanced Matching.
 * Also returns available user data for per-event matching.
 */
function getMatchingData(): { external_id?: string; em?: string; ph?: string; fn?: string; ln?: string } {
  const data: Record<string, string> = {};

  // Source 1: checkout_data_v2
  try {
    const raw = localStorage.getItem(storeKey('checkout_data_v2'));
    if (raw) {
      const stored = JSON.parse(raw);
      const parsed = stored.data || stored;
      if (parsed.personalData?.cpf) data.external_id = parsed.personalData.cpf.replace(/\D/g, "");
      if (parsed.personalData?.email) data.em = parsed.personalData.email.toLowerCase().trim();
      if (parsed.personalData?.phone) {
        const digits = parsed.personalData.phone.replace(/\D/g, "");
        data.ph = digits.length === 11 ? `55${digits}` : digits;
      }
      if (parsed.personalData?.fullName) {
        const parts = parsed.personalData.fullName.trim().split(/\s+/);
        if (parts[0]) data.fn = parts[0].toLowerCase();
        if (parts.length > 1) data.ln = parts.slice(1).join(" ").toLowerCase();
      }
    }
  } catch {}

  // Source 2: Cached logged-in customer data
  try {
    const cached = localStorage.getItem(storeKey('am_customer_data'));
    if (cached) {
      const customer = JSON.parse(cached);
      if (!data.em && customer.email) data.em = customer.email.toLowerCase().trim();
      if (!data.ph && customer.telefone) {
        const digits = customer.telefone.replace(/\D/g, "");
        data.ph = digits.length === 11 ? `55${digits}` : digits;
      }
      if (!data.fn && customer.nome) {
        const parts = customer.nome.trim().split(/\s+/);
        if (parts[0]) data.fn = parts[0].toLowerCase();
        if (parts.length > 1) data.ln = parts.slice(1).join(" ").toLowerCase();
      }
      if (!data.external_id && customer.cpf) data.external_id = customer.cpf.replace(/\D/g, "");
    }
  } catch {}

  // Fallback: persistent anonymous_id for cross-session match (top-of-funnel)
  if (!data.external_id) {
    data.external_id = getAnonymousId();
  }

  return data;
}

/**
 * Get customer data from multiple sources for CAPI matching.
 */
function getCustomerDataForCAPI(): Record<string, string> {
  const data: Record<string, string> = {};

  // Source 1: checkout_data_v2
  try {
    const raw = localStorage.getItem(storeKey('checkout_data_v2'));
    if (raw) {
      const stored = JSON.parse(raw);
      const parsed = stored.data || stored;
      if (parsed.personalData?.email) data.customerEmail = parsed.personalData.email;
      if (parsed.personalData?.phone) data.customerPhone = parsed.personalData.phone;
      if (parsed.personalData?.fullName) {
        const parts = parsed.personalData.fullName.trim().split(/\s+/);
        if (parts[0]) data.customerFirstName = parts[0];
        if (parts.length > 1) data.customerLastName = parts.slice(1).join(" ");
      }
      if (parsed.personalData?.cpf) data.customerCpf = parsed.personalData.cpf;
      if (parsed.deliveryAddress?.city) data.customerCity = parsed.deliveryAddress.city;
      if (parsed.deliveryAddress?.state) data.customerState = parsed.deliveryAddress.state;
      if (parsed.deliveryAddress?.zipCode) data.customerZipCode = parsed.deliveryAddress.zipCode;
    }
  } catch {}

  // Source 2: Cached logged-in customer data (includes gender & date of birth)
  try {
    const cached = localStorage.getItem(storeKey('am_customer_data'));
    if (cached) {
      const customer = JSON.parse(cached);
      if (!data.customerEmail && customer.email) data.customerEmail = customer.email;
      if (!data.customerPhone && customer.telefone) data.customerPhone = customer.telefone;
      if (!data.customerFirstName && customer.nome) {
        const parts = customer.nome.trim().split(/\s+/);
        if (parts[0]) data.customerFirstName = parts[0];
        if (parts.length > 1) data.customerLastName = parts.slice(1).join(" ");
      }
      if (!data.customerCpf && customer.cpf) data.customerCpf = customer.cpf;
      // Gender: if available from customer record
      if (customer.genero) {
        data.customerGender = customer.genero; // 'm' or 'f'
      }
      // Date of birth: convert to YYYYMMDD format
      if (customer.data_nascimento) {
        const dob = customer.data_nascimento.replace(/\D/g, "");
        // Could be YYYY-MM-DD or DD/MM/YYYY
        if (dob.length === 8) {
          data.customerDateOfBirth = dob;
        }
      }
    }
  } catch {}

  data.customerCountry = "BR";
  return data;
}

/**
 * Send event to server-side CAPI (fire-and-forget).
 */
function sendServerEvent(params: {
  eventName: string;
  eventId: string;
  storeId: string;
  value?: number;
  currency?: string;
  products?: Array<{ id: string; name?: string; quantity: number; price?: number; category?: string; contentGroupId?: string }>;
  orderId?: string;
}) {
  const customerData = getCustomerDataForCAPI();
  const anonymousId = getAnonymousId();

  supabase.functions.invoke("track-conversion", {
    body: {
      ...params,
      ...customerData,
      // Anonymous visitor id — used as external_id fallback when no CPF
      anonymousId,
      // Meta attribution cookies
      fbp: document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/)?.[1] || "",
      fbc: document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/)?.[1] || "",
      // TikTok attribution cookies (highest EMQ impact for TikTok)
      ttclid: new URLSearchParams(window.location.search).get("ttclid") || document.cookie.match(/(?:^|;\s*)ttclid=([^;]*)/)?.[1] || "",
      ttp: document.cookie.match(/(?:^|;\s*)_ttp=([^;]*)/)?.[1] || "",
      // Pinterest attribution (_epik cookie or epik= URL param)
      epik: document.cookie.match(/(?:^|;\s*)_epik=([^;]*)/)?.[1] || new URLSearchParams(window.location.search).get("epik") || "",
      sourceUrl: window.location.href,
    },
  }).catch((err) => {
    console.warn("[CAPI] Failed to send server event:", err);
  });
}

// ─── PageView ────────────────────────────────────────────────
export async function trackPageView(storeId?: string) {
  const eventId = generateEventId();

  // Fire client-side pixels (best-effort; may be blocked by adblockers)
  waitForPixels().then(() => {
    if (window.fbq) {
      window.fbq("track", "PageView", {}, { eventID: eventId });
    }
    if (window.ttq) {
      window.ttq.page();
    }
    if (window.pintrk) {
      window.pintrk("page");
    }
  });

  // Fire server-side CAPI in parallel — works even when pixels are blocked
  if (storeId) {
    sendServerEvent({
      eventName: "PageView",
      eventId,
      storeId,
    });
  }
}

// ─── ViewContent ─────────────────────────────────────────────
/**
 * @param contentType "product" when a specific variant is selected (PDP w/ color),
 *                    "product_group" for parent product (PDP w/o variant selected).
 *                    Per Meta best practice for Advantage+ Catalog Sales / DPA.
 */
export async function trackViewContent(
  product: ProductData,
  storeId?: string,
  itemList?: { id?: string; name?: string },
  contentType?: "product" | "product_group",
) {
  const eventId = generateEventId();
  if (!product.currency && import.meta.env.DEV) {
    console.warn("[tracking] trackViewContent called without product.currency — falling back to BRL. Pass store.currency for multi-currency support.");
  }
  const currency = product.currency || "BRL";
  const price = round2(product.price);
  // Hybrid: if a content_group_id is provided, use it as content_ids and force product_group.
  const useGroup = !!product.contentGroupId && product.contentGroupId !== product.id;
  const finalContentType: "product" | "product_group" = useGroup
    ? "product_group"
    : (contentType || detectContentType(product.id));
  const contentIds = useGroup ? [product.contentGroupId!] : [product.id];

  // Fire CAPI immediately — does not depend on pixel scripts (resilient to adblockers)
  if (storeId) {
    sendServerEvent({
      eventName: "ViewContent",
      eventId,
      storeId,
      value: price,
      currency,
      products: [{ id: product.id, name: product.name, quantity: 1, price, category: product.category, contentGroupId: product.contentGroupId }],
    });
  }

  // Fire client-side pixels in background once they're loaded (best-effort)
  waitForPixels().then(() => {
    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_type: finalContentType,
        content_ids: contentIds,
        content_name: product.name,
        content_category: product.category,
        contents: [{ id: product.id, quantity: 1, item_price: price }],
        value: price,
        currency,
      }, { eventID: eventId });
    }

    if (window.gtag) {
      window.gtag("event", "view_item", {
        currency,
        value: price,
        ...(itemList?.id ? { item_list_id: itemList.id } : {}),
        ...(itemList?.name ? { item_list_name: itemList.name } : {}),
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          item_brand: product.brand,
          price,
          quantity: 1,
          ...(itemList?.id ? { item_list_id: itemList.id } : {}),
          ...(itemList?.name ? { item_list_name: itemList.name } : {}),
        }],
      });
    }

    if (window.ttq) {
      window.ttq.track("ViewContent", {
        contents: [{ content_id: product.id, content_name: product.name, quantity: 1, price }],
        content_type: finalContentType,
        value: price,
        currency,
      });
    }

    if (window.pintrk) {
      window.pintrk("track", "pagevisit", {
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        value: price,
        currency,
      });
    }
  });
}

// ─── ViewCategory ────────────────────────────────────────────
export async function trackViewCategory(categoryName: string, products: ProductData[], storeId?: string, _currency: string = "BRL") {
  const eventId = generateEventId();
  const contentIds = dedupeIds(products.map(p => p.id));
  // ViewCategory is a top-of-funnel browse signal — it does NOT represent
  // purchase intent. We intentionally OMIT `value` and `currency` so the
  // ad platforms don't mis-optimize on a misleading signal (and so Meta
  // doesn't surface it as a Value event in Ads Manager).
  // Force product_group (category browsing is a group-level signal, never a SKU).
  const finalContentType: "product_group" = "product_group";

  // CAPI first (resilient to adblockers) — no value/currency sent.
  if (storeId) {
    sendServerEvent({
      eventName: "ViewCategory",
      eventId,
      storeId,
      products: products.map(p => ({ id: p.id, name: p.name, quantity: 1, category: categoryName })),
    });
  }

  waitForPixels().then(() => {
    if (window.fbq) {
      // Meta: category pages send `product_group` (parent product IDs).
      // No value/currency on purpose — see comment above.
      window.fbq("trackCustom", "ViewCategory", {
        content_category: categoryName,
        content_ids: contentIds,
        content_type: finalContentType,
        contents: contentIds.map(id => ({ id, quantity: 1 })),
        num_items: contentIds.length,
      }, { eventID: eventId });
    }

    if (window.gtag) {
      window.gtag("event", "view_item_list", {
        item_list_id: categoryName,
        item_list_name: categoryName,
        items: products.map(p => ({
          item_id: p.id,
          item_name: p.name,
          item_category: categoryName,
          price: p.price,
        })),
      });
    }

    if (window.ttq) {
      window.ttq.track("Browse", {
        contents: contentIds.map(id => ({ content_id: id, quantity: 1 })),
        content_type: finalContentType,
      });
    }

    if (window.pintrk) {
      window.pintrk("track", "viewcategory", {
        product_category: categoryName,
        line_items: products.map(p => ({
          product_id: p.id,
          product_name: p.name,
        })),
      });
    }
  });
}

// ─── SelectItem (GA4) ───────────────────────────────────────
// Fires when user clicks a product card in a list (category, search, recommendations).
// GA4-only event — Meta/TikTok/Pinterest don't have a standard equivalent.
export async function trackSelectItem(product: ProductData, itemList: { id?: string; name?: string }) {
  await waitForPixels();
  if (window.gtag) {
    window.gtag("event", "select_item", {
      ...(itemList.id ? { item_list_id: itemList.id } : {}),
      ...(itemList.name ? { item_list_name: itemList.name } : {}),
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        price: product.price,
        quantity: 1,
        ...(itemList.id ? { item_list_id: itemList.id } : {}),
        ...(itemList.name ? { item_list_name: itemList.name } : {}),
      }],
    });
  }
}


export async function trackAddToCart(
  product: ProductData,
  storeId?: string,
  itemList?: { id?: string; name?: string },
  /** Hybrid grouping: when caller knows the feed item_group_id (derived via
   *  getContentGroupId honoring display_variations_separately), pass it here.
   *  - content_ids   → [contentGroupId]   (matches catalog item_group_id)
   *  - contents[].id → product.id          (full SKU, matches catalog id)
   *  - content_type  → "product_group"
   *  When omitted, falls back to legacy single-id behavior.
   *  IMPORTANT: AddToCart sends ONLY the item just added — never the whole cart. */
  contentGroupId?: string,
) {
  const eventId = generateEventId();
  const quantity = product.quantity || 1;
  const price = round2(product.price);
  const value = round2(price * quantity);
  if (!product.currency && import.meta.env.DEV) {
    console.warn("[tracking] trackAddToCart called without product.currency — falling back to BRL. Pass store.currency for multi-currency support.");
  }
  const currency = product.currency || "BRL";

  // Hybrid: when a group id is provided we always emit product_group with
  // content_ids = [group] and contents[].id = SKU (mirrors feed structure).
  const useGroup = !!contentGroupId && contentGroupId !== product.id;
  const contentType: "product" | "product_group" = useGroup
    ? "product_group"
    : detectContentType(product.id);
  const contentIds = useGroup ? [contentGroupId!] : [product.id];

  // CAPI first (resilient to adblockers)
  if (storeId) {
    sendServerEvent({
      eventName: "AddToCart",
      eventId,
      storeId,
      value,
      currency,
      products: [{ id: product.id, name: product.name, quantity, price, category: product.category }],
    });
  }

  waitForPixels().then(() => {
    if (window.fbq) {
      window.fbq("track", "AddToCart", {
        content_type: contentType,
        content_ids: contentIds,
        content_name: product.name,
        content_category: product.category,
        contents: [{ id: product.id, quantity, item_price: price }],
        num_items: quantity,
        value,
        currency,
      }, { eventID: eventId });
    }

    if (window.gtag) {
      window.gtag("event", "add_to_cart", {
        currency,
        value,
        ...(itemList?.id ? { item_list_id: itemList.id } : {}),
        ...(itemList?.name ? { item_list_name: itemList.name } : {}),
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          item_brand: product.brand,
          item_variant: product.variant,
          price,
          quantity,
          ...(itemList?.id ? { item_list_id: itemList.id } : {}),
          ...(itemList?.name ? { item_list_name: itemList.name } : {}),
        }],
      });
    }

    if (window.ttq) {
      window.ttq.track("AddToCart", {
        contents: [{ content_id: product.id, content_name: product.name, quantity, price }],
        content_type: contentType,
        value,
        currency,
      });
    }

    if (window.pintrk) {
      window.pintrk("track", "addtocart", {
        product_id: product.id,
        product_name: product.name,
        value,
        currency,
        order_quantity: quantity,
      });
    }
  });
}

// ─── Refresh Advanced Matching ───────────────────────────────
/**
 * Re-initialize Advanced Matching on all active pixels.
 * Call this after user data becomes available (e.g. after personal data step).
 * Meta: fbq('init', pixelId, userData) can be called again to update AM.
 * TikTok: ttq.identify() updates user identity.
 * Pinterest: pintrk('set', userData) updates enhanced match.
 * Google: gtag('set', 'user_data') sets user data for Enhanced Conversions globally.
 */
export async function refreshAdvancedMatching() {
  await waitForPixels();
  const matching = getMatchingData();
  if (!matching.em && !matching.ph && !matching.external_id) return;

  // Meta - re-init with user data
  if (window.fbq && window.__metaPixelId) {
    const amData: Record<string, string> = {};
    if (matching.em) amData.em = matching.em;
    if (matching.ph) amData.ph = matching.ph;
    if (matching.fn) amData.fn = matching.fn;
    if (matching.ln) amData.ln = matching.ln;
    if (matching.external_id) amData.external_id = matching.external_id;
    amData.country = "br";
    window.fbq("init", window.__metaPixelId, amData);
  }

  // Google Enhanced Conversions - set user_data globally
  // Spec: https://support.google.com/google-ads/answer/13258081
  // Address fields MUST be nested under `address` object — flat fields are ignored.
  if (window.gtag) {
    const gUserData: Record<string, unknown> = {};
    if (matching.em) gUserData.email = matching.em;
    if (matching.ph) {
      gUserData.phone_number = matching.ph.startsWith("55") ? `+${matching.ph}` : `+55${matching.ph}`;
    }

    const address: Record<string, string> = {};
    if (matching.fn) address.first_name = matching.fn;
    if (matching.ln) address.last_name = matching.ln;
    address.country = "br";

    // Try to get address data from checkout
    try {
      const raw = localStorage.getItem(storeKey('checkout_data_v2'));
      if (raw) {
        const stored = JSON.parse(raw);
        const parsed = stored.data || stored;
        if (parsed.deliveryAddress?.city) address.city = parsed.deliveryAddress.city.toLowerCase().trim();
        if (parsed.deliveryAddress?.state) address.region = parsed.deliveryAddress.state.toLowerCase().trim();
        if (parsed.deliveryAddress?.zipCode) address.postal_code = parsed.deliveryAddress.zipCode.replace(/\D/g, "");
        if (parsed.deliveryAddress?.street) {
          const street = parsed.deliveryAddress.street.toLowerCase().trim();
          const num = parsed.deliveryAddress?.number ? `, ${parsed.deliveryAddress.number}` : "";
          address.street = `${street}${num}`.toLowerCase().trim();
        }
      }
    } catch {}

    if (Object.keys(address).length > 1) { // more than just country
      gUserData.address = address;
    }

    if (Object.keys(gUserData).length > 0) {
      window.gtag("set", "user_data", gUserData);
    }
  }

  // TikTok - identify
  if (window.ttq) {
    const identifyData: Record<string, string> = {};
    if (matching.em) identifyData.email = matching.em;
    if (matching.ph) identifyData.phone_number = `+${matching.ph}`;
    if (matching.external_id) identifyData.external_id = matching.external_id;
    if (Object.keys(identifyData).length > 0) {
      window.ttq.identify(identifyData);
    }
  }

  // Pinterest - set enhanced match
  if (window.pintrk) {
    const pinData: Record<string, string> = {};
    if (matching.em) pinData.em = matching.em;
    if (matching.ph) pinData.ph = matching.ph;
    if (matching.fn) pinData.fn = matching.fn;
    if (matching.ln) pinData.ln = matching.ln;
    if (matching.external_id) pinData.external_id = matching.external_id;
    window.pintrk("set", pinData);
  }
}

// ─── ViewCart (GA4 recommended) ──────────────────────────────
export async function trackViewCart(products: ProductData[], totalValue: number, currency: string = "BRL") {
  await waitForPixels();
  const value = round2(totalValue);

  if (window.gtag) {
    window.gtag("event", "view_cart", {
      currency,
      value,
      items: products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        item_brand: p.brand,
        price: round2(p.price),
        quantity: p.quantity || 1,
      })),
    });
  }
}

// ─── InitiateCheckout ────────────────────────────────────────
export async function trackInitiateCheckout(products: ProductData[], totalValue: number, storeId?: string, currency: string = "BRL") {
  await waitForPixels();
  const eventId = generateEventId();
  const value = round2(totalValue);
  const numItems = products.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const { contentIds, contents, contentType: ctIC } = buildGroupedContent(products);

  // Refresh Advanced Matching before sending checkout event
  await refreshAdvancedMatching();

  // Meta - with content_name + subtotal + per-item prices
  if (window.fbq) {
    window.fbq("track", "InitiateCheckout", {
      content_ids: contentIds,
      content_name: "Checkout",
      contents,
      content_type: ctIC,
      num_items: numItems,
      value,
      currency,
    }, { eventID: eventId });
  }

  // GA4
  if (window.gtag) {
    window.gtag("event", "begin_checkout", {
      currency,
      value,
      items: products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: round2(p.price),
        quantity: p.quantity || 1,
      })),
    });
  }

  // TikTok - with content details
  if (window.ttq) {
    window.ttq.track("InitiateCheckout", {
      contents: products.map(p => ({ content_id: p.id, content_name: p.name, quantity: p.quantity || 1, price: round2(p.price) })),
      content_type: ctIC,
      value,
      currency,
    });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk("track", "checkout", {
      value,
      currency,
      order_quantity: numItems,
      line_items: products.map(p => ({
        product_id: p.id,
        product_name: p.name,
        product_quantity: p.quantity || 1,
        product_price: round2(p.price),
      })),
    });
  }

  // CAPI
  if (storeId) {
    sendServerEvent({
      eventName: "InitiateCheckout",
      eventId,
      storeId,
      value,
      currency,
      products: products.map(p => ({ id: p.id, name: p.name, quantity: p.quantity || 1, price: round2(p.price), category: p.category, contentGroupId: p.contentGroupId })),
    });
  }
}

// ─── AddPaymentInfo ──────────────────────────────────────────
export async function trackAddPaymentInfo(paymentMethod: string, value: number, storeId?: string, products?: ProductData[], currency: string = "BRL") {
  await waitForPixels();
  const eventId = generateEventId();
  const v = round2(value);
  const productList = products || [];
  const numItems = productList.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const { contentIds, contents, contentType: ctAPI } = buildGroupedContent(productList);

  // Meta - with content_category (payment type) + funnel link via content_ids
  if (window.fbq) {
    const metaPayload: Record<string, unknown> = {
      value: v,
      currency,
      content_category: paymentMethod,
    };
    if (contentIds.length > 0) {
      metaPayload.content_ids = contentIds;
      metaPayload.content_type = ctAPI;
      metaPayload.contents = contents;
      metaPayload.num_items = numItems;
    }
    window.fbq("track", "AddPaymentInfo", metaPayload, { eventID: eventId });
  }

  // GA4 - with items array (recommended by Google)
  if (window.gtag) {
    const gtagData: Record<string, unknown> = {
      currency,
      value: v,
      payment_type: paymentMethod,
    };
    if (products && products.length > 0) {
      gtagData.items = products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: round2(p.price),
        quantity: p.quantity || 1,
      }));
    }
    window.gtag("event", "add_payment_info", gtagData);
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track("AddPaymentInfo", {
      value: v,
      currency,
      contents: products?.map(p => ({ content_id: p.id, content_name: p.name, quantity: p.quantity || 1, price: round2(p.price) })) || [],
      content_type: ctAPI,
    });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk("track", "addpaymentinfo", {
      value: v,
      currency,
    });
  }

  // CAPI
  if (storeId) {
    sendServerEvent({
      eventName: "AddPaymentInfo",
      eventId,
      storeId,
      value: v,
      currency,
      products: productList.map(p => ({ id: p.id, name: p.name, quantity: p.quantity || 1, price: round2(p.price), category: p.category, contentGroupId: p.contentGroupId })),
    });
  }
}

// ─── Purchase ────────────────────────────────────────────────
// Returns the eventId for CAPI deduplication
export async function trackPurchase(data: PurchaseData, options?: TrackingOptions): Promise<string> {
  await waitForPixels();
  const eventId = options?.eventId || generateEventId();
  const numItems = data.products.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const { contentIds, contents: groupedContents, contentType: ctP } = buildGroupedContent(data.products);

  const value = round2(options?.excludeShipping
    ? data.value - (data.shipping || 0)
    : data.value);
  const shippingValue = round2(data.shipping || 0);
  const taxValue = round2(data.tax || 0);

  const currency = data.currency || "BRL";

  // Meta - complete with content_name, contents w/ item_price, num_items, predicted_ltv
  const predictedLtv = Math.round(value * 2.5 * 100) / 100;
  if (window.fbq) {
    window.fbq("track", "Purchase", {
      content_ids: contentIds,
      content_name: `Pedido ${data.orderId.substring(0, 8)}`,
      contents: groupedContents.map(c => ({ ...c, delivery_category: "home_delivery" })),
      content_type: ctP,
      num_items: numItems,
      value,
      currency,
      predicted_ltv: predictedLtv,
      order_id: data.orderId,
      delivery_category: "home_delivery",
    }, { eventID: eventId });
  }

  // GA4 with Enhanced Conversions
  if (window.gtag) {
    const gtagData: Record<string, unknown> = {
      transaction_id: data.orderId,
      value,
      currency,
      tax: taxValue,
      shipping: options?.excludeShipping ? 0 : shippingValue,
      items: data.products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        item_brand: p.brand,
        item_variant: p.variant,
        price: round2(p.price),
        quantity: p.quantity || 1,
      })),
    };

    // Coupon parameter (recommended by Google)
    if (data.coupon) {
      gtagData.coupon = data.coupon;
    }

    // Enhanced Conversions - send user data for better attribution
    // Spec: address fields MUST be nested under `address` object.
    if (options?.userData) {
      const ud = options.userData;
      const userData: Record<string, unknown> = {};
      if (ud.email) userData.email = ud.email.toLowerCase().trim();
      if (ud.phone) {
        const digits = ud.phone.replace(/\D/g, "");
        userData.phone_number = digits.length === 11 ? `+55${digits}` : `+${digits}`;
      }

      const address: Record<string, string> = {};
      if (ud.firstName) address.first_name = ud.firstName.toLowerCase().trim();
      if (ud.lastName) address.last_name = ud.lastName.toLowerCase().trim();
      if (ud.city) address.city = ud.city.toLowerCase().trim();
      if (ud.state) address.region = ud.state.toLowerCase().trim();
      if (ud.zipCode) address.postal_code = ud.zipCode.replace(/\D/g, "");
      if (ud.street) {
        const street = ud.street.toLowerCase().trim();
        const num = ud.number ? `, ${ud.number}` : "";
        address.street = `${street}${num}`.toLowerCase().trim();
      }
      address.country = ud.country?.toLowerCase() || "br";

      if (Object.keys(address).length > 1) {
        userData.address = address;
      }

      gtagData.user_data = userData;
    }

    window.gtag("event", "purchase", gtagData);

    // Google Ads Conversion tracking
    if (options?.googleAdsConversionLabel && options?.googleAdsId) {
      window.gtag("event", "conversion", {
        send_to: `${options.googleAdsId}/${options.googleAdsConversionLabel}`,
        transaction_id: data.orderId,
        value,
        currency,
      });
    }
  }

  // TikTok - with content details
  if (window.ttq) {
    window.ttq.track("CompletePayment", {
      contents: data.products.map(p => ({ content_id: p.id, content_name: p.name, quantity: p.quantity || 1, price: round2(p.price) })),
      content_type: ctP,
      value,
      currency,
    });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk("track", "checkout", {
      value,
      currency,
      order_id: data.orderId,
      order_quantity: numItems,
      line_items: data.products.map(p => ({
        product_id: p.id,
        product_name: p.name,
        product_quantity: p.quantity || 1,
        product_price: round2(p.price),
      })),
    });
  }

  return eventId;
}

// ─── Search ──────────────────────────────────────────────────
export async function trackSearch(searchTerm: string, results?: ProductData[], storeId?: string, currency: string = "BRL") {
  await waitForPixels();
  const eventId = generateEventId();
  const totalValue = round2(results?.reduce((sum, p) => sum + p.price, 0) || 0);

  // Meta
  if (window.fbq) {
    window.fbq("track", "Search", {
      search_string: searchTerm,
      content_ids: dedupeIds(results?.map(p => p.id) || []),
      content_type: "product_group",
      contents: results?.map(p => ({ id: p.id, quantity: 1, item_price: round2(p.price) })) || [],
      value: totalValue,
      currency,
    }, { eventID: eventId });
  }

  // GA4 - with items for richer data
  if (window.gtag) {
    const gtagSearchData: Record<string, unknown> = {
      search_term: searchTerm,
    };
    if (results && results.length > 0) {
      gtagSearchData.items = results.slice(0, 10).map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: round2(p.price),
      }));
    }
    window.gtag("event", "search", gtagSearchData);
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track("Search", {
      query: searchTerm,
      contents: results?.map(p => ({ content_id: p.id, content_name: p.name, quantity: 1 })) || [],
    });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk("track", "search", {
      search_query: searchTerm,
    });
  }
}
