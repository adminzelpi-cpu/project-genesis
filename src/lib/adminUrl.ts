const MAIN_DOMAIN = 'zelpi.com.br';
const ADMIN_SUBDOMAIN = 'admin';

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

function isDev(): boolean {
  return DEV_PATTERNS.some(p => window.location.hostname.includes(p));
}

/**
 * Returns the admin base URL.
 * In dev: "" (same origin, relative paths work)
 * In prod: "https://admin.zelpi.com.br"
 */
export function getAdminOrigin(): string {
  if (isDev()) return '';
  return `https://${ADMIN_SUBDOMAIN}.${MAIN_DOMAIN}`;
}

/**
 * Builds a full admin URL for a given path.
 * In dev: "/dashboard" (relative)
 * In prod: "https://admin.zelpi.com.br/dashboard" (absolute)
 */
export function buildAdminUrl(path: string): string {
  return `${getAdminOrigin()}${path}`;
}

/**
 * Navigates to an admin path. Uses window.location.href for cross-origin,
 * or returns the path for same-origin (dev) usage with react-router.
 */
export function navigateToAdmin(path: string): void {
  const origin = getAdminOrigin();
  if (origin) {
    window.location.href = `${origin}${path}`;
  } else {
    // In dev, caller should use react-router navigate
    window.location.href = path;
  }
}
