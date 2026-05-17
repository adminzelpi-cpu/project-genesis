import { useEffect } from "react";
import { usePublicTrackingConfig, PublicTrackingConfig } from "../hooks/usePublicTrackingConfig";
import { storeKey } from "@/lib/storeStorageKeys";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdvancedMatching } from "../lib/trackEvent";
import { getAnonymousId } from "../lib/anonymousId";

interface TrackingScriptsProps {
  storeId: string | undefined;
}

// Declare global types for pixels
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    gtag: any;
    dataLayer: any[];
    ttq: any;
    pintrk: any;
    __metaPixelId?: string;
  }
}

/**
 * Try to extract customer data from multiple sources for Advanced Matching:
 * 1. Logged-in user session (auth.users email + customers table data)
 * 2. checkout_data_v2 in localStorage (from previous/current checkout)
 */
function getAdvancedMatchingData(): Record<string, string> | null {
  const data: Record<string, string> = {};

  // Source 1: checkout_data_v2 from localStorage
  try {
    const raw = localStorage.getItem(storeKey('checkout_data_v2'));
    if (raw) {
      const stored = JSON.parse(raw);
      const parsed = stored.data || stored;
      if (parsed.personalData?.email) data.em = parsed.personalData.email;
      if (parsed.personalData?.phone) {
        const digits = parsed.personalData.phone.replace(/\D/g, "");
        data.ph = digits.length === 11 ? `55${digits}` : digits;
      }
      if (parsed.personalData?.fullName) {
        const parts = parsed.personalData.fullName.trim().split(/\s+/);
        if (parts[0]) data.fn = parts[0].toLowerCase();
        if (parts.length > 1) data.ln = parts.slice(1).join(" ").toLowerCase();
      }
      if (parsed.personalData?.cpf) {
        data.external_id = parsed.personalData.cpf.replace(/\D/g, "");
      }
      if (parsed.deliveryAddress?.city) data.ct = parsed.deliveryAddress.city.toLowerCase();
      if (parsed.deliveryAddress?.state) data.st = parsed.deliveryAddress.state.toLowerCase().substring(0, 2);
      if (parsed.deliveryAddress?.zipCode) data.zp = parsed.deliveryAddress.zipCode.replace(/\D/g, "");
    }
  } catch {}

  // Source 2: Cached customer data from logged-in user
  try {
    const cachedCustomer = localStorage.getItem(storeKey('am_customer_data'));
    if (cachedCustomer) {
      const customer = JSON.parse(cachedCustomer);
      if (!data.em && customer.email) data.em = customer.email;
      if (!data.ph && customer.telefone) {
        const digits = customer.telefone.replace(/\D/g, "");
        data.ph = digits.length === 11 ? `55${digits}` : digits;
      }
      if (!data.fn && customer.nome) {
        const parts = customer.nome.trim().split(/\s+/);
        if (parts[0]) data.fn = parts[0].toLowerCase();
        if (parts.length > 1) data.ln = parts.slice(1).join(" ").toLowerCase();
      }
      if (!data.external_id && customer.cpf) {
        data.external_id = customer.cpf.replace(/\D/g, "");
      }
    }
  } catch {}

  // Fallback: persistent anonymous_id so top-of-funnel events still match
  // the same visitor across sessions/pages (improves EMQ from ~3 to ~6).
  if (!data.external_id) {
    data.external_id = getAnonymousId();
  }

  data.country = "br";
  return data;
}

// Export for use in trackEvent.ts
export { getAdvancedMatchingData };

/**
 * Defer pixel initialization until the browser is idle OR the user interacts.
 * This removes ~70KB+ of vendor JS (fbevents.js, gtag.js, ttq, pintrk) from
 * the critical path, drastically reducing TBT/LCP on PageSpeed without
 * harming attribution — pixels still fire PageView/ViewContent within
 * a few seconds, well inside Meta/Google/TikTok matching windows.
 *
 * Any interaction (scroll/click/touch/keypress) forces immediate load so
 * a fast clicker never misses an event.
 */
function whenIdleOrInteract(cb: () => void, maxDelayMs = 3500) {
  if (typeof window === "undefined") return;
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    cleanup();
    cb();
  };
  const events = ["scroll", "click", "touchstart", "keydown", "mousemove"];
  const cleanup = () => {
    events.forEach((e) => window.removeEventListener(e, run, { capture: true } as any));
  };
  events.forEach((e) =>
    window.addEventListener(e, run, { once: true, passive: true, capture: true })
  );
  const ric: any = (window as any).requestIdleCallback;
  if (typeof ric === "function") {
    ric(run, { timeout: maxDelayMs });
  } else {
    setTimeout(run, 1500);
  }
  // Hard ceiling regardless of idle availability
  setTimeout(run, maxDelayMs);
}

