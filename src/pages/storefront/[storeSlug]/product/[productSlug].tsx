import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, Link, useSearchParams, Navigate } from 'react-router-dom';
import { useStoreSlug, useStorePath } from '@/contexts/StoreSlugContext';
import useEmblaCarousel from 'embla-carousel-react';
import { Heart, Share2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Minus, Plus, Ruler, CreditCard, Smartphone, Loader2, Check, ImageIcon } from 'lucide-react';
import { ProductImageZoom } from '@/features/storefront/components/product/ProductImageZoom';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
import { LGPDBanner } from "@/features/lgpd/components/LGPDBanner";
import { trackViewContent, trackAddToCart } from '@/features/tracking/lib/trackEvent';
import { getProductRetailerId, getVariationRetailerId, getContentGroupId } from '@/features/tracking/lib/retailerId';
import { useActivityTracker } from '@/features/storefront/hooks/useActivityTracker';
import { TrackingScripts } from '@/features/tracking/components/TrackingScripts';
import { slugifyColor } from '@/features/storefront/lib/buildStorefrontProductLink';
import { isVisualAttribute } from '@/features/storefront/lib/visualAttributeUtils';
import { Helmet } from 'react-helmet';
import { StorefrontMeta } from '@/features/storefront/components/layout/StorefrontMeta';
import { sanitizeHTML } from '@/lib/sanitize';

// Lazy load lightbox - only loads when user clicks to open
const ProductImageLightbox = lazy(() => import('@/features/storefront/components/product/ProductImageLightbox').then(m => ({ default: m.ProductImageLightbox })));
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StorefrontHeader } from '@/features/storefront/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/features/storefront/components/layout/StorefrontFooter';
import { StoreThemeProvider } from '@/features/storefront/components/layout/StoreThemeProvider';
import { useCart } from '@/contexts/CartContext';
import { useShare } from '@/hooks/useShare';
import { ShareModal } from '@/components/ShareModal';
import { useProduct } from '@/features/storefront/hooks/useStorefront';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductPageSkeleton } from '@/features/storefront/components/skeletons';
import { LazyMount } from '@/features/storefront/components/LazyMount';
import { useRecentlyViewed } from '@/features/storefront/hooks/useRecentlyViewed';
import { useShippingCalculator } from '@/features/shipping/hooks/useShippingCalculator';
import { useProductSizeGuide } from '@/features/size-guides/hooks/useSizeGuides';
import { SizeGuideContent } from '@/features/storefront/components/product/SizeGuideContent';
import { StorefrontBreadcrumbs } from '@/features/storefront/components/layout/StorefrontBreadcrumbs';
import { useProductCategoryBreadcrumbs } from '@/features/storefront/hooks/useCategoryBreadcrumbs';
import { useFavoriteButton } from '@/features/storefront/components/favorites/useFavoriteButton';
import { useStoreInstallmentConfig, getInstallmentDisplayText } from '@/features/storefront/lib/installmentDisplay';
import { useStorePaymentConfig, getDiscountDisplayInfo } from '@/features/storefront/lib/paymentDisplay';
import { Barcode } from 'lucide-react';
import { PixIcon } from '@/components/icons/PixIcon';

const ProductShippingCalculator = lazy(() => import('@/features/storefront/components/product/ProductShippingCalculator').then(m => ({ default: m.ProductShippingCalculator })));
const ProductRecommendations = lazy(() => import('@/features/storefront/components/recommendations/ProductRecommendations').then(m => ({ default: m.ProductRecommendations })));
const SizeGuideModal = lazy(() => import('@/features/storefront/components/product/SizeGuideModal').then(m => ({ default: m.SizeGuideModal })));
const AuthModal = lazy(() => import('@/features/storefront/components/favorites/AuthModal').then(m => ({ default: m.AuthModal })));
const ProductAddToCartModal = lazy(() => import('@/features/storefront/components/product/ProductAddToCartModal').then(m => ({ default: m.ProductAddToCartModal })));
// Helper function to extract image URLs from product images array
const extractImageUrls = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return (img as { url: string }).url;
      return null;
    })
    .filter((url): url is string => !!url);
};

