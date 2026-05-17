import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConversionEvent {
  eventName: string;
  eventId: string;
  storeId: string;
  orderId?: string;
  value?: number;
  currency?: string;
  products?: Array<{
    id: string;
    name?: string;
    quantity: number;
    price?: number;
    category?: string;
    /** Hybrid Meta grouping: pre-computed `item_group_id` mirroring the
     *  catalog feed. When omitted the SKU is used as the group (legacy). */
    contentGroupId?: string;
  }>;
  // Basic PII
  customerEmail?: string;
  customerPhone?: string;
  // Advanced Matching fields
  customerFirstName?: string;
  customerLastName?: string;
  customerCity?: string;
  customerState?: string;
  customerZipCode?: string;
  customerCountry?: string;
  customerCpf?: string; // External ID for Brazil
  customerGender?: string; // 'm' or 'f'
  customerDateOfBirth?: string; // YYYYMMDD format
  // Meta cookies for attribution
  fbp?: string;
  fbc?: string;
  // TikTok cookies for attribution
  ttclid?: string; // TikTok click ID (highest EMQ impact)
  ttp?: string; // TikTok _ttp cookie
  // Pinterest click ID
  epik?: string; // Pinterest _epik cookie or epik= URL param
  // Anonymous visitor id (top-of-funnel external_id fallback)
  anonymousId?: string;
  // Request metadata
  userAgent?: string;
  sourceUrl?: string;
  clientIpAddress?: string;
}

/**
 * Detect Meta content_type from a retailer_id format. MUST mirror client-side
 * `detectContentType` in src/features/tracking/lib/trackEvent.ts so client
 * pixel and server CAPI deduplicate cleanly on Meta.
 *  - "P{code}"           → product_group
 *  - "P{code}-C{x}"      → product_group
 *  - "P{code}-C{x}-S{y}" → product
 *  - anything else (legacy UUID) → product
 */
function detectContentType(id: string): "product" | "product_group" {
  if (/^P[\w]+-C\d+-S\d+$/.test(id)) return "product";
  if (/^P[\w]+(-C\d+)?$/.test(id)) return "product_group";
  return "product";
}

/** Dedupe content_ids preserving order. */
function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Hybrid grouping: compute Meta `content_ids` (group level) + `contents` (SKU
 * level) mirroring the client buildGroupedContent helper. Keeps server CAPI in
 * lockstep with the browser pixel so dedup works.
 */
function buildGrouped(products: Array<{ id: string; contentGroupId?: string }>) {
  const groups = products.map((p) => p.contentGroupId || p.id);
  const anyGrouped = products.some((p) => p.contentGroupId && p.contentGroupId !== p.id);
  const contentIds = dedupeIds(groups);
  let contentType: "product" | "product_group";
  if (anyGrouped) {
    contentType = "product_group";
  } else {
    const types = new Set(contentIds.map(detectContentType));
    contentType = types.size === 1 && types.has("product") ? "product" : "product_group";
  }
  return { contentIds, contentType };
}

/** Round to 2 decimals — kills JS float artifacts (e.g. 3820.4000000000024). */
function round2(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

// Hash function for PII (email, phone) - SHA256
async function hashPII(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalize phone to E.164 format for Brazil
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `+55${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits}`;
  }
  return `+55${digits}`;
}

