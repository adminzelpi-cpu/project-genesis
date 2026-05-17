/**
 * Generates an optimized image URL using Supabase Storage image transforms.
 * Only applies to Supabase storage URLs; returns original URL for others.
 * 
 * @param url - Original image URL
 * @param width - Desired width in pixels
 * @param quality - Image quality (1-100), default 80
 * @returns Optimized URL with render/image/transform path
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 80
): string {
  if (!url) return url;

  // Only transform Supabase storage URLs
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  // Extract the path after /storage/v1/object/public/
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const baseUrl = url.substring(0, idx);
  const objectPath = url.substring(idx + marker.length).split('?')[0];

  // Use Supabase image transform endpoint
  return `${baseUrl}/storage/v1/render/image/public/${objectPath}?width=${width}&quality=${quality}&resize=contain`;
}

/**
 * Generates a srcSet string for responsive images.
 * Provides 1x and 2x versions for the given base width.
 */
export function getImageSrcSet(
  url: string,
  baseWidth: number,
  quality: number = 80
): string {
  if (!url || !url.includes('supabase.co/storage/v1/object/public/')) {
    return '';
  }

  const w1 = getOptimizedImageUrl(url, baseWidth, quality);
  const w2 = getOptimizedImageUrl(url, baseWidth * 2, quality);

  return `${w1} ${baseWidth}w, ${w2} ${baseWidth * 2}w`;
}

/** 
 * Standard sizes attribute for product cards in a responsive grid.
 * Matches typical 2-col mobile, 3-col tablet, 4-col desktop layouts.
 */
export const PRODUCT_CARD_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

/**
 * Convenience: srcSet for a product card serving 400w (1x mobile) and 800w (2x retina / desktop).
 * Returns empty string for non-Supabase URLs (the consumer should omit srcSet then).
 */
export function getProductCardSrcSet(url: string): string {
  return getImageSrcSet(url, 400);
}
