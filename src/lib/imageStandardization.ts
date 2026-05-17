/**
 * Image Standardization Engine
 * Detects dimension mismatches, suggests aspect ratios based on category,
 * and provides smart crop (via smartcrop.js) or white padding methods.
 */
import smartcrop from 'smartcrop';

// ── Aspect Ratio Definitions ──────────────────────────────────────────────
export type AspectRatioKey = '1:1' | '2:3' | '3:4' | '4:5';

export interface AspectRatioOption {
  key: AspectRatioKey;
  label: string;
  description: string;
  ratio: number; // width / height
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { key: '1:1', label: 'Quadrado 1:1', description: 'Ideal para produtos gerais e redes sociais', ratio: 1 },
  { key: '2:3', label: 'Retangular 2:3', description: 'Ideal para moda, roupas e calçados', ratio: 2 / 3 },
  { key: '3:4', label: 'Retangular 3:4', description: 'Bom para moda e acessórios', ratio: 3 / 4 },
  { key: '4:5', label: 'Retangular 4:5', description: 'Versátil, funciona bem em qualquer categoria', ratio: 4 / 5 },
];

// ── Method ────────────────────────────────────────────────────────────────
export type StandardizationMethod = 'smart-crop' | 'white-padding';

export interface StandardizationConfig {
  aspectRatio: AspectRatioKey;
  method: StandardizationMethod;
}

export interface ImageAnalysis {
  file: File;
  width: number;
  height: number;
  currentRatio: number;
  previewUrl: string;
  suggestedMethod: StandardizationMethod;
}

export interface StandardizedResult {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

// ── Category → Aspect Ratio Mapping ───────────────────────────────────────
const FASHION_KEYWORDS = [
  'moda', 'roupa', 'vestido', 'calça', 'camisa', 'camiseta', 'blusa', 'saia',
  'shorts', 'jaqueta', 'casaco', 'sapato', 'calçado', 'tênis', 'sandália',
  'bota', 'chinelo', 'lingerie', 'underwear', 'meia', 'acessório', 'bolsa',
  'fashion', 'vestuário', 'clothing', 'shoes', 'footwear',
];

export function suggestAspectRatio(categoryName?: string): AspectRatioKey {
  if (!categoryName) return '4:5';
  const lower = categoryName.toLowerCase();
  if (FASHION_KEYWORDS.some(k => lower.includes(k))) return '2:3';
  return '1:1';
}

// ── Dimension Analysis ────────────────────────────────────────────────────
function getImageDimensions(file: File): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function analyzeImages(files: File[]): Promise<ImageAnalysis[]> {
  const results: ImageAnalysis[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') continue;

    try {
      const { width, height, img } = await getImageDimensions(file);
      const currentRatio = width / height;

      // Suggest method: if image is tightly framed (little margin), use padding
      // Otherwise crop is usually fine
      const hasMargin = width > 800 && height > 800;
      const suggestedMethod: StandardizationMethod = hasMargin ? 'smart-crop' : 'white-padding';

      results.push({
        file,
        width,
        height,
        currentRatio,
        previewUrl: img.src,
        suggestedMethod,
      });
    } catch {
      // Skip files we can't analyze
    }
  }

  return results;
}

export function detectDimensionMismatch(analyses: ImageAnalysis[]): boolean {
  if (analyses.length <= 1) return false;
  const first = analyses[0];
  return analyses.some(a => a.width !== first.width || a.height !== first.height);
}

// ── Target Dimensions ─────────────────────────────────────────────────────
const TARGET_SIZE = 1200; // Base dimension in pixels

function getTargetDimensions(ratioKey: AspectRatioKey): { width: number; height: number } {
  const option = ASPECT_RATIOS.find(r => r.key === ratioKey)!;
  if (option.ratio >= 1) {
    return { width: TARGET_SIZE, height: Math.round(TARGET_SIZE / option.ratio) };
  }
  return { width: Math.round(TARGET_SIZE * option.ratio), height: TARGET_SIZE };
}

// ── Smart Crop ────────────────────────────────────────────────────────────
async function applySmartCrop(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
): Promise<HTMLCanvasElement> {
  // Use smartcrop to find the best crop region
  const result = await smartcrop.crop(img, { width: targetWidth, height: targetHeight });
  const crop = result.topCrop;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, targetWidth, targetHeight,
  );

  return canvas;
}

// ── White Padding ─────────────────────────────────────────────────────────
function applyWhitePadding(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Scale image to fit within target keeping aspect ratio
  const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
  const scaledW = Math.round(img.naturalWidth * scale);
  const scaledH = Math.round(img.naturalHeight * scale);
  const offsetX = Math.round((targetWidth - scaledW) / 2);
  const offsetY = Math.round((targetHeight - scaledH) / 2);

  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

  return canvas;
}

// ── Generate Preview (low-res for speed) ──────────────────────────────────
const PREVIEW_SIZE = 400;

export async function generatePreview(
  analysis: ImageAnalysis,
  config: StandardizationConfig,
): Promise<string> {
  const { width: tw, height: th } = getTargetDimensions(config.aspectRatio);
  // Scale down for preview
  const scale = PREVIEW_SIZE / Math.max(tw, th);
  const pw = Math.round(tw * scale);
  const ph = Math.round(th * scale);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = analysis.previewUrl;
  });

  let canvas: HTMLCanvasElement;
  if (config.method === 'smart-crop') {
    canvas = await applySmartCrop(img, pw, ph);
  } else {
    canvas = applyWhitePadding(img, pw, ph);
  }

  return canvas.toDataURL('image/webp', 0.7);
}

// ── Apply Standardization (full resolution) ───────────────────────────────
export async function standardizeImage(
  analysis: ImageAnalysis,
  config: StandardizationConfig,
): Promise<StandardizedResult> {
  const { width: tw, height: th } = getTargetDimensions(config.aspectRatio);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = analysis.previewUrl;
  });

  let canvas: HTMLCanvasElement;
  if (config.method === 'smart-crop') {
    canvas = await applySmartCrop(img, tw, th);
  } else {
    canvas = applyWhitePadding(img, tw, th);
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/webp', 0.88);
  });

  const nameWithoutExt = analysis.file.name.replace(/\.[^/.]+$/, '');
  const file = new File([blob], `${nameWithoutExt}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });

  return {
    file,
    previewUrl: URL.createObjectURL(file),
    width: tw,
    height: th,
  };
}

// ── Batch Standardization ─────────────────────────────────────────────────
export async function standardizeImages(
  analyses: ImageAnalysis[],
  config: StandardizationConfig,
): Promise<StandardizedResult[]> {
  return Promise.all(analyses.map(a => standardizeImage(a, config)));
}

// ── Preference Storage ────────────────────────────────────────────────────
const PREF_KEY = 'image-standardization-pref';

export interface StoredPreference {
  aspectRatio: AspectRatioKey;
  method: StandardizationMethod;
}

export function loadPreference(storeId: string): StoredPreference | null {
  try {
    const raw = localStorage.getItem(`${PREF_KEY}-${storeId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePreference(storeId: string, pref: StoredPreference): void {
  try {
    localStorage.setItem(`${PREF_KEY}-${storeId}`, JSON.stringify(pref));
  } catch {
    // ignore
  }
}
