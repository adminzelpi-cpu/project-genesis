import { Helmet } from "react-helmet";

interface StorefrontMetaProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  storeName?: string;
  faviconUrl?: string;
  noIndex?: boolean;
}

/**
 * Reusable Helmet component for all storefront pages.
 * Sets title, description, OG tags and favicon consistently.
 */
export const StorefrontMeta = ({
  title,
  description,
  ogImage,
  ogUrl,
  ogType = "website",
  storeName,
  faviconUrl,
  noIndex = false,
}: StorefrontMetaProps) => {
  const fullTitle = storeName ? `${title} | ${storeName}` : title;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {/* Favicon */}
      {faviconUrl && <link rel="icon" href={faviconUrl} type={faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'} />}
    </Helmet>
  );
};
