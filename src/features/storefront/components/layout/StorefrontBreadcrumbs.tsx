import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorePath } from "@/contexts/StoreSlugContext";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface StorefrontBreadcrumbsProps {
  items: BreadcrumbItem[];
  storeSlug: string;
  /** Hide last item on mobile/tablet (useful for product pages) */
  hideLastOnMobile?: boolean;
  className?: string;
}

export function StorefrontBreadcrumbs({
  items,
  storeSlug,
  hideLastOnMobile = false,
  className,
}: StorefrontBreadcrumbsProps) {
  const { buildPath } = useStorePath();
  // Always start with "Início" linking to home
  const allItems: BreadcrumbItem[] = [
    { label: "Início", href: buildPath("/") },
    ...items,
  ];

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          // Determine if this item should be hidden on mobile
          // If hideLastOnMobile is true, hide the last item on mobile/tablet
          const shouldHideOnMobile = hideLastOnMobile && isLast;
          
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-1",
                shouldHideOnMobile && "hidden lg:flex"
              )}
            >
              {/* Separator */}
              {index > 0 && (
                <ChevronRight 
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground flex-shrink-0",
                    // If hiding last on mobile, also hide separator before it on mobile
                    shouldHideOnMobile && "hidden lg:block"
                  )} 
                />
              )}
              
              {/* Item */}
              {isLast && !item.href ? (
                // Current page (last item without href) - not clickable, darker color
                <span
                  className={cn(
                    "text-foreground font-medium truncate max-w-[50vw] sm:max-w-[45vw] md:max-w-[40vw] lg:max-w-none",
                    shouldHideOnMobile && "hidden lg:inline"
                  )}
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                // Clickable link - gray color for non-last, darker for last
                <Link
                  to={item.href}
                  className={cn(
                    "hover:text-foreground hover:underline transition-colors truncate max-w-[45vw] sm:max-w-[40vw] md:max-w-[35vw] lg:max-w-[200px]",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                // No href - not clickable
                <span
                  className={cn(
                    "text-foreground font-medium truncate max-w-[50vw] sm:max-w-[45vw] md:max-w-[40vw] lg:max-w-none",
                    shouldHideOnMobile && "hidden lg:inline"
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
