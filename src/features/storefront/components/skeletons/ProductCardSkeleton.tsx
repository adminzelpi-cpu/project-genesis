import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real CategoryProductCard layout exactly to avoid CLS:
 * - aspect-[3/4] image, no rounding
 * - px-2 py-3 info block with title (2 lines) + price + installment
 */
export function ProductCardSkeleton() {
  return (
    <div className="group relative overflow-hidden border-0 shadow-sm">
      {/* Image — same aspect ratio and squared corners as the real card */}
      <Skeleton className="w-full aspect-[3/4] rounded-none" />

      {/* Info block — matches px-2 py-3 space-y-2 */}
      <div className="px-2 py-3 space-y-2">
        {/* Title (line-clamp-2) */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
        </div>
        {/* Price */}
        <Skeleton className="h-5 w-20 rounded-sm" />
        {/* Installment */}
        <Skeleton className="h-3 w-28 rounded-sm" />
      </div>
    </div>
  );
}