// Send to Meta Conversions API
async function sendToMetaCAPI(
  event: ConversionEvent,
  config: { pixelId: string; accessToken: string; testEventCode?: string }
) {
  const eventTime = Math.floor(Date.now() / 1000);
  
  const userData: Record<string, string> = {};
  
  // Basic PII (high EMQ impact)
  if (event.customerEmail) {
    userData.em = await hashPII(event.customerEmail);
  }
  if (event.customerPhone) {
    userData.ph = await hashPII(normalizePhone(event.customerPhone));
  }
  
  // Advanced Matching - Name (high EMQ impact)
  if (event.customerFirstName) {
    userData.fn = await hashPII(event.customerFirstName);
  }
  if (event.customerLastName) {
    userData.ln = await hashPII(event.customerLastName);
  }
  
  // Advanced Matching - Address
  if (event.customerCity) {
    // Meta: lowercase, no special chars, no spaces
    userData.ct = await hashPII(event.customerCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
  }
  if (event.customerState) {
    // Meta: send full state abbreviation lowercase (e.g. "sp", "rj") - do NOT truncate
    userData.st = await hashPII(event.customerState.toLowerCase().trim());
  }
  if (event.customerZipCode) {
    // Remove non-digits for zip (CEP)
    userData.zp = await hashPII(event.customerZipCode.replace(/\D/g, ""));
  }
  if (event.customerCountry) {
    // Meta: 2-letter ISO country code lowercase
    userData.country = await hashPII(event.customerCountry.toLowerCase().substring(0, 2));
  } else {
    userData.country = await hashPII("br");
  }
  
  // Gender (medium EMQ impact)
  if (event.customerGender) {
    // Meta expects 'f' or 'm'
    userData.ge = await hashPII(event.customerGender.toLowerCase().substring(0, 1));
  }
  
  // Date of birth (medium EMQ impact)
  if (event.customerDateOfBirth) {
    // Meta expects YYYYMMDD format
    userData.db = await hashPII(event.customerDateOfBirth.replace(/\D/g, ""));
  }
  
  // External ID (CPF for Brazil - high EMQ impact). Fallback to anonymous_id
  // so top-of-funnel events still match the same visitor across sessions.
  if (event.customerCpf) {
    userData.external_id = await hashPII(event.customerCpf.replace(/\D/g, ""));
  } else if (event.anonymousId) {
    userData.external_id = await hashPII(event.anonymousId);
  }
  
  // Request metadata (not hashed - required for website events)
  if (event.clientIpAddress) {
    userData.client_ip_address = event.clientIpAddress;
  }
  if (event.userAgent) {
    userData.client_user_agent = event.userAgent;
  }
  
  // Meta attribution cookies (not hashed - critical for attribution)
  if (event.fbp) {
    userData.fbp = event.fbp;
  }
  if (event.fbc) {
    userData.fbc = event.fbc;
  }

  // Build custom_data with all recommended parameters.
  // content_type must mirror the client-side Pixel for proper deduplication:
  //  - ViewCategory  → 'product_group' (parent product IDs)
  //  - everything else → 'product'
  // content_type is inferred from the actual product IDs (retailer_id format).
  // - All ids look like P-C-S → "product" (matches feed item)
  // - Any id is a parent/group (P or P-C) → "product_group"
  // This MUST mirror the client-side Pixel inference for proper dedup.
  // Hybrid grouping: when products carry contentGroupId, content_ids = group
  // and contents[].id = SKU. Otherwise infer from id format.
  let contentType: "product" | "product_group" = "product";
  let groupedIds: string[] = [];
  if (event.products && event.products.length > 0) {
    const g = buildGrouped(event.products);
    contentType = g.contentType;
    groupedIds = g.contentIds;
  } else if (event.eventName === "ViewCategory") {
    contentType = "product_group";
  }
  const isViewCategory = event.eventName === "ViewCategory";
  const customData: Record<string, unknown> = {
    content_type: contentType,
  };
  // ViewCategory is a top-of-funnel browse signal — we intentionally OMIT
  // value & currency so Meta doesn't treat it as a value event. Mirrors client.
  if (!isViewCategory) {
    customData.currency = event.currency || "BRL";
    if (event.value !== undefined) {
      customData.value = round2(event.value);
    }
  }

  if (event.products && event.products.length > 0) {
    // Per-item delivery_category recommended by Meta for physical e-commerce
    const isPurchase = event.eventName === "Purchase";
    customData.contents = event.products.map((p) => {
      const item: Record<string, unknown> = {
        id: p.id,
        quantity: p.quantity,
      };
      // Omit item_price for ViewCategory (no value semantics)
      if (!isViewCategory && p.price !== undefined) item.item_price = round2(p.price);
      if (isPurchase) item.delivery_category = "home_delivery";
      return item;
    });
    customData.content_ids = groupedIds.length > 0 ? groupedIds : dedupeIds(event.products.map((p) => p.id));
    // content_name: only for non-ViewCategory (category uses content_category)
    if (!isViewCategory) {
      customData.content_name = event.products.length === 1
        ? event.products[0].name
        : `${event.products.length} Products`;
    }
    // content_category: first product category if available
    const firstCategory = event.products.find(p => p.category)?.category;
    if (firstCategory) {
      customData.content_category = firstCategory;
    }
    // num_items: total quantity of all items
    customData.num_items = event.products.reduce((sum, p) => sum + (p.quantity || 1), 0);
  }

  if (event.orderId) {
    customData.order_id = event.orderId;
  }

  // Purchase-specific Meta enrichments — must mirror client-side trackEvent.ts
  // for proper deduplication on the platform side.
  if (event.eventName === "Purchase") {
    customData.delivery_category = "home_delivery";
    if (typeof event.value === "number" && event.value > 0) {
      // predicted_ltv = 2.5x order value (industry standard for fashion)
      customData.predicted_ltv = round2(event.value * 2.5);
    }
  }

  const eventData: Record<string, unknown> = {
    event_name: event.eventName,
    event_time: eventTime,
    event_id: event.eventId,
    action_source: "website",
    event_source_url: event.sourceUrl,
    user_data: userData,
    custom_data: customData,
    // LGPD compliance: empty array = no restrictions (required field)
    data_processing_options: [],
  };

  const payload = {
    data: [eventData],
    ...(config.testEventCode && { test_event_code: config.testEventCode }),
  };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${config.pixelId}/events?access_token=${config.accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();
  console.log("[Meta CAPI] Response:", JSON.stringify(result));
  return result;
}

// Send to TikTok Events API
async function sendToTikTokCAPI(
  event: ConversionEvent,
  config: { pixelId: string; accessToken: string; testEventCode?: string }
) {
  const timestamp = new Date().toISOString();

  const userData: Record<string, string> = {};
  
  // Basic PII (high EMQ impact)
  if (event.customerEmail) {
    userData.email = await hashPII(event.customerEmail);
  }
  if (event.customerPhone) {
    userData.phone = await hashPII(normalizePhone(event.customerPhone));
  }
  
  // TikTok click ID (HIGHEST EMQ impact - strongest matching signal)
  if (event.ttclid) {
    userData.ttclid = event.ttclid; // Not hashed
  }
  
  // TikTok _ttp cookie (high EMQ impact)
  if (event.ttp) {
    userData.ttp = event.ttp; // Not hashed
  }
  
  // Advanced Matching - Name
  if (event.customerFirstName) {
    userData.first_name = await hashPII(event.customerFirstName);
  }
  if (event.customerLastName) {
    userData.last_name = await hashPII(event.customerLastName);
  }
  
  // Advanced Matching - Address
  if (event.customerCity) {
    userData.city = await hashPII(event.customerCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
  }
  if (event.customerState) {
    userData.state = await hashPII(event.customerState.toLowerCase().trim());
  }
  if (event.customerZipCode) {
    userData.zip_code = await hashPII(event.customerZipCode.replace(/\D/g, ""));
  }
  if (event.customerCountry) {
    userData.country = await hashPII(event.customerCountry.toLowerCase());
  } else {
    userData.country = await hashPII("br");
  }
  
  // External ID (CPF for Brazil) — fallback to anonymous_id
  if (event.customerCpf) {
    userData.external_id = await hashPII(event.customerCpf.replace(/\D/g, ""));
  } else if (event.anonymousId) {
    userData.external_id = await hashPII(event.anonymousId);
  }
  
  // Request metadata (not hashed - recommended for matching)
  if (event.clientIpAddress) {
    userData.ip = event.clientIpAddress;
  }
  if (event.userAgent) {
    userData.user_agent = event.userAgent;
  }

  // Map event names to TikTok format
  const tiktokEventMap: Record<string, string> = {
    Purchase: "CompletePayment",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    AddPaymentInfo: "AddPaymentInfo",
    PageView: "Pageview",
    Search: "Search",
    ViewCategory: "Browse",
  };

  // TikTok also distinguishes product vs product_group; mirror Meta hybrid logic.
  let ttContentType: "product" | "product_group" = "product";
  if (event.products && event.products.length > 0) {
    ttContentType = buildGrouped(event.products).contentType;
  } else if (event.eventName === "ViewCategory") {
    ttContentType = "product_group";
  }
  // Build properties with all recommended parameters
  const properties: Record<string, unknown> = {
    currency: event.currency || "BRL",
    content_type: ttContentType,
  };
  
  if (event.value !== undefined) {
    properties.value = round2(event.value);
  }
  
  if (event.products && event.products.length > 0) {
    properties.contents = event.products.map((p) => ({
      content_id: p.id,
      content_name: p.name,
      quantity: p.quantity,
      price: p.price !== undefined ? round2(p.price) : undefined,
      content_category: p.category,
    }));
    // content_name for single product
    if (event.products.length === 1 && event.products[0].name) {
      properties.content_name = event.products[0].name;
    }
    // num_items
    properties.num_items = event.products.reduce((sum, p) => sum + (p.quantity || 1), 0);
  }
  
  if (event.orderId) {
    properties.order_id = event.orderId;
  }

  const eventData = {
    pixel_code: config.pixelId,
    event: tiktokEventMap[event.eventName] || event.eventName,
    event_id: event.eventId,
    timestamp,
    context: {
      user: userData,
      page: {
        url: event.sourceUrl,
      },
      user_agent: event.userAgent,
      ip: event.clientIpAddress,
    },
    properties,
    ...(config.testEventCode && { test_event_code: config.testEventCode }),
  };

  const response = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": config.accessToken,
      },
      body: JSON.stringify({ data: [eventData] }),
    }
  );

  const result = await response.json();
  console.log("[TikTok CAPI] Response:", JSON.stringify(result));
  return result;
}

