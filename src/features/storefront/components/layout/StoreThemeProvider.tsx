import { useEffect } from "react";

const GOOGLE_FONTS_MAP: Record<string, string> = {
  'inter': 'Inter:wght@400;500;600;700',
  'poppins': 'Poppins:wght@400;500;600;700',
  'roboto': 'Roboto:wght@400;500;700',
  'open-sans': 'Open+Sans:wght@400;500;600;700',
  'lato': 'Lato:wght@400;700',
  'montserrat': 'Montserrat:wght@400;500;600;700',
  'nunito': 'Nunito:wght@400;500;600;700',
};

const FONT_FAMILY_MAP: Record<string, string> = {
  'system': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'inter': '"Inter", sans-serif',
  'poppins': '"Poppins", sans-serif',
  'roboto': '"Roboto", sans-serif',
  'open-sans': '"Open Sans", sans-serif',
  'lato': '"Lato", sans-serif',
  'montserrat': '"Montserrat", sans-serif',
  'nunito': '"Nunito", sans-serif',
};

interface StoreThemeProviderProps {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  buttonColor?: string | null;
  buttonHoverColor?: string | null;
  buttonTextColor?: string | null;
  primaryTextColor?: string | null;
  secondaryTextColor?: string | null;
  buttonBorderRadius?: string | null;
  elementBorderRadius?: string | null;
  faviconUrl?: string | null;
  fontFamily?: string | null;
  children: React.ReactNode;
}

/** Converts hex (#rrggbb) to "h s% l%" string for CSS HSL vars */
function hexToHSLString(hex: string): string {
  const { h, s, l } = hexToHSL(hex);
  return `${h} ${s}% ${l}%`;
}

/**
 * Converts a hex color to HSL values
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Determines if text should be light or dark based on background color
 */
function getContrastColor(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "0 0% 0%" : "0 0% 100%";
}

/**
 * Converts button radius setting to CSS value
 */
function getButtonRadius(setting: string | null): string {
  switch (setting) {
    case 'none':
      return '0px';
    case 'full':
      return '9999px';
    case 'rounded':
    default:
      return '0.375rem';
  }
}

/**
 * Converts element radius setting to CSS value
 */
function getElementRadius(setting: string | null): string {
  switch (setting) {
    case 'none':
      return '0px';
    case 'full':
      return '1rem';
    case 'rounded':
    default:
      return '0.5rem';
  }
}

