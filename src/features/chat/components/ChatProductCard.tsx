import { memo } from "react";
import { Plus, ImageOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";
import { useStorePath, useStoreSlug } from "@/contexts/StoreSlugContext";
import { useNavigate } from "react-router-dom";
import { buildStorefrontProductLink } from "@/features/storefront/lib/buildStorefrontProductLink";

export interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images?: string[];
  image_url?: string;
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

interface ChatProductCardProps {
  product: ChatProduct;
  accentColor: string;
  onQuickAdd: (product: ChatProduct) => void;
  onNavigate?: () => void;
}

export const ChatProductCard = memo(({ product, accentColor, onQuickAdd, onNavigate }: ChatProductCardProps) => {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const storeSlug = useStoreSlug();

  // Extract URL - handle both string arrays and {url, alt} object arrays
  const rawImage = product.images?.[0] || product.image_url || "";
  const imageUrl = typeof rawImage === "string" ? rawImage : (rawImage as any)?.url || "";
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;
  const hasValidPrice = displayPrice > 0;

  // Build product URL — include ?cor=<colorCode> when this card represents a specific color
  const productUrl = buildStorefrontProductLink({
    storeSlug,
    productSlug: product.slug,
    productCode: product._productCode ?? null,
    colorCode: product._colorCode ?? null,
    color: product._colorName,
    buildPath,
  });

  const handleNavigate = () => {
    onNavigate?.();
    navigate(productUrl);
  };

  return (
    <div className="flex-shrink-0 w-[140px] rounded-xl border bg-background overflow-hidden shadow-sm">
      {/* Image */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={handleNavigate}
      >
        {imageUrl ? (
          <img
            src={getOptimizedImageUrl(imageUrl, 280)}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageOff className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        {hasDiscount && discountPct > 0 && (
          <span className="absolute top-1 left-1 text-[9px] font-semibold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p
          className="text-[11px] font-medium line-clamp-2 leading-tight cursor-pointer hover:underline"
          onClick={handleNavigate}
        >
          {product.name}
        </p>
        {hasValidPrice ? (
          <div className="flex items-center gap-1">
            {hasDiscount && (
              <span className="text-[9px] text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="text-xs font-bold">{formatCurrency(displayPrice)}</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Consultar preço</span>
        )}
        <button
          onClick={() => onQuickAdd(product)}
          className="w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Adicionar
        </button>
      </div>
    </div>
  );
});

ChatProductCard.displayName = "ChatProductCard";