export function TrackingScripts({ storeId }: TrackingScriptsProps) {
  const { data: config } = usePublicTrackingConfig(storeId);

  useEffect(() => {
    if (!config) return;

    whenIdleOrInteract(() => {
      // Initialize Meta Pixel with Advanced Matching
      if (config.meta_enabled && config.meta_pixel_id) {
        initMetaPixel(config.meta_pixel_id);
      }

      // Initialize Google Analytics & Ads
      if (config.ga4_enabled && config.ga4_measurement_id) {
        initGoogleAnalytics(config.ga4_measurement_id, config.google_ads_id);
      } else if (config.google_ads_enabled && config.google_ads_id) {
        initGoogleAds(config.google_ads_id);
      }

      // Initialize TikTok Pixel with Advanced Matching
      if (config.tiktok_enabled && config.tiktok_pixel_id) {
        initTikTokPixel(config.tiktok_pixel_id);
      }

      // Initialize Pinterest Tag with Enhanced Match
      if (config.pinterest_enabled && config.pinterest_tag_id) {
        initPinterestTag(config.pinterest_tag_id);
      }
    });
  }, [config]);

  // Listen for auth state changes to refresh AM when user logs in
  useEffect(() => {
    if (!storeId) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch customer data from customers table and cache it
        try {
          const { data: customer } = await supabase
            .from('customers')
            .select('nome, email, telefone, cpf')
            .eq('store_id', storeId)
            .eq('email', session.user.email)
            .maybeSingle();

          if (customer) {
            localStorage.setItem(
              storeKey('am_customer_data'),
              JSON.stringify(customer)
            );
            // Refresh AM on all pixels with the new data
            refreshAdvancedMatching();
          }
        } catch {}
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(storeKey('am_customer_data'));
      }
    });

    // Also check on mount if user is already logged in
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) {
        try {
          const cached = localStorage.getItem(storeKey('am_customer_data'));
          if (cached) {
            // Already cached, just refresh AM
            refreshAdvancedMatching();
            return;
          }
          const { data: customer } = await supabase
            .from('customers')
            .select('nome, email, telefone, cpf')
            .eq('store_id', storeId)
            .eq('email', user.email)
            .maybeSingle();

          if (customer) {
            localStorage.setItem(
              storeKey('am_customer_data'),
              JSON.stringify(customer)
            );
            refreshAdvancedMatching();
          }
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, [storeId]);

  return null;
}

function initMetaPixel(pixelId: string) {
  if (window.fbq) return;

  const f = window;
  const b = document;
  const e = "script";
  
  if (f.fbq) return;
  
  const n: any = f.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  
  const script = b.createElement(e) as HTMLScriptElement;
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = b.getElementsByTagName(e)[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
  
  // Store pixel ID globally for refreshAdvancedMatching()
  window.__metaPixelId = pixelId;
  
  // Init with Advanced Matching data if available
  const matchData = getAdvancedMatchingData();
  if (matchData) {
    window.fbq("init", pixelId, matchData);
  } else {
    window.fbq("init", pixelId);
  }
  window.fbq("track", "PageView");
}

function initGoogleAnalytics(measurementId: string, adsId?: string | null) {
  if (window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  
  // GA4 config with Enhanced Conversions support
  window.gtag("config", measurementId, {
    allow_enhanced_conversions: true,
  });

  if (adsId) {
    window.gtag("config", adsId, {
      allow_enhanced_conversions: true,
    });
  }
}

function initGoogleAds(adsId: string) {
  if (window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", adsId, {
    allow_enhanced_conversions: true,
  });
}

function initTikTokPixel(pixelId: string) {
  if (window.ttq) return;

  const f = window;
  const b = document;
  
  if (f.ttq) return;
  
  const n: any = f.ttq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };

  n.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
  n.setAndDefer = function(t: any, e: string) {
    t[e] = function() {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  
  n.instance = function(t: string) {
    const e = f.ttq._i[t] || [];
    n.methods.forEach((m: string) => {
      n.setAndDefer(e, m);
    });
    return e;
  };
  
  n.load = function(e: string, o?: any) {
    const i = "https://analytics.tiktok.com/i18n/pixel/events.js";
    f.ttq._i = f.ttq._i || {};
    f.ttq._i[e] = [];
    f.ttq._i[e]._u = i;
    f.ttq._t = f.ttq._t || {};
    f.ttq._t[e] = +new Date();
    f.ttq._o = f.ttq._o || {};
    f.ttq._o[e] = o || {};
    
    const s = b.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = i + "?sdkid=" + e + "&lib=ttq";
    const first = b.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(s, first);
  };

  n.load(pixelId);
  
  // TikTok Advanced Matching via identify()
  const matchData = getAdvancedMatchingData();
  if (matchData) {
    const identifyData: Record<string, string> = {};
    if (matchData.em) identifyData.email = matchData.em;
    if (matchData.ph) identifyData.phone_number = `+${matchData.ph}`;
    if (matchData.external_id) identifyData.external_id = matchData.external_id;
    
    if (Object.keys(identifyData).length > 0) {
      window.ttq.identify(identifyData);
    }
  }
  
  window.ttq.page();
}

function initPinterestTag(tagId: string) {
  if (window.pintrk) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://s.pinimg.com/ct/core.js";
  document.head.appendChild(script);

  script.onload = () => {
    // Pinterest Enhanced Match - set user data before load
    const matchData = getAdvancedMatchingData();
    if (matchData) {
      const enhancedMatch: Record<string, string> = {};
      if (matchData.em) enhancedMatch.em = matchData.em;
      if (matchData.ph) enhancedMatch.ph = matchData.ph;
      if (matchData.fn) enhancedMatch.fn = matchData.fn;
      if (matchData.ln) enhancedMatch.ln = matchData.ln;
      if (matchData.external_id) enhancedMatch.external_id = matchData.external_id;
      
      window.pintrk("load", tagId, enhancedMatch);
    } else {
      window.pintrk("load", tagId);
    }
    window.pintrk("page");
  };
}
