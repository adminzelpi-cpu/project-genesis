import { Skeleton } from "@/components/ui/skeleton";

export function ProductPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Left Column - Image Gallery */}
        <div className="flex gap-4">
          {/* Thumbnails */}
          <div className="flex flex-col gap-2">
            <Skeleton className="w-[140px] h-[160px] rounded" />
            <Skeleton className="w-[140px] h-[160px] rounded" />
            <Skeleton className="w-[140px] h-[160px] rounded" />
          </div>
          {/* Main Image */}
          <Skeleton className="flex-1 aspect-[3/4] rounded-lg" />
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          <Skeleton className="h-4 w-48" />
          
          {/* Title */}
          <Skeleton className="h-8 w-3/4" />
          
          {/* Price */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-44" />
          </div>
          
          {/* Color Selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="w-16 h-16 rounded" />
              <Skeleton className="w-16 h-16 rounded" />
              <Skeleton className="w-16 h-16 rounded" />
              <Skeleton className="w-16 h-16 rounded" />
            </div>
          </div>
          
          {/* Size Selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="w-10 h-9 rounded" />
              <Skeleton className="w-10 h-9 rounded" />
              <Skeleton className="w-10 h-9 rounded" />
              <Skeleton className="w-10 h-9 rounded" />
            </div>
          </div>
          
          {/* Add to Cart */}
          <div className="flex gap-3">
            <Skeleton className="w-24 h-11 rounded" />
            <Skeleton className="flex-1 h-11 rounded" />
          </div>
          
          {/* Shipping */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-2">
              <Skeleton className="flex-1 h-10 rounded" />
              <Skeleton className="w-24 h-10 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden space-y-4">
        {/* Main Image */}
        <Skeleton className="w-full aspect-square rounded-lg" />
        
        {/* Thumbnails */}
        <div className="flex gap-2">
          <Skeleton className="w-20 h-20 rounded" />
          <Skeleton className="w-20 h-20 rounded" />
          <Skeleton className="w-20 h-20 rounded" />
        </div>
        
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Price */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Colors */}
        <div className="flex gap-2">
          <Skeleton className="w-14 h-14 rounded" />
          <Skeleton className="w-14 h-14 rounded" />
          <Skeleton className="w-14 h-14 rounded" />
        </div>
        
        {/* Sizes */}
        <div className="flex gap-2">
          <Skeleton className="w-10 h-9 rounded" />
          <Skeleton className="w-10 h-9 rounded" />
          <Skeleton className="w-10 h-9 rounded" />
        </div>
        
        {/* Add to Cart */}
        <Skeleton className="w-full h-12 rounded" />
      </div>
    </div>
  );
}