export default function ProductPage() {
  const { productSlug } = useParams();
  const storeSlug = useStoreSlug();
  const [searchParams] = useSearchParams();
  const { buildPath } = useStorePath();
  const corParam = searchParams.get("cor");
  const colorParam = corParam || searchParams.get("color");
  const variationIdParam = searchParams.get("variationId");
  const { toast } = useToast();
  const installmentConfig = useStoreInstallmentConfig(storeSlug);
  const paymentConfig = useStorePaymentConfig(storeSlug);

  const { data: store } = useQuery({
    queryKey: ['storefront', storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storeSlug,
  });

  const { product, isLoading } = useProduct(productSlug!, store?.id);

  // Buscar variações para pegar preços e atributos
  const { data: variations, isLoading: isLoadingVariations } = useQuery({
    queryKey: ['product-variations', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data } = await supabase
        .from('product_variations_v2')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Buscar atributos e valores para resolver os UUIDs
  const { data: attributesData, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ['attributes-with-values', store?.id],
    queryFn: async () => {
      if (!store?.id) return { attributes: [], values: [] };
      
      const { data: attrs } = await supabase.from('attributes').select('*').eq('store_id', store.id);
      const attrIds = (attrs || []).map(a => a.id);
      const { data: vals } = attrIds.length > 0
        ? await supabase.from('attribute_values').select('*').in('attribute_id', attrIds)
        : { data: [] };
      
      return { 
        attributes: attrs || [], 
        values: vals || [] 
      };
    },
    enabled: !!store?.id,
  });

  // Fetch category breadcrumbs based on product's category
  const { breadcrumbs: categoryBreadcrumbs } = useProductCategoryBreadcrumbs(
    product?.category_ids,
    storeSlug || ""
  );

  // Extract product images from product data
  const productImages = useMemo(() => {
    const images = extractImageUrls(product?.images);
    
    // If no product images, try to get images from first variation
    if (images.length === 0 && variations?.length) {
      for (const v of variations) {
        const varImages = extractImageUrls(v.images);
        if (varImages.length > 0) return varImages;
        if (v.image_url) return [v.image_url];
      }
    }
    
    return images;
  }, [product?.images, variations]);

  // Helper to resolve attribute UUIDs to names
  const resolveAttributeValue = (attrId: string, valueId: string) => {
    const attr = attributesData?.attributes?.find((a: any) => a.id === attrId);
    const value = attributesData?.values?.find((v: any) => v.id === valueId);
    return { 
      attrName: attr?.name || '',
      attrType: attr?.type || '',
      valueName: value?.value || '',
      colorHex: value?.color_hex || '',
      valueCode: (value as any)?.value_code as number | undefined,
    };
  };

  // Extract unique visual options (colors or visual custom attributes) and sizes from variations
  const { availableColors, availableSizes, colorVariationMap, visualAttributeName } = useMemo(() => {
    const sizes: string[] = [];
    
    if (!variations?.length || !attributesData?.attributes?.length) {
      return { 
        availableColors: [], 
        availableSizes: [], 
        colorVariationMap: {},
        visualAttributeName: 'Cor',
      };
    }

    // Determine which attribute is the "visual" one (color or visual custom)
    const visualAttr = attributesData.attributes.find((a: any) => isVisualAttribute({ type: a.type, name: a.name }));
    const visualAttrId = visualAttr?.id;
    const visualAttrName = visualAttr?.name || 'Cor';

    // First pass: aggregate ALL images per visual value from ALL variations
    const colorAggregated = new Map<string, {
      id: string; attrId: string; name: string; colorHex?: string; valueCode?: number;
      allImages: string[]; firstImageUrl: string | null;
    }>();
    
    variations.forEach((v) => {
      const attrs = v.attributes as Record<string, string> | undefined;
      if (!attrs) return;
      
      Object.entries(attrs).forEach(([attrId, valueId]) => {
        const { attrType, valueName, colorHex, valueCode, attrName } = resolveAttributeValue(attrId, valueId);
        
        const attrIsVisual = isVisualAttribute({ type: attrType, name: attrName });
        
        if (attrIsVisual && valueName) {
          const variationImages = extractImageUrls(v.images);
          
          if (!colorAggregated.has(valueName)) {
            colorAggregated.set(valueName, {
              id: valueId, attrId, name: valueName, colorHex, valueCode,
              allImages: [], firstImageUrl: null,
            });
          }
          const entry = colorAggregated.get(valueName)!;
          // Collect image_url
          if (v.image_url && !entry.allImages.includes(v.image_url)) {
            entry.allImages.push(v.image_url);
            if (!entry.firstImageUrl) entry.firstImageUrl = v.image_url;
          }
          // Collect variation images array
          for (const img of variationImages) {
            if (!entry.allImages.includes(img)) entry.allImages.push(img);
            if (!entry.firstImageUrl) entry.firstImageUrl = img;
          }
        }
        
        if (attrType === 'size' && valueName && !sizes.includes(valueName)) {
          sizes.push(valueName);
        }
      });
    });

    // Build colors array and colorMap — only use productImages if color has NO own images
    const colors: Array<{ id: string; attrId: string; name: string; thumbnail: string; images: string[]; colorHex?: string; valueCode?: number }> = [];
    const colorMap: Record<string, { thumbnail: string; images: string[] }> = {};

    for (const [, entry] of colorAggregated) {
      const hasOwnImages = entry.allImages.length > 0;
      const images = hasOwnImages ? entry.allImages : [];
      const thumbnail = entry.firstImageUrl || (hasOwnImages ? entry.allImages[0] : null) || '/placeholder.svg';
      
      colors.push({
        id: entry.id, attrId: entry.attrId, name: entry.name,
        thumbnail, images, colorHex: entry.colorHex, valueCode: entry.valueCode,
      });
      colorMap[entry.name] = { thumbnail, images };
    }
    
    const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG'];
    sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    
    return { 
      availableColors: colors, 
      availableSizes: sizes, 
      colorVariationMap: colorMap,
      visualAttributeName: visualAttrName,
    };
  }, [variations, productImages, attributesData]);

  // Compute initial color synchronously to avoid flash of wrong color
  const resolvedInitialColor = useMemo(() => {
    if (availableColors.length === 0) return null;
    if (colorParam) {
      const numericCode = parseInt(colorParam);
      if (!isNaN(numericCode)) {
        const match = availableColors.find(c => c.valueCode === numericCode);
        if (match) return match.name;
      }
      const slugMatch = availableColors.find(c => slugifyColor(c.name) === colorParam.toLowerCase());
      if (slugMatch) return slugMatch.name;
      const uuidMatch = availableColors.find(c => c.id === colorParam);
      if (uuidMatch) return uuidMatch.name;
    }
    return availableColors[0].name;
  }, [availableColors, colorParam]);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authProductName, setAuthProductName] = useState<string | undefined>();

  // Effective color: use user-selected color, or the synchronously resolved initial color
  const effectiveColor = selectedColor || resolvedInitialColor;

  // Whether variation data is fully loaded (to avoid flashing placeholder while loading)
  const isVariationDataReady = !isLoadingVariations && !isLoadingAttributes;

  // Compute current images — show productImages immediately for fast LCP, 
  // then swap to color-specific images once variation data is ready
  const currentImages = useMemo(() => {
    // If variation data isn't ready yet, show product-level images immediately (fast LCP)
    if (!isVariationDataReady) {
      return productImages.length > 0 ? productImages : [];
    }
    // Variation data is ready — use color-specific images
    if (effectiveColor && colorVariationMap[effectiveColor]) {
      const images = colorVariationMap[effectiveColor].images;
      if (images.length > 0) return images;
      // Color selected but has no images — show placeholder
      return [];
    }
    // No color selected or no variations — use general product images
    if (productImages.length > 0) return productImages;
    return [];
  }, [effectiveColor, colorVariationMap, productImages, isVariationDataReady]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('descricao');
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Reset description expanded state when navigating to a different product
  useEffect(() => {
    setShowFullDescription(false);
  }, [productSlug]);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [shippingCep, setShippingCep] = useState('');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const variantsRef = useRef<HTMLDivElement>(null);
  const variantsMobileRef = useRef<HTMLDivElement>(null);
  const addToCartButtonRef = useRef<HTMLButtonElement>(null);
  const mainImageDesktopRef = useRef<HTMLDivElement>(null);
  const [mainImageHeight, setMainImageHeight] = useState<number | null>(null);

  // Track main image height for desktop thumbnail column
  useEffect(() => {
    const el = mainImageDesktopRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMainImageHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Size guide hook
  const { data: sizeGuide } = useProductSizeGuide(product?.id, product?.category_ids || (product?.category_id ? [product.category_id] : undefined));

   // Fetch returns policy for this store (summary for product page, fallback to content)
  const { data: returnsPolicyData } = useQuery({
    queryKey: ['store-returns-policy', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data } = await supabase
        .from('store_policies')
        .select('content, summary, slug')
        .eq('store_id', store.id)
        .eq('policy_type', 'returns')
        .eq('is_published', true)
        .maybeSingle();
      return data || null;
    },
    enabled: !!store?.id,
  });
  const returnsPolicy = returnsPolicyData?.summary || returnsPolicyData?.content || null;
  const returnsPolicySlug = returnsPolicyData?.slug;

  const defaultReturnsText = `<p>Você pode solicitar a troca ou devolução do produto em até <strong>7 dias corridos</strong> após o recebimento, sem necessidade de justificativa.</p>
<p>Caso o produto apresente algum defeito, o prazo para solicitar a troca é de até <strong>30 dias</strong> para produtos não duráveis e <strong>90 dias</strong> para produtos duráveis.</p>
<p>Para solicitar, entre em contato conosco informando o número do pedido e o motivo. O produto deve estar em sua embalagem original e sem sinais de uso.</p>`;

  // Shipping calculator hook
  const { calculateShipping, clearQuotes, quotes: shippingQuotes, isLoading: isCalculatingShipping, error: shippingError } = useShippingCalculator();

  // Reset all product-specific state when navigating to a different product
  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    setSelectedImage(0);
    setThumbnailStartIndex(0);
    setShippingCep('');
    clearQuotes();
  }, [productSlug]);

  // Favorites hook - must be before conditionals
  const handleAuthRequired = useCallback((productName?: string) => {
    setAuthProductName(productName);
    setShowAuthModal(true);
  }, []);
  
  const selectedColorValueId = useMemo(() => {
    if (!effectiveColor || availableColors.length === 0) return undefined;
    return availableColors.find(c => c.name === effectiveColor)?.id || undefined;
  }, [effectiveColor, availableColors]);

  const { isFavorited, isProcessing: favoriteIsProcessing, toggleFavorite } = useFavoriteButton({
    productId: product?.id || '',
    colorValueId: selectedColorValueId,
    productName: product?.name ? (effectiveColor ? `${product.name} - ${effectiveColor}` : product.name) : undefined,
    onAuthRequired: handleAuthRequired,
  });

  // Embla Carousel for mobile/tablet main images
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [emblaThumbnailRef, emblaThumbnailApi] = useEmblaCarousel({ 
    containScroll: 'keepSnaps', 
    dragFree: true,
    align: 'start'
  });

  // Sync main carousel with selectedImage state
  const onMainSelect = useCallback(() => {
    if (!emblaMainApi) return;
    const index = emblaMainApi.selectedScrollSnap();
    setSelectedImage(index);
    // Auto-scroll thumbnail carousel to keep active thumb visible
    if (emblaThumbnailApi) {
      emblaThumbnailApi.scrollTo(Math.max(0, index - 1));
    }
  }, [emblaMainApi, emblaThumbnailApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    emblaMainApi.on('select', onMainSelect);
    return () => {
      emblaMainApi.off('select', onMainSelect);
    };
  }, [emblaMainApi, onMainSelect]);

  // Scroll main carousel when selectedImage changes (from thumbnail click)
  useEffect(() => {
    if (!emblaMainApi) return;
    if (emblaMainApi.selectedScrollSnap() !== selectedImage) {
      emblaMainApi.scrollTo(selectedImage);
    }
  }, [emblaMainApi, selectedImage]);

  const { addItem, onCartOpen } = useCart();
  const { share, copyLink, shareVia, isModalOpen, setIsModalOpen, shareData } = useShare();

  // Preselect variant from URL (deep link from cart/mini-cart)
  useEffect(() => {
    if (!variationIdParam) return;
    if (!variations?.length) return;
    if (!attributesData?.attributes?.length || !attributesData?.values?.length) return;

    const v = variations.find((x) => x.id === variationIdParam);
    if (!v) return;

    const attrs = v.attributes as Record<string, string> | undefined;
    if (!attrs) return;

    let nextColor: string | null = null;
    let nextSize: string | null = null;

    Object.entries(attrs).forEach(([attrId, valueId]) => {
      const { attrType, attrName, valueName } = resolveAttributeValue(attrId, valueId);
      if (isVisualAttribute({ type: attrType, name: attrName }) && valueName) nextColor = valueName;
      if (attrType === "size" && valueName) nextSize = valueName;
    });

    if (nextColor) setSelectedColor(nextColor);
    if (nextSize) setSelectedSize(nextSize);
  }, [variationIdParam, variations, attributesData]);

  // Sync selectedColor state from URL color param – always update when colorParam changes
  // so that navigating to the same product with a different color actually updates the view
  const prevColorParamRef = useRef(colorParam);
  useEffect(() => {
    if (resolvedInitialColor && !selectedColor) {
      // First load: set from resolved color
      setSelectedColor(resolvedInitialColor);
    } else if (colorParam !== prevColorParamRef.current && resolvedInitialColor) {
      // URL color param changed (e.g., clicked recently viewed with different color)
      setSelectedColor(resolvedInitialColor);
      setSelectedSize(null);
      setQuantity(1);
      // Scroll to top when navigating to a different color variant (e.g., from recently viewed or mini cart)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevColorParamRef.current = colorParam;
  }, [resolvedInitialColor, colorParam]);

  // Sync URL via replaceState when selected color changes (no page reload)
  useEffect(() => {
    if (!product || !storeSlug) return;
    
    const productCode = (product as any).product_code as number | undefined;
    const slugPart = productCode ? `${product.slug}-${productCode}` : product.slug;
    const basePath = buildPath(`/product/${slugPart}`);
    
    if (selectedColor) {
      const colorObj = availableColors.find(c => c.name === selectedColor);
      const params = new URLSearchParams();
      if (colorObj?.valueCode != null) {
        params.set("cor", String(colorObj.valueCode));
      }
      const newUrl = params.toString() ? `${basePath}?${params}` : basePath;
      window.history.replaceState(null, '', newUrl);
    } else if (availableColors.length === 0) {
      // No colors at all — still ensure product_code is in URL
      window.history.replaceState(null, '', basePath);
    }
  }, [selectedColor, product, storeSlug, availableColors]);

  // Hook for recently viewed products
  const { addToRecentlyViewed } = useRecentlyViewed(store?.id);
  const { trackActivity } = useActivityTracker(store?.id);

  // Calculate display prices considering variations - for recently viewed and tracking
  const displayPrices = useMemo(() => {
    if (!product) return { price: 0, salePrice: null };
    
    let price = Number(product.price) || 0;
    let salePrice = product.sale_price ? Number(product.sale_price) : null;
    
    // If product has no price (0), get from variations
    if (price < 0.01 && variations?.length) {
      const variationPriceData = variations.map(v => ({
        price: Number(v.price) || 0,
        salePrice: v.sale_price ? Number(v.sale_price) : null
      }));
      
      // Find the lowest priced variation
      const lowestVariation = variationPriceData.reduce((lowest, current) => {
        const currentEffective = current.salePrice || current.price;
        const lowestEffective = lowest.salePrice || lowest.price;
        return currentEffective < lowestEffective ? current : lowest;
      }, variationPriceData[0]);
      
      price = lowestVariation.price;
      salePrice = lowestVariation.salePrice;
    }
    
    return { price, salePrice };
  }, [product, variations]);

  // Track ViewContent only after variation data is ready, so a cold navigation
  // from category doesn't first fire the parent product (P7) and then the
  // selected visual variant (P7-C20). Size/non-visual choices don't re-fire.
  const lastViewContentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product || !store?.id || displayPrices.price <= 0) return;
    // Wait for attributes/variations before deciding whether this PDP should
    // be tracked as a parent product or as the visual variant selected in URL.
    if (!isVariationDataReady) return;
    // Wait for color to be initialized (if product has colors)
    if (availableColors.length > 0 && !selectedColor) return;

    const effectivePrice = displayPrices.salePrice || displayPrices.price;

    // Build the SAME ID the catalog feed uses for `item_group_id`:
    // - display_variations_separately = true  → group at product+color (P7-C20)
    // - display_variations_separately = false → group at parent product only (P7)
    // Size/voltage/capacity (non-visual) NEVER affect the ViewContent id.
    const separateByColor = !!(product as any)?.display_variations_separately;
    let trackingId = getProductRetailerId(product as any);
    if (separateByColor && selectedColor && variations?.length && attributesData) {
      const matchingVar = variations.find(v => {
        const attrs = v.attributes as Record<string, string> | null;
        if (!attrs) return false;
        for (const [attrId, valueId] of Object.entries(attrs)) {
          const { attrType, attrName, valueName } = resolveAttributeValue(attrId, valueId);
          if (isVisualAttribute({ type: attrType, name: attrName }) && valueName === selectedColor) return true;
        }
        return false;
      });
      if (matchingVar) {
        const fullId = getVariationRetailerId(
          product as any,
          matchingVar as any,
          attributesData.attributes as any,
          attributesData.values as any,
        );
        // Strip -S{n} — ViewContent is at color-group level only.
        trackingId = fullId.replace(/-S\d+$/i, '');
      }
    }

    // Dedupe: only fire when the resolved tracking-id actually changes.
    if (lastViewContentIdRef.current === trackingId) return;
    lastViewContentIdRef.current = trackingId;

    // content_type matches the catalog item type:
    // - separateByColor + cor escolhida → 'product' (SKU específico no feed)
    // - caso contrário → 'product_group' (item pai do feed)
    const isVariantSelected = !!(separateByColor && selectedColor && availableColors.length > 0);
    const viewGroupId = getContentGroupId(trackingId, separateByColor);
    trackViewContent({
      id: trackingId,
      name: product.name,
      price: effectivePrice,
      category: product.category || undefined,
      brand: product.brand || undefined,
      currency: (store as any)?.currency || 'BRL',
      contentGroupId: viewGroupId,
    }, store.id, undefined, isVariantSelected ? 'product' : 'product_group');
    // NOTE: selectedSize intentionally NOT in deps — ViewContent fires only on
    // visual variant changes (color / model / pattern), never on size.
  }, [product?.id, store?.id, displayPrices, selectedColor, availableColors, variations, attributesData, isVariationDataReady]);

  // Reset dedupe when navigating to a different product (slug change)
  useEffect(() => {
    lastViewContentIdRef.current = null;
  }, [product?.id]);

  // Add to recently viewed – updates when color selection changes
  useEffect(() => {
    if (!product || !store?.id || displayPrices.price <= 0) return;

    const productCode = (product as any).product_code as number | undefined;
    const colorObj = selectedColor
      ? availableColors.find(c => c.name === selectedColor)
      : null;

    // Use color-specific images when available
    const images = colorObj && colorVariationMap[selectedColor!]
      ? colorVariationMap[selectedColor!].images
      : productImages;

    // Use color-specific name for display_variations_separately products
    const displayName = selectedColor && product.display_variations_separately
      ? `${product.name} - ${selectedColor}`
      : product.name;

    addToRecentlyViewed({
      id: product.id,
      name: displayName,
      slug: product.slug,
      price: displayPrices.price,
      sale_price: displayPrices.salePrice,
      images: images.length > 0 ? images : ['/placeholder.svg'],
      storeId: store.id,
      colorCode: colorObj?.valueCode ?? null,
      colorName: selectedColor ?? null,
      productCode: productCode ?? null,
      colorValueId: colorObj?.id ?? null,
      colorAttributeId: colorObj?.attrId ?? null,
    });

    // Track product view for customer profiling
    trackActivity('product_view', {
      product_id: product.id,
      product_name: displayName,
      product_slug: product.slug,
      product_price: displayPrices.price,
      color_name: selectedColor ?? undefined,
      color_code: colorObj?.valueCode ?? undefined,
      category_id: product.category_id ?? undefined,
    });
  }, [product?.id, store?.id, selectedColor, displayPrices]);

  // Reset image index when color changes
  const prevEffectiveColorRef = useRef(effectiveColor);
  useEffect(() => {
    if (prevEffectiveColorRef.current !== effectiveColor) {
      setSelectedImage(0);
      setThumbnailStartIndex(0);
      prevEffectiveColorRef.current = effectiveColor;
    }
  }, [effectiveColor]);

  const handleAddToCart = async (quantityOverride?: number) => {
    if (!product || isAddingToCart) return;
    
    const qty = quantityOverride || quantity;

    // Only require size selection if there are sizes available
    if (availableSizes.length > 0 && !selectedSize) {
      toast({ title: "Selecione um tamanho", variant: "destructive" });
      return;
    }

    setIsAddingToCart(true);

    // Brief loading delay to show feedback
    await new Promise(resolve => setTimeout(resolve, 600));

    const variantParts: string[] = [];
    if (selectedColor) variantParts.push(selectedColor);
    if (selectedSize) variantParts.push(selectedSize);
    
    // Find matching variation to get its ID
    let matchingVariationId: string | undefined = undefined;
    if (variations?.length && attributesData) {
      const matchingVariation = variations.find(v => {
        const attrs = v.attributes as Record<string, string> | undefined;
        if (!attrs) return false;
        
        let colorMatch = !selectedColor;
        let sizeMatch = !selectedSize;
        
        Object.entries(attrs).forEach(([attrId, valueId]) => {
          const { attrType, attrName, valueName } = resolveAttributeValue(attrId, valueId);
          if (isVisualAttribute({ type: attrType, name: attrName }) && valueName === selectedColor) colorMatch = true;
          if (attrType === 'size' && valueName === selectedSize) sizeMatch = true;
        });
        
        return colorMatch && sizeMatch;
      });
      
      matchingVariationId = matchingVariation?.id;
    }
    
    // Find the color's value_code for cart deep-linking
    const selectedColorObj = availableColors.find(c => c.name === selectedColor);
    const productCode = (product as any).product_code as number | undefined;

    // Resolve sizeCode from the matching variation's attributes (availableSizes is string[],
    // so we cannot read .valueCode directly). This is critical for the retailer_id format
    // P{code}-C{x}-S{y} to remain consistent across AddToCart → InitiateCheckout →
    // AddPaymentInfo → Purchase. Without this, the cart loses sizeCode and downstream
    // events fall back to P-C only, breaking catalog parity.
    let resolvedSizeCode: number | undefined;
    let resolvedColorCodeFromVariation: number | undefined;
    const matchingVariationForCodes = variations?.find(v => v.id === matchingVariationId);
    if (matchingVariationForCodes && attributesData) {
      const attrs = (matchingVariationForCodes as any).attributes || {};
      for (const [attrId, valueId] of Object.entries(attrs)) {
        const attrType = (attributesData.attributes as any[])?.find((a: any) => a.id === attrId)?.type;
        const code = (attributesData.values as any[])?.find((v: any) => v.id === valueId)?.value_code;
        if (attrType === 'size' && code != null) resolvedSizeCode = code as number;
        else if (attrType === 'color' && code != null) resolvedColorCodeFromVariation = code as number;
      }
    }

    // Add items based on selected quantity
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: lowestPrice,
        image: currentImages[0] || '/placeholder.svg',
        variant: variantParts.length > 0 ? variantParts.join(' / ') : undefined,
        variationId: matchingVariationId,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        slug: product.slug,
        productCode: productCode,
        colorCode: selectedColorObj?.valueCode ?? resolvedColorCodeFromVariation,
        sizeCode: resolvedSizeCode,
        displaySeparately: !!(product as any)?.display_variations_separately,
      });
    }

    // Track AddToCart - use feed-format retailer ID (P{code}-C{x}-S{y}) for catalog match
    const matchingVariation = variations?.find(v => v.id === matchingVariationId);
    const trackingId = matchingVariation && attributesData
      ? getVariationRetailerId(product as any, matchingVariation as any, attributesData.attributes as any, attributesData.values as any)
      : getProductRetailerId(product as any);
    trackAddToCart({
      id: trackingId,
      name: product.name,
      price: lowestPrice,
      quantity: qty,
      category: product.category || undefined,
      variant: variantParts.join(' / ') || undefined,
      currency: (store as any)?.currency || 'BRL',
    }, store?.id, undefined, getContentGroupId(trackingId, (product as any)?.display_variations_separately));

    setIsAddingToCart(false);
    setAddedToCart(true);
    setShowAddModal(false);

    // Show success state briefly then open cart
    setTimeout(() => {
      setAddedToCart(false);
      onCartOpen?.();
    }, 800);
  };

  // Handler for main add-to-cart button: opens modal if variant is missing
  const handleMainAddToCartClick = () => {
    const needsVariant = 
      (availableColors.length > 0 && !selectedColor) ||
      (availableSizes.length > 0 && !selectedSize);
    
    if (needsVariant) {
      setShowAddModal(true);
    } else {
      handleAddToCart();
    }
  };

  const handleShare = () => {
    const cleanText = (s: string | null | undefined) =>
      s ? s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const desc = cleanText(product?.meta_description) || cleanText(product?.description)?.slice(0, 160) || '';
    share({
      title: product?.name || '',
      text: desc,
      url: window.location.href,
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const scrollToVariants = () => {
    // Check if mobile ref is visible (mobile layout is active)
    const isMobile = window.innerWidth < 1024;
    const targetRef = isMobile ? variantsMobileRef : variantsRef;
    
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Show toast after scroll animation completes
    setTimeout(() => {
      const needsColor = availableColors.length > 0 && !selectedColor;
      const needsSize = availableSizes.length > 0 && !selectedSize;
      
      if (needsColor || needsSize) {
        const messages = [];
        if (needsColor) messages.push('cor');
        if (needsSize) messages.push('tamanho');
        
        toast({
          title: "Selecione as opções",
          description: `Por favor, selecione ${messages.join(' e ')} para continuar.`,
        });
      }
    }, 500);
  };

  // Handle shipping calculation
  const handleCalculateShipping = () => {
    if (!store?.id || !product) return;
    
    const cleanCep = shippingCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Por favor, digite um CEP válido com 8 dígitos.",
        variant: "destructive"
      });
      return;
    }

    // Get product dimensions from selected variation or product
    const selectedVariation = variations?.find(v => {
      const attrs = v.attributes as Record<string, string> | undefined;
      if (!attrs) return false;
      
      let matches = true;
      Object.entries(attrs).forEach(([attrId, valueId]) => {
        const { attrType, attrName, valueName } = resolveAttributeValue(attrId, valueId);
        if (isVisualAttribute({ type: attrType, name: attrName }) && selectedColor && valueName !== selectedColor) matches = false;
        if (attrType === 'size' && selectedSize && valueName !== selectedSize) matches = false;
      });
      return matches;
    });

    const weight = selectedVariation?.weight || product.weight || 0.3;
    const length = selectedVariation?.length || product.length || 16;
    const height = selectedVariation?.height || product.height || 2;
    const width = selectedVariation?.width || product.width || 11;
    const price = selectedVariation?.sale_price || selectedVariation?.price || product.sale_price || product.price;

    calculateShipping(store.id, cleanCep, [{
      weight,
      length,
      height,
      width,
      quantity,
      price: Number(price)
    }]);
  };


  useEffect(() => {
    const handleScroll = () => {
      if (addToCartButtonRef.current) {
        const rect = addToCartButtonRef.current.getBoundingClientRect();
        setShowFloatingButton(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const visibleThumbnails = 3;

  // Separate "still loading" from "truly not found"
  // Queries are chained: store → product → variations/attributes
  // While any upstream query hasn't resolved, we're still loading
  const isStillLoading = !store || isLoading || isLoadingVariations || isLoadingAttributes;
  
  // "Not found" = store loaded, product query finished, but no product returned
  const isNotFound = !!store && !isLoading && !product;

  if (isStillLoading && !isNotFound) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader storeName={store?.name || ""} storeSlug={storeSlug || ""} storeId={store?.id || ""} logoUrl={store?.logo_url} />
        <ProductPageSkeleton />
      </div>
    );
  }

  if (isNotFound || !product || !store) {
    return <Navigate to={buildPath('/')} replace />;
  }

  // Calcular preços das variações
  const variationPrices = variations?.map(v => v.sale_price || v.price) || [];
  const lowestPrice = variationPrices.length > 0 ? Math.min(...variationPrices) : (product.sale_price || product.price);
  const lowestNormalPrice = variations?.map(v => v.price) || [];
  const normalPrice = lowestNormalPrice.length > 0 ? Math.min(...lowestNormalPrice) : product.price;

  const discount = lowestPrice && normalPrice && lowestPrice < normalPrice
    ? Math.round((1 - lowestPrice / normalPrice) * 100)
    : 0;

  return (
    <StoreThemeProvider 
      primaryColor={store.theme_primary_color} 
      secondaryColor={store.theme_secondary_color}
      buttonColor={store.button_color}
      buttonHoverColor={store.button_hover_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      buttonBorderRadius={store.button_border_radius}
      elementBorderRadius={(store as any).element_border_radius}
      faviconUrl={(store as any).favicon_url}
      fontFamily={(store as any).font_family}
    >
    <TrackingScripts storeId={store.id} />
    {/* Preload hero image for faster LCP */}
    {currentImages[0] && (
      <Helmet>
        <link rel="preload" as="image" href={getOptimizedImageUrl(currentImages[0], 800)} />
      </Helmet>
    )}
    <StorefrontMeta
      title={(() => { const base = (product as any).meta_title || product.name; return selectedColor ? `${base} - ${selectedColor}` : base; })()}
      description={(() => { const strip = (s: string | null) => s ? s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : ''; return strip(product.meta_description) || strip(product.description)?.slice(0, 160) || `Compre ${product.name} na ${store.name}`; })()}
      ogImage={currentImages?.[0] || productImages?.[0] || undefined}
      ogUrl={`${window.location.origin}${buildPath(`/product/${(product as any).product_code ? `${product.slug}-${(product as any).product_code}` : productSlug}`)}`}
      ogType="product"
      storeName={store.name}
      faviconUrl={(store as any).favicon_url}
    />
    <Helmet>
      <link 
        rel="canonical" 
        href={`${window.location.origin}${buildPath(`/product/${(product as any).product_code ? `${product.slug}-${(product as any).product_code}` : productSlug}`)}${(() => { const c = availableColors.find(x => x.name === selectedColor); return c?.valueCode != null ? `?cor=${c.valueCode}` : ''; })()}`} 
      />
    </Helmet>
    <LGPDBanner storeId={store.id} storeSlug={storeSlug} />
    <div className="min-h-screen bg-background">
      <StorefrontHeader 
        storeName={store.name} 
        storeSlug={storeSlug!} 
        storeId={store.id} 
        logoUrl={store.logo_url}
        headerBgColor={(store as any).header_bg_color}
        headerTextColor={(store as any).header_text_color}
        headerLayout={(store as any).header_layout}
        headerShowFavorites={(store as any).header_show_favorites}
        headerShowSearch={(store as any).header_show_search}
        headerMobileLogoPosition={(store as any).header_mobile_logo_position}
      />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Thumbnails + Main Image Side by Side */}
            {currentImages.length > 0 ? (
            <div className="relative" style={{ paddingLeft: '156px' }}>
              {/* Vertical Thumbnails with Navigation - only show if more than 1 image */}
              {currentImages.length > 1 && (() => {
                const hasArrows = currentImages.length > 3;
                
                return (
              <div className="absolute left-0 top-0 bottom-0 w-[140px] flex flex-col gap-2 overflow-hidden">
                    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                      {currentImages.slice(thumbnailStartIndex, thumbnailStartIndex + 3).map((img, idx) => {
                        const actualIndex = thumbnailStartIndex + idx;
                        return (
                          <button
                            key={actualIndex}
                            onClick={() => setSelectedImage(actualIndex)}
                            className={cn(
                              "overflow-hidden border-2 transition-all",
                              selectedImage === actualIndex
                                ? "border-foreground"
                                : "border-border opacity-70 hover:opacity-100"
                            )}
                            style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
                          >
                            <img src={getOptimizedImageUrl(img, 140)} alt={`Miniatura ${actualIndex + 1}`} className="w-full h-auto object-contain block" loading="lazy" decoding="async" width={140} height={140} />
                          </button>
                        );
                      })}
                    </div>
                    
                    {hasArrows && (
                      <div className="flex gap-2 h-10 flex-shrink-0">
                        <button
                          onClick={() => setThumbnailStartIndex(Math.max(0, thumbnailStartIndex - 1))}
                          disabled={thumbnailStartIndex === 0}
                          className="flex-1 h-full bg-muted hover:bg-muted/80 rounded flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setThumbnailStartIndex(Math.min(currentImages.length - 3, thumbnailStartIndex + 1))}
                          disabled={thumbnailStartIndex >= currentImages.length - 3}
                          className="flex-1 h-full bg-muted hover:bg-muted/80 rounded flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Main Image with Zoom */}
              <div className="flex-1 relative" ref={mainImageDesktopRef}>
                <ProductImageZoom
                  imageSrc={currentImages[selectedImage]}
                  altText={product.name}
                  onClick={() => setIsLightboxOpen(true)}
                />
                
                {/* Navigation arrows on main image */}
                {currentImages.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedImage((prev) => {
                          const next = prev === 0 ? currentImages.length - 1 : prev - 1;
                          if (next < thumbnailStartIndex) {
                            setThumbnailStartIndex(next);
                          } else if (next >= thumbnailStartIndex + visibleThumbnails) {
                            setThumbnailStartIndex(next - visibleThumbnails + 1);
                          }
                          return next;
                        });
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImage((prev) => {
                          const next = (prev + 1) % currentImages.length;
                          if (next < thumbnailStartIndex) {
                            setThumbnailStartIndex(next);
                          } else if (next >= thumbnailStartIndex + visibleThumbnails) {
                            setThumbnailStartIndex(Math.min(next - visibleThumbnails + 1, currentImages.length - visibleThumbnails));
                          }
                          return next;
                        });
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            ) : (
              /* No images — show placeholder only when variation data confirms no images exist */
              !isVariationDataReady ? (
                <div className="bg-muted animate-pulse aspect-[3/4]" style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }} />
              ) : (
                <div className="bg-muted flex flex-col items-center justify-center aspect-[3/4]" style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}>
                  <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground/60 mt-3">Sem imagem disponível</p>
                </div>
              )
            )}
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-4">
            {/* Breadcrumb */}
            <StorefrontBreadcrumbs
              storeSlug={storeSlug || ""}
              items={[
                ...categoryBreadcrumbs,
                { label: product.name }
              ]}
              hideLastOnMobile
            />

            {/* Title and Actions */}
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-normal flex-1 leading-tight">{product.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite()}
                  disabled={favoriteIsProcessing}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-border hover:bg-muted"
                  aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  {favoriteIsProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Heart className={cn("w-5 h-5", isFavorited && "fill-red-500 text-red-500")} />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-border hover:bg-muted"
                  aria-label="Compartilhar produto"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1 min-h-[80px]">
              <div className="flex items-center gap-2 flex-wrap">
                {discount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(normalPrice)}
                  </span>
                )}
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(lowestPrice)}
                </span>
                {discount > 0 && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))]">
                    -{discount}%
                  </span>
                )}
              </div>
              
              {/* Payment Info */}
              <div className="space-y-1 text-sm text-muted-foreground mt-2">
                {paymentConfig.acceptCreditCard && getInstallmentDisplayText(lowestPrice, installmentConfig) && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>{getInstallmentDisplayText(lowestPrice, installmentConfig)}</span>
                  </div>
                )}
                {(() => {
                  const discountInfo = getDiscountDisplayInfo(lowestPrice, paymentConfig);
                  if (!discountInfo) return null;
                  return (
                    <div className="flex items-center gap-1.5">
                      {discountInfo.icon === "pix" ? (
                        <PixIcon className="w-4 h-4 text-[#32BCAD]" />
                      ) : (
                        <Barcode className="w-4 h-4" />
                      )}
                      <span>{discountInfo.text}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Visual Attribute Selector (Color or Custom) */}
            {availableColors.length > 0 && (
              <div ref={variantsRef} className="space-y-2">
                <div className="text-sm font-medium">
                  {visualAttributeName}: <span className="font-normal text-muted-foreground">{selectedColor || ''}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availableColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
                        selectedColor === color.name
                          ? "border-foreground"
                          : "border-border hover:border-muted-foreground"
                      )}
                      title={color.name}
                    >
                      {color.images.length > 0 ? (
                        <img src={getOptimizedImageUrl(color.thumbnail, 128)} alt={color.name} className="w-full h-full object-cover" loading="lazy" decoding="async" width={64} height={64} />
                      ) : color.colorHex ? (
                        <div className="w-full h-full" style={{ backgroundColor: color.colorHex }} />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {availableSizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    Tamanho: <span className="font-normal text-muted-foreground">{selectedSize || ''}</span>
                  </div>
                  {sizeGuide && (
                    <button 
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                    >
                      <Ruler className="w-4 h-4" />
                      Guia de medidas
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "flex-shrink-0 min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
                        selectedSize === size
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex gap-3">
              <div className="flex items-center border border-border" style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                  style={{ borderRadius: 'var(--store-button-radius, 0.375rem) 0 0 var(--store-button-radius, 0.375rem)' }}
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-8 h-11 text-center border-x border-border bg-transparent outline-none text-sm"
                  aria-label="Quantidade"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                  style={{ borderRadius: '0 var(--store-button-radius, 0.375rem) var(--store-button-radius, 0.375rem) 0' }}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <Button
                ref={addToCartButtonRef}
                onClick={handleMainAddToCartClick}
                disabled={isAddingToCart || addedToCart}
                className="flex-1 h-11 bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))] font-semibold text-sm disabled:opacity-100"
                style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ADICIONANDO...
                  </>
                ) : addedToCart ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    ADICIONADO!
                  </>
                ) : (
                  'ADICIONAR AO CARRINHO'
                )}
              </Button>
            </div>

            {/* Shipping Calculator */}
            <Suspense fallback={<div className="h-32" />}>
              <ProductShippingCalculator
                cep={shippingCep}
                onCepChange={setShippingCep}
                onCalculate={handleCalculateShipping}
                isCalculating={isCalculatingShipping}
                quotes={shippingQuotes}
                error={shippingError}
              />
            </Suspense>
          </div>
        </div>

        {/* Mobile & Tablet Layout */}
        <div className="lg:hidden space-y-3">
          {/* Main Image Carousel or placeholder */}
          {currentImages.length > 0 ? (<>
          <div className="relative">
            <div className="overflow-hidden" ref={emblaMainRef} style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}>
              <div className="flex h-full">
                {currentImages.map((img, index) => (
                  <div 
                    key={index} 
                    className="flex-[0_0_100%] min-w-0 h-full"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                      <img
                        src={getOptimizedImageUrl(img, 800)}
                        alt={`${product.name} - Imagem ${index + 1}`}
                        className="w-full h-auto object-contain cursor-pointer text-transparent"
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding={index === 0 ? "sync" : "async"}
                        fetchPriority={index === 0 ? "high" : undefined}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        width={800}
                        height={800}
                      />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation arrows */}
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={() => emblaMainApi?.scrollPrev()}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => emblaMainApi?.scrollNext()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite();
              }}
              disabled={favoriteIsProcessing}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center z-10"
              aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              {favoriteIsProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Heart className={cn("w-5 h-5", isFavorited && "fill-red-500 text-red-500")} />
              )}
            </button>

            {/* Dot indicators */}
            {currentImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {currentImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      selectedImage === index ? "bg-foreground w-4" : "bg-white/60"
                    )}
                    aria-label={`Ir para imagem ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails - swipeable with arrows - only show if more than 1 image */}
          {currentImages.length > 1 && (
          <div className="relative">
            {/* Left Arrow */}
            {currentImages.length > 3 && (
              <button
                onClick={() => emblaThumbnailApi?.scrollPrev()}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm border border-border"
                aria-label="Miniaturas anteriores"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            
            <div className="overflow-hidden" ref={emblaThumbnailRef}>
              <div className="flex gap-2">
                {currentImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "flex-[0_0_calc(33.333%-0.34rem)] min-w-0 border-2 overflow-hidden transition-all",
                      selectedImage === index
                        ? "border-foreground"
                        : "border-border opacity-70"
                    )}
                    style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
                  >
                      <img 
                        src={getOptimizedImageUrl(img, 200)} 
                        alt={`Miniatura ${index + 1}`} 
                        className="w-full h-auto object-cover block"
                        loading="lazy"
                        decoding="async"
                        width={200}
                        height={200}
                      />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right Arrow */}
            {currentImages.length > 3 && (
              <button
                onClick={() => emblaThumbnailApi?.scrollNext()}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm border border-border"
                aria-label="Próximas miniaturas"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          )}
          </>) : (
            !isVariationDataReady ? (
              <div className="bg-muted animate-pulse aspect-square" style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }} />
            ) : (
              <div className="bg-muted flex flex-col items-center justify-center aspect-square" style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}>
                <ImageIcon className="w-14 h-14 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground/60 mt-3">Sem imagem disponível</p>
              </div>
            )
          )}

          {/* Breadcrumb */}
          <StorefrontBreadcrumbs
            storeSlug={storeSlug || ""}
            items={categoryBreadcrumbs}
          />

          {/* Title and Share */}
          <div className="flex justify-between items-start gap-3">
            <h1 className="text-xl font-normal flex-1 leading-tight">{product.name}</h1>
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-border flex-shrink-0"
              aria-label="Compartilhar produto"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Price */}
          <div className="space-y-1 min-h-[80px]">
            <div className="flex items-center gap-2 flex-wrap">
              {discount > 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(normalPrice)}
                </span>
              )}
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(lowestPrice)}
              </span>
              {discount > 0 && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))]">
                  -{discount}%
                </span>
              )}
            </div>
            
            {/* Payment Info */}
            <div className="space-y-1 text-sm text-muted-foreground mt-2">
              {paymentConfig.acceptCreditCard && getInstallmentDisplayText(lowestPrice, installmentConfig) && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>{getInstallmentDisplayText(lowestPrice, installmentConfig)}</span>
                </div>
              )}
              {(() => {
                const discountInfo = getDiscountDisplayInfo(lowestPrice, paymentConfig);
                if (!discountInfo) return null;
                return (
                  <div className="flex items-center gap-1.5">
                    {discountInfo.icon === "pix" ? (
                      <PixIcon className="w-4 h-4 text-[#32BCAD]" />
                    ) : (
                      <Barcode className="w-4 h-4" />
                    )}
                    <span>{discountInfo.text}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Visual Attribute Selector - Mobile */}
          {availableColors.length > 0 && (
            <div ref={variantsMobileRef} className="space-y-2">
              <div className="text-sm font-medium">
                {visualAttributeName}: <span className="font-normal text-muted-foreground">{selectedColor || ''}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden",
                      selectedColor === color.name
                        ? "border-foreground"
                        : "border-border hover:border-muted-foreground"
                    )}
                    title={color.name}
                  >
                    {color.images.length > 0 ? (
                      <img src={getOptimizedImageUrl(color.thumbnail, 128)} alt={color.name} className="w-full h-full object-cover" loading="lazy" decoding="async" width={64} height={64} />
                    ) : color.colorHex ? (
                      <div className="w-full h-full" style={{ backgroundColor: color.colorHex }} />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {availableSizes.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">
                  Tamanho: <span className="font-normal text-muted-foreground">{selectedSize || ''}</span>
                </div>
                {sizeGuide && (
                  <button 
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                  >
                    <Ruler className="w-4 h-4" />
                    Guia de medidas
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "flex-shrink-0 min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
                      selectedSize === size
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex gap-3">
            <div className="flex items-center border border-border" style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                style={{ borderRadius: 'var(--store-button-radius, 0.375rem) 0 0 var(--store-button-radius, 0.375rem)' }}
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-8 h-11 text-center border-x border-border bg-transparent outline-none text-sm"
                aria-label="Quantidade"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                style={{ borderRadius: '0 var(--store-button-radius, 0.375rem) var(--store-button-radius, 0.375rem) 0' }}
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <Button
              ref={addToCartButtonRef}
              onClick={handleMainAddToCartClick}
              disabled={isAddingToCart || addedToCart}
              className="flex-1 h-11 bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))] font-semibold text-sm disabled:opacity-100"
              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ADICIONANDO...
                </>
              ) : addedToCart ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  ADICIONADO!
                </>
              ) : (
                'ADICIONAR AO CARRINHO'
              )}
            </Button>
          </div>

          {/* Shipping Calculator */}
          <Suspense fallback={<div className="h-32" />}>
            <ProductShippingCalculator
              cep={shippingCep}
              onCepChange={setShippingCep}
              onCalculate={handleCalculateShipping}
              isCalculating={isCalculatingShipping}
              quotes={shippingQuotes}
              error={shippingError}
            />
          </Suspense>
        </div>

        {/* Tabs Section - Both Desktop and Mobile */}
        <div className="mt-8 lg:mt-12">
          {/* Desktop Tabs */}
          <div className="hidden lg:block">
            <div className="border-b border-border">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('descricao')}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative",
                    activeTab === 'descricao'
                      ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Descrição
                </button>
                {sizeGuide && (
                <button
                  onClick={() => setActiveTab('medidas')}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative",
                    activeTab === 'medidas'
                      ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tamanhos e medidas
                </button>
                )}
                <button
                  onClick={() => setActiveTab('trocas')}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative",
                    activeTab === 'trocas'
                      ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Trocas e devoluções
                </button>
              </div>
            </div>
            
            <div className="py-6">
              {activeTab === 'descricao' && (
                <div className="prose max-w-none relative">
                  <div 
                    className={cn(
                      "text-foreground leading-relaxed overflow-hidden transition-all",
                      !showFullDescription && "max-h-[250px]"
                    )}
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description || '') }}
                  />
                  {!showFullDescription && product.description && product.description.length > 300 && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 flex justify-start pb-4">
                        <button
                          onClick={() => setShowFullDescription(true)}
                          className="text-sm text-muted-foreground hover:underline flex items-center gap-1 relative z-10"
                        >
                          Ver descrição completa
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                  {showFullDescription && product.description && product.description.length > 300 && (
                    <button
                      onClick={() => setShowFullDescription(false)}
                      className="text-sm text-muted-foreground hover:underline mt-4 flex items-center gap-1"
                    >
                      Ver menos
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                </div>
              )}
              {activeTab === 'medidas' && sizeGuide && (
                <div className="text-foreground">
                  <SizeGuideContent guide={sizeGuide} />
                </div>
              )}
              {activeTab === 'trocas' && (
                <div className="text-foreground leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(returnsPolicy || defaultReturnsText) }} />
                  {returnsPolicySlug && (
                    <a href={`/${store?.slug}/pagina/${returnsPolicySlug}`} className="inline-block mt-4 text-sm text-primary hover:underline">
                      Ver política completa →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

           {/* Mobile Accordions */}
           <div className="lg:hidden space-y-2">
             <div className="border-b border-border">
               <button
                 onClick={(e) => {
                   const opening = activeTab !== 'descricao';
                   setActiveTab(opening ? 'descricao' : '');
                   if (opening) {
                     const btn = e.currentTarget;
                     setTimeout(() => {
                       const rect = btn.getBoundingClientRect();
                       if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
                         window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
                       }
                     }, 80);
                   }
                 }}
                 className="w-full py-4 flex justify-between items-center text-sm font-medium"
               >
                 Descrição
                 <ChevronDown className={cn("w-4 h-4 transition-transform", activeTab === 'descricao' && "rotate-180")} />
               </button>
               {activeTab === 'descricao' && (
                 <div className="pb-4 text-sm text-foreground leading-relaxed relative prose prose-sm max-w-none">
                   <div 
                     className={cn(
                       "overflow-hidden transition-all",
                       !showFullDescription && "max-h-[192px]"
                     )}
                   >
                     <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description || '') }} />
                   </div>
                   {!showFullDescription && product.description && product.description.length > 300 && (
                     <>
                       <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
                       <div className="absolute bottom-0 left-0 right-0 flex justify-start pb-4">
                         <button
                           onClick={() => setShowFullDescription(true)}
                           className="text-sm text-muted-foreground hover:underline flex items-center gap-1 relative z-10"
                         >
                           Ver descrição completa
                           <ChevronDown className="w-4 h-4" />
                         </button>
                       </div>
                     </>
                   )}
                   {showFullDescription && (
                     <button
                       onClick={() => setShowFullDescription(false)}
                       className="text-sm text-muted-foreground hover:underline mt-2 flex items-center gap-1"
                     >
                       Ver menos
                       <ChevronDown className="w-4 h-4 rotate-180" />
                     </button>
                   )}
                 </div>
               )}
             </div>

             {sizeGuide && (
             <div className="border-b border-border">
               <button
                 onClick={(e) => {
                   const opening = activeTab !== 'medidas';
                   setActiveTab(opening ? 'medidas' : '');
                   if (opening) {
                     const btn = e.currentTarget;
                     setTimeout(() => {
                       const rect = btn.getBoundingClientRect();
                       if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
                         window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
                       }
                     }, 80);
                   }
                 }}
                 className="w-full py-4 flex justify-between items-center text-sm font-medium"
               >
                 Tamanhos e medidas
                 <ChevronDown className={cn("w-4 h-4 transition-transform", activeTab === 'medidas' && "rotate-180")} />
               </button>
               {activeTab === 'medidas' && (
                 <div className="pb-4 text-sm text-foreground">
                   <SizeGuideContent guide={sizeGuide} />
                 </div>
               )}
             </div>
             )}

             <div className="border-b border-border">
               <button
                 onClick={(e) => {
                   const opening = activeTab !== 'trocas';
                   setActiveTab(opening ? 'trocas' : '');
                   if (opening) {
                     const btn = e.currentTarget;
                     setTimeout(() => {
                       const rect = btn.getBoundingClientRect();
                       if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
                         window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
                       }
                     }, 80);
                   }
                 }}
                 className="w-full py-4 flex justify-between items-center text-sm font-medium"
               >
                 Trocas e devoluções
                 <ChevronDown className={cn("w-4 h-4 transition-transform", activeTab === 'trocas' && "rotate-180")} />
               </button>
               {activeTab === 'trocas' && (
                 <div className="pb-4 text-sm text-foreground leading-relaxed">
                   <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(returnsPolicy || defaultReturnsText) }} />
                   {returnsPolicySlug && (
                     <a href={`/${store?.slug}/pagina/${returnsPolicySlug}`} className="inline-block mt-3 text-sm text-primary hover:underline">
                       Ver política completa →
                     </a>
                   )}
                 </div>
               )}
             </div>
           </div>

          {/* Floating Add to Cart Button */}
          {showFloatingButton && (
            <div data-floating-bar className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-fade-in">
              <div className="max-w-screen-xl mx-auto">
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="w-full h-12 bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))] font-semibold text-sm"
                  style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
                >
                  ADICIONAR AO CARRINHO
                </Button>
              </div>
            </div>
          )}

          {/* Product Recommendations — only fetched when user scrolls near it */}
          {product && store && (
            <LazyMount rootMargin="600px" minHeight={400}>
              <Suspense fallback={null}>
                <ProductRecommendations
                  storeId={store.id}
                  storeSlug={storeSlug!}
                  productId={product.id}
                  categoryId={product.category_id}
                  price={lowestPrice}
                  productCode={product.product_code}
                  currentColorCode={availableColors.find(c => c.name === effectiveColor)?.valueCode}
                />
              </Suspense>
            </LazyMount>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareData && (
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCopyLink={() => copyLink(shareData.url)}
          onShareVia={(platform) => shareVia(platform, shareData)}
        />
      )}

      {/* Image Lightbox - Lazy loaded */}
      <Suspense fallback={null}>
        <ProductImageLightbox
          images={currentImages}
          initialIndex={selectedImage}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          productName={product?.name || ''}
          onAddToCartClick={() => { setIsLightboxOpen(false); setTimeout(() => setShowAddModal(true), 150); }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SizeGuideModal 
          open={sizeGuideOpen} 
          onOpenChange={setSizeGuideOpen} 
          guide={sizeGuide}
          productId={product?.id}
        />

        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {}}
          productName={authProductName}
          storeId={store?.id}
        />
      </Suspense>

      {product && (
        <Suspense fallback={null}>
          <ProductAddToCartModal
            open={showAddModal}
            onOpenChange={setShowAddModal}
            productName={product.name}
            productImage={currentImages[0] || '/placeholder.svg'}
            price={lowestPrice}
            normalPrice={normalPrice}
            availableColors={availableColors}
            availableSizes={availableSizes}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            onColorChange={setSelectedColor}
            onSizeChange={setSelectedSize}
            onAddToCart={(qty) => handleAddToCart(qty)}
            isAddingToCart={isAddingToCart}
            addedToCart={addedToCart}
            hasSizeGuide={!!sizeGuide}
            onSizeGuideOpen={() => { setShowAddModal(false); setSizeGuideOpen(true); }}
            initialQuantity={quantity}
          />
        </Suspense>
      )}

      {store && <StorefrontFooter store={store as any} />}
    </div>
    </StoreThemeProvider>
  );
}