export function StoreThemeProvider({ 
  primaryColor, 
  secondaryColor,
  buttonColor,
  buttonHoverColor,
  buttonTextColor,
  primaryTextColor,
  secondaryTextColor,
  buttonBorderRadius,
  elementBorderRadius,
  faviconUrl,
  fontFamily,
  children 
}: StoreThemeProviderProps) {
  // Handle Google Fonts loading
  useEffect(() => {
    const font = fontFamily || 'system';
    if (font === 'system' || !GOOGLE_FONTS_MAP[font]) return;

    const fontId = `google-font-${font}`;
    
    // Check if already loaded
    if (document.getElementById(fontId)) return;

    // Preconnect for faster loading
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect);

    const preconnectGstatic = document.createElement('link');
    preconnectGstatic.rel = 'preconnect';
    preconnectGstatic.href = 'https://fonts.gstatic.com';
    preconnectGstatic.crossOrigin = 'anonymous';
    document.head.appendChild(preconnectGstatic);

    // Load the font
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS_MAP[font]}&display=swap`;
    document.head.appendChild(link);

    return () => {
      // Don't remove fonts on unmount as they might be cached for reuse
    };
  }, [fontFamily]);

  // Apply font family to root
  useEffect(() => {
    const root = document.documentElement;
    const font = fontFamily || 'system';
    const fontFamilyValue = FONT_FAMILY_MAP[font] || FONT_FAMILY_MAP['system'];
    
    root.style.setProperty('--store-font-family', fontFamilyValue);
    document.body.style.fontFamily = fontFamilyValue;

    return () => {
      root.style.removeProperty('--store-font-family');
      document.body.style.fontFamily = '';
    };
  }, [fontFamily]);

  // Handle favicon - store favicon overrides platform favicon; no favicon if not configured
  useEffect(() => {
    const existingFavicons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    
    if (faviconUrl) {
      // Set the store's custom favicon with multiple sizes for broad compatibility
      existingFavicons.forEach(el => el.remove());
      
      const isSvg = faviconUrl.endsWith('.svg');
      const iconType = isSvg ? 'image/svg+xml' : 'image/png';

      // Main icon (32x32)
      const icon32 = document.createElement('link');
      icon32.rel = 'icon';
      icon32.type = iconType;
      icon32.setAttribute('sizes', '32x32');
      icon32.href = faviconUrl;
      document.head.appendChild(icon32);

      // Small icon (16x16) for older browsers
      const icon16 = document.createElement('link');
      icon16.rel = 'icon';
      icon16.type = iconType;
      icon16.setAttribute('sizes', '16x16');
      icon16.href = faviconUrl;
      document.head.appendChild(icon16);

      // Apple touch icon (iOS home screen, Safari favorites)
      const appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.setAttribute('sizes', '180x180');
      appleIcon.href = faviconUrl;
      document.head.appendChild(appleIcon);

      // Shortcut icon (legacy browsers)
      const shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.href = faviconUrl;
      document.head.appendChild(shortcutIcon);
    } else {
      // No favicon configured: remove platform favicon so store shows no icon
      existingFavicons.forEach(el => el.remove());
    }

    return () => {
      // Just remove store favicons on unmount
      // Platform pages will inject their own favicon via PlatformFaviconProvider
      const currentFavicons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
      currentFavicons.forEach(el => el.remove());
    };
  }, [faviconUrl]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (primaryColor) {
      const primary = hexToHSL(primaryColor);
      const primaryHSL = `${primary.h} ${primary.s}% ${primary.l}%`;
      // Manual override for text-on-primary, otherwise auto-contrast
      const primaryFg = primaryTextColor
        ? hexToHSLString(primaryTextColor)
        : getContrastColor(primaryColor);
      root.style.setProperty('--store-primary', primaryHSL);
      root.style.setProperty('--store-primary-foreground', primaryFg);
      
      // Also override the global --primary so bg-primary works correctly in storefront
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--primary-foreground', primaryFg);
    }
    
    if (secondaryColor) {
      const secondary = hexToHSL(secondaryColor);
      const secondaryHSL = `${secondary.h} ${secondary.s}% ${secondary.l}%`;
      // Manual override for text-on-secondary, otherwise auto-contrast
      const secondaryFg = secondaryTextColor
        ? hexToHSLString(secondaryTextColor)
        : getContrastColor(secondaryColor);
      root.style.setProperty('--store-secondary', secondaryHSL);
      root.style.setProperty('--store-secondary-foreground', secondaryFg);

      // Also override global --secondary
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--secondary-foreground', secondaryFg);
    }

    // Button color - falls back to primary if not set
    const btnColor = buttonColor || primaryColor;
    if (btnColor) {
      const btn = hexToHSL(btnColor);
      root.style.setProperty('--store-button', `${btn.h} ${btn.s}% ${btn.l}%`);
      // Manual override for button text color, otherwise auto-contrast
      const btnFg = buttonTextColor
        ? hexToHSLString(buttonTextColor)
        : getContrastColor(btnColor);
      root.style.setProperty('--store-button-foreground', btnFg);
    }

    // Button hover color
    const btnHoverColor = buttonHoverColor || (btnColor ? btnColor : null);
    if (btnHoverColor) {
      const btnHover = hexToHSL(btnHoverColor);
      // Make it slightly darker/lighter for hover if same as button color
      if (buttonHoverColor) {
        root.style.setProperty('--store-button-hover', `${btnHover.h} ${btnHover.s}% ${btnHover.l}%`);
      } else {
        // Default hover: adjust lightness
        const adjustedL = btnHover.l > 50 ? btnHover.l - 10 : btnHover.l + 10;
        root.style.setProperty('--store-button-hover', `${btnHover.h} ${btnHover.s}% ${adjustedL}%`);
      }
    }

    // Button border radius
    root.style.setProperty('--store-button-radius', getButtonRadius(buttonBorderRadius || null));
    
    // Element border radius (images, cards, badges in storefront)
    root.style.setProperty('--store-element-radius', getElementRadius(elementBorderRadius || null));

    // Override --muted to a neutral gray so skeletons don't show blue tint
    root.style.setProperty('--muted', '0 0% 96%');
    root.style.setProperty('--muted-foreground', '0 0% 45%');
    
    // Cleanup on unmount - restore original values
    return () => {
      root.style.removeProperty('--store-primary');
      root.style.removeProperty('--store-primary-foreground');
      root.style.removeProperty('--store-secondary');
      root.style.removeProperty('--store-secondary-foreground');
      root.style.removeProperty('--store-button');
      root.style.removeProperty('--store-button-foreground');
      root.style.removeProperty('--store-button-hover');
      root.style.removeProperty('--store-button-radius');
      root.style.removeProperty('--store-element-radius');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      // Restore global colors
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
    };
  }, [primaryColor, secondaryColor, buttonColor, buttonHoverColor, buttonTextColor, primaryTextColor, secondaryTextColor, buttonBorderRadius, elementBorderRadius]);
  
  return <>{children}</>;
}
