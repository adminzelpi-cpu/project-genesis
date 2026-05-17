type StorefrontRouteFallbackVariant = "home" | "category" | "product" | "page";

function getVariantFromPath(): StorefrontRouteFallbackVariant {
  if (typeof window === "undefined") return "page";
  const path = window.location.pathname;
  if (path.includes("/product/")) return "product";
  if (path.includes("/category/") || path.includes("/search")) return "category";
  if (/^\/store\/[^/]+\/?$/.test(path) || path === "/") return "home";
  return "page";
}

function StoreGridFallback() {
  return (
    <>
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-9 w-20 bg-muted rounded animate-pulse" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden border-0 shadow-sm">
              <div className="w-full aspect-[3/4] bg-muted animate-pulse" />
              <div className="px-2 py-3 space-y-2">
                <div className="h-4 w-full bg-muted rounded-sm animate-pulse" />
                <div className="h-4 w-2/3 bg-muted rounded-sm animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded-sm animate-pulse" />
                <div className="h-3 w-28 bg-muted rounded-sm animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function StoreProductFallback() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="flex gap-4">
          <div className="flex flex-col gap-2">
            <div className="w-[140px] h-[160px] bg-muted rounded animate-pulse" />
            <div className="w-[140px] h-[160px] bg-muted rounded animate-pulse" />
            <div className="w-[140px] h-[160px] bg-muted rounded animate-pulse" />
          </div>
          <div className="flex-1 aspect-[3/4] bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="w-16 h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="w-24 h-11 bg-muted rounded animate-pulse" />
            <div className="flex-1 h-11 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="lg:hidden space-y-4">
        <div className="w-full aspect-square bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="w-20 h-20 bg-muted rounded animate-pulse" />
          <div className="w-20 h-20 bg-muted rounded animate-pulse" />
          <div className="w-20 h-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="w-full h-12 bg-muted rounded animate-pulse" />
      </div>
    </main>
  );
}

function StoreHomeFallback() {
  return (
    <main>
      <div className="w-full h-[360px] sm:h-[460px] bg-muted animate-pulse" />
      <section className="container mx-auto px-4 py-8">
        <div className="h-7 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] bg-muted rounded animate-pulse" />
          ))}
        </div>
      </section>
    </main>
  );
}

export function StorefrontRouteFallback({ variant }: { variant?: StorefrontRouteFallbackVariant }) {
  const resolvedVariant = variant ?? getVariantFromPath();

  return (
    <div aria-hidden="true" className="min-h-screen bg-background">
      <div className="h-14 border-b bg-background" />
      {resolvedVariant === "product" ? (
        <StoreProductFallback />
      ) : resolvedVariant === "home" ? (
        <StoreHomeFallback />
      ) : (
        <StoreGridFallback />
      )}
    </div>
  );
}
