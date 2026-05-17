/**
 * Client-side image compression using Canvas API.
 * Compresses images before upload to reduce storage and improve loading times.
 * Quality is tuned for e-commerce: visually indistinguishable from original.
 * 
 * Conversion rules:
 * - JPG/JPEG → WebP (smaller, same quality)
 * - PNG with transparency → WebP (supports transparency, smaller)
 * - PNG without transparency → WebP (much smaller)
 * - WebP → WebP (just compress/resize if needed)
 * - GIF → skip (animated)
 * - SVG → skip (vector)
 */

const MAX_DIMENSION = 2400; // Max width/height in pixels
const TARGET_QUALITY = 0.82; // JPEG/WebP quality (industry standard for e-commerce)

/**
 * Detects if a PNG image has any transparent pixels using Canvas.
 */
function hasTransparency(canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D): boolean {
  const { width, height } = canvas;
  // Sample pixels instead of checking every one (performance)
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const step = Math.max(1, Math.floor(data.length / (4 * 10000))); // Check ~10k pixels
  
  for (let i = 3; i < data.length; i += 4 * step) {
    if (data[i] < 250) return true; // Alpha < 250 means some transparency
  }
  return false;
}

/**
 * Compresses an image file using Canvas API.
 * Converts to WebP for maximum efficiency.
 * Returns the compressed file, or the original if compression isn't beneficial.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) return file;

  // Skip GIFs (animated) and SVGs (vector)
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  // Skip very small files — compression won't help much
  if (file.size < 100 * 1024) return file; // < 100KB

  try {
    const bitmap = await createImageBitmap(file);
    
    let { width, height } = bitmap;

    // Scale down if exceeds max dimension
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Always output WebP — it supports transparency and is smaller than both PNG and JPEG
    // Even PNGs with transparency benefit from WebP (typically 25-35% smaller)
    const outputType = 'image/webp';
    const blob = await canvas.convertToBlob({ type: outputType, quality: TARGET_QUALITY });

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) return file;

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    
    return new File([blob], `${nameWithoutExt}.webp`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Compresses multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
