import { useEffect } from "react";

/**
 * Injects the platform favicon (/favicon.png) into the document head.
 * Used ONLY on platform pages (landing, admin dashboard, auth).
 * Store pages use StoreThemeProvider for their own favicon logic.
 */
export function PlatformFaviconProvider() {
  useEffect(() => {
    // Remove any existing favicons first
    const existing = document.querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
    );
    existing.forEach(el => el.remove());

    // Inject platform favicon
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = "/favicon.png";
    document.head.appendChild(favicon);

    const appleFavicon = document.createElement("link");
    appleFavicon.rel = "apple-touch-icon";
    appleFavicon.setAttribute("sizes", "180x180");
    appleFavicon.href = "/favicon.png";
    document.head.appendChild(appleFavicon);

    return () => {
      favicon.remove();
      appleFavicon.remove();
    };
  }, []);

  return null;
}
