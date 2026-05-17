export type ButtonRadius = 'none' | 'rounded' | 'full';
export type ElementRadius = 'none' | 'rounded' | 'full';
export type HeaderLayout = 'default' | 'wide' | 'full';
export type MobileLogoPosition = 'left' | 'center';
export type FontFamily = 'system' | 'inter' | 'poppins' | 'roboto' | 'open-sans' | 'lato' | 'montserrat' | 'nunito';

export const FONT_OPTIONS: { value: FontFamily; label: string; family: string; googleFont?: string }[] = [
  { value: 'system', label: 'Fonte do Sistema', family: 'system-ui, -apple-system, sans-serif' },
  { value: 'inter', label: 'Inter', family: '"Inter", sans-serif', googleFont: 'Inter:wght@400;500;600;700' },
  { value: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif', googleFont: 'Poppins:wght@400;500;600;700' },
  { value: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif', googleFont: 'Roboto:wght@400;500;700' },
  { value: 'open-sans', label: 'Open Sans', family: '"Open Sans", sans-serif', googleFont: 'Open+Sans:wght@400;500;600;700' },
  { value: 'lato', label: 'Lato', family: '"Lato", sans-serif', googleFont: 'Lato:wght@400;700' },
  { value: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif', googleFont: 'Montserrat:wght@400;500;600;700' },
  { value: 'nunito', label: 'Nunito', family: '"Nunito", sans-serif', googleFont: 'Nunito:wght@400;500;600;700' },
];

export interface ThemeState {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  buttonColor: string;
  buttonHoverColor: string;
  buttonRadius: ButtonRadius;
  elementRadius: ElementRadius;
  headerBgColor: string;
  headerTextColor: string;
  headerLayout: HeaderLayout;
  headerShowFavorites: boolean;
  headerShowSearch: boolean;
  headerMobileLogoPosition: MobileLogoPosition;
  footerBgColor: string;
  footerTextColor: string;
  footerNewsletterEnabled: boolean;
  footerNewsletterTitle: string;
  footerNewsletterSubtitle: string;
  footerShowPaymentMethods: boolean;
  footerShowSocialLinks: boolean;
  footerCopyrightText: string;
  fontFamily: FontFamily;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    primaryText: string;
    secondaryText: string;
    button: string;
    buttonHover: string;
    buttonText: string;
    headerBg: string;
    headerText: string;
    footerBg: string;
    footerText: string;
  };
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Preto e dourado, limpo e sofisticado',
    colors: {
      primary: '#000000',
      secondary: '#D4A853',
      primaryText: '#ffffff',
      secondaryText: '#1a1a1a',
      button: '#000000',
      buttonHover: '#1f2937',
      buttonText: '#ffffff',
      headerBg: '#ffffff',
      headerText: '#000000',
      footerBg: '#111111',
      footerText: '#ffffff',
    },
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Tons dourados com fundo escuro',
    colors: {
      primary: '#b8860b',
      secondary: '#d4a853',
      primaryText: '#ffffff',
      secondaryText: '#1a1a1a',
      button: '#b8860b',
      buttonHover: '#9a7209',
      buttonText: '#ffffff',
      headerBg: '#0f0f0f',
      headerText: '#d4a853',
      footerBg: '#0f0f0f',
      footerText: '#d4a853',
    },
  },
  {
    id: 'fresh',
    name: 'Fresh',
    description: 'Verde vibrante, natural e moderno',
    colors: {
      primary: '#059669',
      secondary: '#34d399',
      primaryText: '#ffffff',
      secondaryText: '#064e3b',
      button: '#059669',
      buttonHover: '#047857',
      buttonText: '#ffffff',
      headerBg: '#ffffff',
      headerText: '#111827',
      footerBg: '#064e3b',
      footerText: '#ecfdf5',
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrante',
    description: 'Roxo energético, jovem e ousado',
    colors: {
      primary: '#7c3aed',
      secondary: '#a78bfa',
      primaryText: '#ffffff',
      secondaryText: '#1e1b4b',
      button: '#7c3aed',
      buttonHover: '#6d28d9',
      buttonText: '#ffffff',
      headerBg: '#ffffff',
      headerText: '#1f2937',
      footerBg: '#1e1b4b',
      footerText: '#e0e7ff',
    },
  },
  {
    id: 'warm',
    name: 'Acolhedor',
    description: 'Tons terrosos e calorosos',
    colors: {
      primary: '#b45309',
      secondary: '#d97706',
      primaryText: '#ffffff',
      secondaryText: '#451a03',
      button: '#b45309',
      buttonHover: '#92400e',
      buttonText: '#ffffff',
      headerBg: '#fffbeb',
      headerText: '#451a03',
      footerBg: '#451a03',
      footerText: '#fef3c7',
    },
  },
  {
    id: 'ocean',
    name: 'Oceano',
    description: 'Azul profundo, confiança e tecnologia',
    colors: {
      primary: '#2563eb',
      secondary: '#60a5fa',
      primaryText: '#ffffff',
      secondaryText: '#1e3a5f',
      button: '#2563eb',
      buttonHover: '#1d4ed8',
      buttonText: '#ffffff',
      headerBg: '#ffffff',
      headerText: '#1e3a5f',
      footerBg: '#1e3a5f',
      footerText: '#dbeafe',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    description: 'Rosa suave, feminino e delicado',
    colors: {
      primary: '#e11d48',
      secondary: '#fb7185',
      primaryText: '#ffffff',
      secondaryText: '#4c0519',
      button: '#e11d48',
      buttonHover: '#be123c',
      buttonText: '#ffffff',
      headerBg: '#fff1f2',
      headerText: '#4c0519',
      footerBg: '#4c0519',
      footerText: '#ffe4e6',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Escuro e moderno, visual premium',
    colors: {
      primary: '#f9fafb',
      secondary: '#9ca3af',
      primaryText: '#111111',
      secondaryText: '#111111',
      button: '#f9fafb',
      buttonHover: '#e5e7eb',
      buttonText: '#111111',
      headerBg: '#111111',
      headerText: '#f9fafb',
      footerBg: '#000000',
      footerText: '#d1d5db',
    },
  },
];
