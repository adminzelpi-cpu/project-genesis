import { useMemo } from 'react';

export type AppMode = 'landing' | 'admin' | 'storefront';

interface HostDetectionResult {
  mode: AppMode;
  storeSlug: string | null;
}

// Configure your main domain here
const MAIN_DOMAIN = 'zelpi.com.br';
const ADMIN_SUBDOMAIN = 'admin';

// Domains/patterns that should be treated as development/preview (show all routes)
const DEV_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
  'vercel.app',
  'netlify.app',
  'pages.dev',
];

function isDevelopment(hostname: string): boolean {
  return DEV_PATTERNS.some(pattern => hostname.includes(pattern));
}

export function detectAppMode(hostname: string): HostDetectionResult {
  // In development, return null mode - App.tsx will render all routes
  if (isDevelopment(hostname)) {
    return { mode: 'landing', storeSlug: null };
  }

  const lowerHost = hostname.toLowerCase();

  // admin.zelpi.com.br → admin mode
  if (lowerHost === `${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}`) {
    return { mode: 'admin', storeSlug: null };
  }

  // *.zelpi.com.br → storefront (extract slug from subdomain)
  if (lowerHost.endsWith(`.${MAIN_DOMAIN}`)) {
    const slug = lowerHost.replace(`.${MAIN_DOMAIN}`, '');
    if (slug && slug !== 'www' && slug !== '') {
      return { mode: 'storefront', storeSlug: slug };
    }
  }

  // zelpi.com.br, www.zelpi.com.br, or any unrecognized host → treat as dev (all routes)
  // This ensures the main domain works with path-based routing until subdomains are configured
  return { mode: 'landing', storeSlug: null };
}

export function useHostDetection(): HostDetectionResult & { isDev: boolean } {
  const result = useMemo(() => {
    const hostname = window.location.hostname;
    const dev = isDevelopment(hostname);
    const detection = detectAppMode(hostname);
    return { ...detection, isDev: dev };
  }, []);

  return result;
}
