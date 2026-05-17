import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { X, Loader2, Check, Minus, Plus, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { isVisualAttribute } from "@/features/storefront/lib/visualAttributeUtils";

import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn, formatCurrency, formatDecimal } from "@/lib/utils";
import { trackAddToCart } from "@/features/tracking/lib/trackEvent";
import { getProductRetailerId, getVariationRetailerId, getContentGroupId } from "@/features/tracking/lib/retailerId";
import type { CategoryProduct } from "../../types/category";
import { useStoreInstallmentConfig, getInstallmentDisplayText } from "../../lib/installmentDisplay";

interface ProductVariation {
  id: string;
  attributes: Record<string, string>;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  is_active: boolean;
  image_url?: string | null;
  images?: Array<{ url?: string }> | null;
}

interface CategoryQuickAddDialogProps {
  product: CategoryProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewDetails: () => void;
  storeSlug: string;
}

export const CategoryQuickAddDialog = ({ 
  product, 
  open, 
  onOpenChange, 
  onViewDetails,
  storeSlug 
}: CategoryQuickAddDialogProps) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState<string[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const { addItem } = useCart();
  const installmentConfig = useStoreInstallmentConfig(storeSlug);

  // Extract real product ID (strip _color_xxx suffix from separated products)
  const realProductId = product?.id?.includes('_color_') 
    ? product.id.split('_color_')[0] 
    : product?.id;

  // Fetch product variations
  const { data: variations = [], isLoading: isLoadingVariations } = useQuery({
    queryKey: ['product-variations-quick-add', realProductId],
    queryFn: async () => {
      if (!realProductId) return [];
      const { data, error } = await supabase
        .from('product_variations_v2')
        .select('*')
        .eq('product_id', realProductId)
        .eq('is_active', true);
      
      if (error) throw error;
      return (data || []) as ProductVariation[];
    },
    enabled: !!realProductId && open,
  });

  // Fetch product display settings and store info
  const { data: productSettings } = useQuery({
    queryKey: ['product-settings', realProductId],
    queryFn: async () => {
      if (!realProductId) return null;
      const { data, error } = await supabase
        .from('products')
        .select('display_variations_separately, store_id, product_code')
        .eq('id', realProductId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!realProductId && open,
  });

  // Fetch attributes and values to resolve UUIDs (scoped to store to avoid 1000-row limit)
  const { data: attributesData } = useQuery({
    queryKey: ['attributes-quick-add', productSettings?.store_id],
    queryFn: async () => {
      if (!productSettings?.store_id) return { attributes: [], values: [] };
      
      // First get store attributes
      const { data: attrs } = await supabase
        .from('attributes')
        .select('*')
        .eq('store_id', productSettings.store_id);
      
      if (!attrs?.length) return { attributes: [], values: [] };
      
      // Then fetch values only for those attributes
      const attrIds = attrs.map(a => a.id);
      const { data: vals } = await supabase
        .from('attribute_values')
        .select('*')
        .in('attribute_id', attrIds);
      
      return { 
        attributes: attrs || [], 
        values: vals || [] 
      };
    },
    enabled: !!productSettings?.store_id && open,
  });

  // Helper to resolve attribute UUIDs
  const resolveAttributeValue = (attrId: string, valueId: string) => {
    const attr = attributesData?.attributes?.find((a: any) => a.id === attrId);
    const value = attributesData?.values?.find((v: any) => v.id === valueId);
    return { 
      attrName: attr?.name || '',
      attrType: attr?.type || '',
      valueName: value?.value || '',
      colorHex: value?.color_hex || ''
    };
  };

  // Extract available sizes and colors from variations with images
  interface ColorOption {
    name: string;
    hex?: string;
    imageUrl?: string;
    allImages?: string[]; // All images for this color
  }

  const { availableSizes, availableColors } = (() => {
    const sizes: string[] = [];
    const colors: ColorOption[] = [];
    
    if (!variations?.length || !attributesData?.attributes?.length) {
      return { availableSizes: sizes, availableColors: colors };
    }
    
    variations.forEach(v => {
      const attrs = v.attributes;
      if (!attrs) return;
      
      Object.entries(attrs).forEach(([attrId, valueId]) => {
        const { attrType, attrName, valueName, colorHex } = resolveAttributeValue(attrId, valueId);
        
        if (attrType === 'size' && valueName && !sizes.includes(valueName)) {
          sizes.push(valueName);
        }
        if (isVisualAttribute({ type: attrType, name: attrName }) && valueName) {
          // Get all images from variation
          const variationImages: string[] = [];
          if (v.images && Array.isArray(v.images)) {
            v.images.forEach(img => {
              if (img?.url) variationImages.push(img.url);
            });
          }
          if (v.image_url && !variationImages.includes(v.image_url)) {
            variationImages.unshift(v.image_url);
          }
          
          const existingColor = colors.find(c => c.name === valueName);
          if (existingColor) {
            // Merge images from other variations of same color
            variationImages.forEach(img => {
              if (!existingColor.allImages?.includes(img)) {
                existingColor.allImages?.push(img);
              }
            });
          } else {
            colors.push({
              name: valueName,
              hex: colorHex || undefined,
              imageUrl: variationImages[0],
              allImages: variationImages
            });
          }
        }
      });
    });
    
    // Sort sizes
    const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG'];
    sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    
    return { availableSizes: sizes, availableColors: colors };
  })();

  // Determine what to show based on settings
  const displaySeparately = productSettings?.display_variations_separately ?? false;
  const hasVariations = variations.length > 0;
  const hasSizes = availableSizes.length > 0;
  const hasColors = availableColors.length > 0;

  // Logic: 
  // - If displaySeparately = true (colors shown as separate cards): show only sizes
  // - If displaySeparately = false (single card with all colors): show colors + sizes
  const showSizeSelector = hasSizes;
  const showColorSelector = hasColors && !displaySeparately;

  // If no variations at all, allow direct add to cart (but wait for loading to finish first)
  const canAddDirectly = !isLoadingVariations && (!hasVariations || (!hasSizes && !hasColors));

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
      setHighlightMissing([]);
    }
  }, [open]);

  // Get images - prioritize forced color (separated cards), then selected color images, then product images, then variation images
  const getVariationImages = (): string[] => {
    const forcedColorValueId = (product as any)?._colorValueId as string | undefined;
    const forcedColorAttrId = (product as any)?._colorAttributeId as string | undefined;

    // If this card represents a separated color, prefer images from that specific color variation
    if (forcedColorValueId && variations.length > 0) {
      const vForColor = variations.find((v) => {
        const attrs = v.attributes as Record<string, string> | undefined;
        if (!attrs) return false;

        if (forcedColorAttrId && attrs[forcedColorAttrId]) {
          return attrs[forcedColorAttrId] === forcedColorValueId;
        }

        // Fallback: scan any visual attribute
        return Object.entries(attrs).some(([attrId, valueId]) => {
          const { attrType, attrName } = resolveAttributeValue(attrId, valueId);
          return isVisualAttribute({ type: attrType, name: attrName }) && valueId === forcedColorValueId;
        });
      });

      if (vForColor) {
        const variationImages: string[] = [];
        if (vForColor.images && Array.isArray(vForColor.images)) {
          vForColor.images.forEach((img) => {
            if (img?.url) variationImages.push(img.url);
          });
        }
        if (vForColor.image_url && !variationImages.includes(vForColor.image_url)) {
          variationImages.unshift(vForColor.image_url);
        }
        if (variationImages.length > 0) return variationImages;
      }
    }

    // If a color is selected, show images for that color
    if (selectedColor && showColorSelector) {
      const colorOption = availableColors.find((c) => c.name === selectedColor);
      if (colorOption?.allImages && colorOption.allImages.length > 0) {
        return colorOption.allImages;
      }
    }
    
    // Default: use product images
    if (product?.images && product.images.length > 0) {
      return product.images;
    }
    // Fallback to variation images
    for (const v of variations) {
      if (v.images && Array.isArray(v.images)) {
        const imgs = v.images.map(img => img?.url).filter((url): url is string => !!url);
        if (imgs.length > 0) return imgs;
      }
      if (v.image_url) return [v.image_url];
    }
    return [];
  };

  const images = getVariationImages();

  // Calculate prices - use variation prices if product price is 0
  const getDisplayPrices = () => {
    const productPrice = product?.price || 0;
    const productSalePrice = product?.sale_price || null;

    if (productPrice > 0) {
      return { 
        price: productPrice, 
        salePrice: productSalePrice,
        hasDiscount: productSalePrice !== null && productSalePrice < productPrice
      };
    }

    // Fallback to variation prices
    if (variations.length > 0) {
      const prices = variations.map(v => v.sale_price || v.price);
      const minPrice = Math.min(...prices);
      const normalPrices = variations.map(v => v.price);
      const minNormalPrice = Math.min(...normalPrices);
      const hasDiscount = minPrice < minNormalPrice;
      
      return { 
        price: minNormalPrice, 
        salePrice: hasDiscount ? minPrice : null,
        hasDiscount
      };
    }

    return { price: productPrice, salePrice: productSalePrice, hasDiscount: false };
  };

  const { price: displayBasePrice, salePrice: displaySalePrice, hasDiscount } = getDisplayPrices();
  const displayPrice = hasDiscount && displaySalePrice ? displaySalePrice : displayBasePrice;
  const discountPercentage = hasDiscount && displayBasePrice > 0 
    ? Math.round(((displayBasePrice - displayPrice) / displayBasePrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (isAddingToCart || isLoadingVariations) return;
    
    // Validate required selections with shake animation
    const missing: string[] = [];
    if (showSizeSelector && !selectedSize) missing.push('size');
    if (showColorSelector && !selectedColor) missing.push('color');
    
    if (missing.length > 0) {
      setHighlightMissing(missing);
      setShakeKey(k => k + 1);
      return;
    }

    setIsAddingToCart(true);

    // Simulate brief loading
    await new Promise(resolve => setTimeout(resolve, 400));

    // Find matching variation to get its ID
    let matchingVariationId: string | undefined = undefined;
    if (variations?.length && attributesData) {
      const forcedColorValueId = (product as any)?._colorValueId as string | undefined;
      const forcedColorAttrId = (product as any)?._colorAttributeId as string | undefined;

      const matchingVariation = variations.find(v => {
        const attrs = v.attributes as Record<string, string> | undefined;
        if (!attrs) return false;
        
        let colorMatch = !selectedColor && !forcedColorValueId;
        let sizeMatch = !selectedSize;
        
        Object.entries(attrs).forEach(([attrId, valueId]) => {
          const { attrType, attrName, valueName } = resolveAttributeValue(attrId, valueId);

          if (isVisualAttribute({ type: attrType, name: attrName })) {
            if (forcedColorValueId) {
              if (forcedColorAttrId ? (attrId === forcedColorAttrId && valueId === forcedColorValueId) : (valueId === forcedColorValueId)) {
                colorMatch = true;
              }
            } else if (valueName === selectedColor) {
              colorMatch = true;
            }
          }

          if (attrType === 'size' && valueName === selectedSize) sizeMatch = true;
        });
        
        return colorMatch && sizeMatch;
      });
      
      matchingVariationId = matchingVariation?.id;
    }

    // Resolve forced color name for separated cards or recently viewed products
    let colorName = selectedColor;
    if (!colorName && (product as any)?._colorValueId) {
      const forcedValue = attributesData?.values?.find((v: any) => v.id === (product as any)._colorValueId);
      colorName = forcedValue?.value || (product as any)?._colorName || '';
    }
    // Final fallback: use _colorName directly (e.g. recently viewed products)
    if (!colorName && (product as any)?._colorName) {
      colorName = (product as any)._colorName;
    }

    // Build variant string AFTER resolving color name (so separated cards include color)
    const variantParts = [];
    if (colorName) variantParts.push(colorName);
    if (selectedSize) variantParts.push(selectedSize);
    const variantString = variantParts.join(" / ") || "Único";

    // Strip color suffix from separated product names (e.g., "Camisa Polo - Bege" → "Camisa Polo")
    const colorNameForClean = colorName || (product as any)?._colorName;
    const cleanName = colorNameForClean
      ? product.name.replace(new RegExp(`\\s*-\\s*${colorNameForClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
      : product.name;

    // Resolve color/size codes from the matching variation so the cart carries
    // them — needed later to build the retailer_id persisted on the order.
    const matchingVariationForCodes = variations?.find(v => v.id === matchingVariationId);
    let resolvedColorCode: number | undefined;
    let resolvedSizeCode: number | undefined;
    if (matchingVariationForCodes && attributesData) {
      const attrs = (matchingVariationForCodes as any).attributes || {};
      for (const [attrId, valueId] of Object.entries(attrs)) {
        const attrType = (attributesData.attributes as any[])?.find((a: any) => a.id === attrId)?.type;
        const code = (attributesData.values as any[])?.find((v: any) => v.id === valueId)?.value_code;
        if (attrType === 'color' && code != null) resolvedColorCode = code;
        else if (attrType === 'size' && code != null) resolvedSizeCode = code;
      }
    }

    // Add item with the selected quantity
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: realProductId!,
        name: cleanName,
        price: displayPrice,
        image: images[0],
        variant: variantString,
        variationId: matchingVariationId,
        color: colorName || undefined,
        size: selectedSize || undefined,
        slug: product.slug,
        productCode: productSettings?.product_code,
        colorCode: resolvedColorCode,
        sizeCode: resolvedSizeCode,
        displaySeparately,
      });
    }

    // Track AddToCart - use feed-format retailer ID for catalog matching
    const productLike = { id: realProductId!, product_code: productSettings?.product_code };
    const matchingVariation = variations?.find(v => v.id === matchingVariationId);
    const trackingId = matchingVariation && attributesData
      ? getVariationRetailerId(productLike, matchingVariation as any, attributesData.attributes as any, attributesData.values as any)
      : getProductRetailerId(productLike);
    trackAddToCart({
      id: trackingId,
      name: cleanName,
      price: displayPrice,
      quantity,
      category: (product as any)?.category || (product as any)?.category_name || undefined,
      variant: variantString,
      currency: (product as any)?.store?.currency || (productSettings as any)?.store?.currency || 'BRL',
    }, productSettings?.store_id, undefined, getContentGroupId(trackingId, displaySeparately));

    setIsAddingToCart(false);
    setAddedToCart(true);

    // Show success state briefly then close dialog
    setTimeout(() => {
      setAddedToCart(false);
      onOpenChange(false);
    }, 800);
  };

  const SizeSelector = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium block">
        <span
          key={highlightMissing.includes('size') ? `shake-size-${shakeKey}` : 'size-label'}
          className={cn(
            "inline-block",
            highlightMissing.includes('size') && "text-destructive animate-shake"
          )}
        >
          Tamanho: <span className="font-normal">{highlightMissing.includes('size') ? 'Selecione' : selectedSize || ''}</span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => { setSelectedSize(size); setHighlightMissing(prev => prev.filter(k => k !== 'size')); }}
            className={cn(
              "min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
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
  );

  const ColorSelector = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          key={highlightMissing.includes('color') ? `shake-color-${shakeKey}` : 'color-label'}
          className={cn(
            "inline-block",
            highlightMissing.includes('color') && "text-destructive animate-shake"
          )}
        >
          Cor: {highlightMissing.includes('color') ? (
            <span className="font-normal">Selecione</span>
          ) : selectedColor ? (
            <span className="font-normal text-muted-foreground">{selectedColor}</span>
          ) : null}
        </span>
      </div>
      <div className="w-full overflow-x-auto pb-2">
        <Carousel
          opts={{ align: "start", loop: false }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {availableColors.map((color) => {
              const isSelected = selectedColor === color.name;
              return (
                <CarouselItem key={color.name} className="pl-2 basis-auto">
                  <button
                    onClick={() => { setSelectedColor(color.name); setHighlightMissing(prev => prev.filter(k => k !== 'color')); }}
                    className={cn(
                      "w-16 h-16 rounded border-2 overflow-hidden transition-all",
                      isSelected
                        ? "border-foreground"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    {color.imageUrl ? (
                      <img
                        src={color.imageUrl}
                        alt={color.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: color.hex || "#ccc" }}
                      >
                        {!color.hex && <span className="text-xs font-medium">{color.name}</span>}
                      </div>
                    )}
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {availableColors.length > 4 && (
            <>
              <CarouselPrevious className="-left-3" />
              <CarouselNext className="-right-3" />
            </>
          )}
        </Carousel>
      </div>
    </div>
  );

  const MobileSizeSelector = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium block">
        <span
          key={highlightMissing.includes('size') ? `shake-msize-${shakeKey}` : 'msize-label'}
          className={cn(
            "inline-block",
            highlightMissing.includes('size') && "text-destructive animate-shake"
          )}
        >
          Tamanho: <span className="font-normal">{highlightMissing.includes('size') ? 'Selecione' : selectedSize || ''}</span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => { setSelectedSize(size); setHighlightMissing(prev => prev.filter(k => k !== 'size')); }}
            className={cn(
              "min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
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
  );

  const MobileColorSelector = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          key={highlightMissing.includes('color') ? `shake-mcolor-${shakeKey}` : 'mcolor-label'}
          className={cn(
            "inline-block",
            highlightMissing.includes('color') && "text-destructive animate-shake"
          )}
        >
          Cor: {highlightMissing.includes('color') ? (
            <span className="font-normal">Selecione</span>
          ) : selectedColor ? (
            <span className="font-normal text-muted-foreground">{selectedColor}</span>
          ) : null}
        </span>
      </div>
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex gap-2">
          {availableColors.map((color) => {
            const isSelected = selectedColor === color.name;
            return (
              <button
                key={color.name}
                onClick={() => { setSelectedColor(color.name); setHighlightMissing(prev => prev.filter(k => k !== 'color')); }}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
                  isSelected
                    ? "border-foreground"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                {color.imageUrl ? (
                  <img
                    src={color.imageUrl}
                    alt={color.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: color.hex || '#ccc' }}
                  >
                    {!color.hex && <span className="text-xs font-medium">{color.name}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ContentComponent = () => {
    // Guard against null product
    if (!product) return null;
    
    return (
    <div className={`p-4 ${isDesktop ? 'md:p-6 max-w-4xl mx-auto' : ''} relative`}>
      {/* Close button for mobile */}
      {!isDesktop && (
        <button
          onClick={() => onOpenChange(false)}
          className="absolute -top-3 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none z-50"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>
      )}
      
      <div className={isDesktop ? "grid md:grid-cols-2 gap-6" : "space-y-4"}>
        {/* Desktop Layout */}
        {isDesktop && (
          <>
            {/* Image Section */}
            <div>
              <Carousel className="w-full">
                <CarouselContent>
                  {images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-[3/4] relative overflow-hidden bg-muted max-h-[500px]" style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}>
                        <img
                          src={image}
                          alt={`${product.name} - Imagem ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>

            {/* Product Info Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{product.name}</h2>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {hasDiscount && (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatCurrency(displayBasePrice)}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(displayPrice)}
                    </p>
                    {hasDiscount && discountPercentage > 0 && (
                      <span className="px-2 py-0.5 bg-[hsl(var(--store-secondary)/0.1)] text-[hsl(var(--store-secondary))] text-sm font-semibold rounded">
                        -{discountPercentage}%
                      </span>
                    )}
                  </div>
                  {getInstallmentDisplayText(displayPrice, installmentConfig) && (
                    <p className="text-sm text-muted-foreground">
                      {getInstallmentDisplayText(displayPrice, installmentConfig)}
                    </p>
                  )}
                </div>
              </div>

              {/* Color Selection - only if needed */}
              {showColorSelector && <ColorSelector />}

              {/* Size Selection - only if product has sizes */}
              {showSizeSelector && <SizeSelector />}

              {/* Quantity + Add to Cart Button */}
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
                    className="w-8 h-11 text-center border-x border-border bg-transparent outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || addedToCart || isLoadingVariations}
                  className="flex-1 h-11 font-semibold disabled:opacity-100 transition-all hover:opacity-90"
                  style={{ 
                    backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--foreground))))',
                    color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--background))))',
                    borderRadius: 'var(--store-button-radius, 0.375rem)'
                  }}
                  size="lg"
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

              {/* View Details Link */}
              <button
                onClick={onViewDetails}
                className="w-full text-center text-sm font-medium underline underline-offset-4 hover:no-underline transition-all"
              >
                Ver mais detalhes
                <ChevronRight className="w-4 h-4 inline-block ml-0.5 -mt-px" />
              </button>
            </div>
          </>
        )}

        {/* Mobile Layout */}
        {!isDesktop && (
          <>
            {/* Horizontal Image Carousel */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="flex gap-2">
                {images.map((image, index) => (
                  <div 
                    key={index}
                    className="flex-shrink-0 w-24 h-32 overflow-hidden bg-muted"
                    style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - Imagem ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold">{product.name}</h2>
              
              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatCurrency(displayBasePrice)}
                    </p>
                  )}
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(displayPrice)}
                  </p>
                  {hasDiscount && discountPercentage > 0 && (
                    <span className="px-2 py-0.5 bg-[hsl(var(--store-secondary)/0.1)] text-[hsl(var(--store-secondary))] text-xs font-semibold rounded">
                      -{discountPercentage}%
                    </span>
                  )}
                </div>
                {getInstallmentDisplayText(displayPrice, installmentConfig) && (
                  <p className="text-xs text-muted-foreground">
                    {getInstallmentDisplayText(displayPrice, installmentConfig)}
                  </p>
                )}
              </div>

              {/* Color Selection - only if needed */}
              {showColorSelector && <MobileColorSelector />}

              {/* Size Selection - only if product has sizes */}
              {showSizeSelector && <MobileSizeSelector />}

              {/* Quantity + Add to Cart Button */}
              <div className="flex gap-2">
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
                    className="w-8 h-11 text-center border-x border-border bg-transparent outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || addedToCart || isLoadingVariations}
                  className="flex-1 h-11 font-semibold disabled:opacity-100 transition-all hover:opacity-90"
                  style={{ 
                    backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--foreground))))',
                    color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--background))))',
                    borderRadius: 'var(--store-button-radius, 0.375rem)'
                  }}
                  size="lg"
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

              {/* View Details Link */}
              <button
                onClick={onViewDetails}
                className="w-full text-center text-sm font-medium underline underline-offset-4 hover:no-underline transition-all"
              >
                Ver mais detalhes
                <ChevronRight className="w-4 h-4 inline-block ml-0.5 -mt-px" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    );
  };

  // Don't render anything if no product
  if (!product) return null;

  // Desktop: Dialog (Popup)
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <ContentComponent />
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile/Tablet: Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <ContentComponent />
      </DrawerContent>
    </Drawer>
  );
};