// Send to Google Ads Conversion Tracking (server-side, no Developer Token needed)
// Uses the same public endpoint that gtag.js calls under the hood:
//   https://www.google.com/pagead/conversion/{conversion_id}/?label=...&oid=...
// Deduplication with the browser-side gtag event happens via `oid` (transaction_id),
// which is the same value passed in `transaction_id` on the client.
// Only fires for Purchase — Google Ads server-side endpoint is conversion-only.
async function sendToGoogleAdsConversion(
  event: ConversionEvent,
  config: { conversionId: string; conversionLabel: string }
) {
  if (event.eventName !== "Purchase") {
    return { skipped: true, reason: "google_ads_server_side_purchase_only" };
  }
  if (!event.orderId) {
    return { skipped: true, reason: "missing_order_id_for_dedup" };
  }

  // Normalize conversion_id: accept "AW-123456789" or "123456789"
  const conversionId = String(config.conversionId).replace(/^AW-/i, "").trim();
  const label = String(config.conversionLabel).trim();

  const params = new URLSearchParams({
    label,
    oid: event.orderId, // transaction_id — must match gtag's transaction_id for dedup
    value: String(event.value ?? 0),
    currency_code: event.currency || "BRL",
  });

  // Enhanced Conversions for Web (server-side) — hashed user data via &em= param
  // Google accepts SHA-256 lowercased email here for matching uplift
  if (event.customerEmail) {
    const emHash = await hashPII(event.customerEmail);
    params.set("em", emHash);
  }

  const url = `https://www.google.com/pagead/conversion/${encodeURIComponent(conversionId)}/?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": event.userAgent || "Mozilla/5.0 (compatible; ZelpiServerSide/1.0)",
    },
  });

  // Google returns 200 with a 1x1 gif on success; we just log the status.
  console.log("[Google Ads] Conversion ping status:", response.status, "url:", url);
  return { status: response.status, success: response.ok, oid: event.orderId };
}

// Send to Pinterest Conversions API
async function sendToPinterestCAPI(
  event: ConversionEvent,
  config: { adAccountId?: string; accessToken: string; testEventCode?: string }
) {
  const eventTime = Math.floor(Date.now() / 1000);

  const userData: Record<string, string[]> = {};
  
  // Basic PII (high match impact)
  if (event.customerEmail) {
    userData.em = [await hashPII(event.customerEmail)];
  }
  if (event.customerPhone) {
    userData.ph = [await hashPII(normalizePhone(event.customerPhone))];
  }
  
  // Name
  if (event.customerFirstName) {
    userData.fn = [await hashPII(event.customerFirstName)];
  }
  if (event.customerLastName) {
    userData.ln = [await hashPII(event.customerLastName)];
  }
  
  // Address
  if (event.customerCity) {
    userData.ct = [await hashPII(event.customerCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim())];
  }
  if (event.customerState) {
    userData.st = [await hashPII(event.customerState.toLowerCase().trim())];
  }
  if (event.customerZipCode) {
    userData.zp = [await hashPII(event.customerZipCode.replace(/\D/g, ""))];
  }
  userData.country = [await hashPII(event.customerCountry?.toLowerCase() || "br")];
  
  // Gender and date of birth
  if (event.customerGender) {
    userData.ge = [await hashPII(event.customerGender.toLowerCase().substring(0, 1))];
  }
  if (event.customerDateOfBirth) {
    userData.db = [await hashPII(event.customerDateOfBirth.replace(/\D/g, ""))];
  }
  
  // External ID (CPF) — fallback to anonymous_id
  if (event.customerCpf) {
    userData.external_id = [await hashPII(event.customerCpf.replace(/\D/g, ""))];
  } else if (event.anonymousId) {
    userData.external_id = [await hashPII(event.anonymousId)];
  }
  
  // Pinterest click ID (_epik cookie) - critical for attribution
  if (event.epik) {
    userData.click_id = [event.epik]; // Not hashed
  }
  
  // Request metadata (not hashed)
  if (event.clientIpAddress) {
    userData.client_ip_address = [event.clientIpAddress];
  }
  if (event.userAgent) {
    userData.client_user_agent = [event.userAgent];
  }

  // Map event names to Pinterest format
  const pinterestEventMap: Record<string, string> = {
    Purchase: "checkout",
    ViewContent: "page_visit",
    AddToCart: "add_to_cart",
    InitiateCheckout: "checkout",
    Search: "search",
    PageView: "page_visit",
    ViewCategory: "view_category",
  };

  const eventData: Record<string, unknown> = {
    event_name: pinterestEventMap[event.eventName] || event.eventName.toLowerCase(),
    action_source: "web",
    event_time: eventTime,
    event_id: event.eventId,
    event_source_url: event.sourceUrl,
    opt_out: false, // User has not opted out of tracking
    user_data: userData,
    custom_data: {
      value: String(round2(event.value || 0)),
      currency: event.currency || "BRL",
      content_ids: event.products && event.products.length > 0
        ? buildGrouped(event.products).contentIds
        : [],
      contents: event.products?.map(p => ({
        id: p.id,
        item_name: p.name,
        quantity: p.quantity || 1,
        item_price: String(round2(p.price || 0)),
      })),
      num_items: event.products?.reduce((sum, p) => sum + (p.quantity || 1), 0) || 0,
      order_id: event.orderId,
    },
    ...(config.testEventCode && { test: true }),
  };

  const response = await fetch(
    `https://api.pinterest.com/v5/ad_accounts/${config.adAccountId || "none"}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ data: [eventData] }),
    }
  );

  const result = await response.json();
  console.log("[Pinterest CAPI] Response:", JSON.stringify(result));
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: ConversionEvent = await req.json();
    console.log("[track-conversion] Received event:", event.eventName, "storeId:", event.storeId);

    // Get client IP from headers
    event.clientIpAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                            req.headers.get("cf-connecting-ip") || 
                            "";
    event.userAgent = req.headers.get("user-agent") || "";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tracking config for the store
    const { data: config, error } = await supabase
      .from("store_tracking_config")
      .select("*")
      .eq("store_id", event.storeId)
      .maybeSingle();

    if (error) {
      console.error("[track-conversion] Error fetching config:", error);
      throw error;
    }

    if (!config) {
      console.log("[track-conversion] No tracking config found for store");
      return new Response(
        JSON.stringify({ success: true, message: "No tracking config" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, unknown> = {};

    // Send to Meta CAPI if configured
    if (config.meta_enabled && config.meta_pixel_id && config.meta_access_token) {
      try {
        results.meta = await sendToMetaCAPI(event, {
          pixelId: config.meta_pixel_id,
          accessToken: config.meta_access_token,
          testEventCode: config.meta_test_event_code,
        });
      } catch (err) {
        console.error("[track-conversion] Meta CAPI error:", err);
        results.meta = { error: String(err) };
      }
    }

    // Send to TikTok CAPI if configured
    if (config.tiktok_enabled && config.tiktok_pixel_id && config.tiktok_access_token) {
      try {
        results.tiktok = await sendToTikTokCAPI(event, {
          pixelId: config.tiktok_pixel_id,
          accessToken: config.tiktok_access_token,
          testEventCode: config.tiktok_test_event_code,
        });
      } catch (err) {
        console.error("[track-conversion] TikTok CAPI error:", err);
        results.tiktok = { error: String(err) };
      }
    }

    // Send to Pinterest CAPI if configured
    if (config.pinterest_enabled && config.pinterest_tag_id && config.pinterest_access_token) {
      try {
        results.pinterest = await sendToPinterestCAPI(event, {
          adAccountId: config.pinterest_tag_id,
          accessToken: config.pinterest_access_token,
          testEventCode: config.pinterest_test_event_code,
        });
      } catch (err) {
        console.error("[track-conversion] Pinterest CAPI error:", err);
        results.pinterest = { error: String(err) };
      }
    }

    // Send to Google Ads (server-side conversion ping) if configured.
    // Only fires for Purchase. Dedup with browser gtag via `oid` (transaction_id).
    if (
      config.google_ads_enabled &&
      config.google_ads_id &&
      config.google_ads_conversion_label &&
      event.eventName === "Purchase"
    ) {
      try {
        results.google_ads = await sendToGoogleAdsConversion(event, {
          conversionId: config.google_ads_id,
          conversionLabel: config.google_ads_conversion_label,
        });
      } catch (err) {
        console.error("[track-conversion] Google Ads error:", err);
        results.google_ads = { error: String(err) };
      }
    }

    console.log("[track-conversion] Completed:", JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[track-conversion] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
