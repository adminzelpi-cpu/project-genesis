import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Package, HelpCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useStorePath } from "@/contexts/StoreSlugContext";
import type { StorefrontMenuItem } from "../../hooks/useStorefrontMenus";
import type { StorefrontCategory } from "../../hooks/useStorefrontCategories";
import { MegaMenuFeaturedProduct } from "./MegaMenuFeaturedProduct";

interface DesktopNavigationProps {
  storeSlug: string;
  storeId: string;
  menuItems: StorefrontMenuItem[];
  categories: StorefrontCategory[];
  whatsapp?: string | null;
}

// Check if any child has children (grandchildren exist)
function hasGrandchildren(item: StorefrontMenuItem): boolean {
  return (item.children || []).some((child) => child.children && child.children.length > 0);
}

// Check if a menu item or its children reference a category
function findCategoryReference(item: StorefrontMenuItem): string | null {
  if (item.link_type === "category" && item.link_reference_id) {
    return item.link_reference_id;
  }
  return null;
}

export function DesktopNavigation({
  storeSlug,
  storeId,
  menuItems,
  categories,
  whatsapp,
}: DesktopNavigationProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { buildPath } = useStorePath();

  const buildUrl = (item: StorefrontMenuItem): string => {
    if (item.link_type === "category" && item.link_reference_id) {
      const findSlug = (cats: StorefrontCategory[]): string | null => {
        for (const cat of cats) {
          if (cat.id === item.link_reference_id) return cat.slug;
          if (cat.children) {
            const found = findSlug(cat.children);
            if (found) return found;
          }
        }
        return null;
      };
      const slug = findSlug(categories);
      if (slug) return buildPath(`/category/${slug}`);
      // Fallback: use the stored url if available (contains the slug path)
      if (item.url && item.url.startsWith("/")) return buildPath(item.url);
      return buildPath(`/category/${item.link_reference_id}`);
    }
    if (item.link_type === "product" && item.link_reference_id) {
      // Fallback: use stored url if available
      if (item.url && item.url.startsWith("/")) return buildPath(item.url);
      return buildPath(`/product/${item.link_reference_id}`);
    }
    if (item.url) {
      if (item.url.startsWith("/")) {
        return buildPath(item.url);
      }
      return item.url;
    }
    return "#";
  };

  const handleMouseEnter = useCallback((itemId: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveItem(itemId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveItem(null);
    }, 150);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveItem(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Use menu items if available, fallback to categories as simple links
  const navItems: StorefrontMenuItem[] = menuItems.length > 0
    ? menuItems
    : categories.map((cat) => ({
        id: cat.id,
        title: cat.name,
        url: null,
        link_type: "category" as const,
        link_reference_id: cat.id,
        position: 0,
        is_active: true,
        open_in_new_tab: false,
        footer_section: null,
        children: cat.children?.map((child) => ({
          id: child.id,
          title: child.name,
          url: null,
          link_type: "category" as const,
          link_reference_id: child.id,
          position: 0,
          is_active: true,
          open_in_new_tab: false,
          footer_section: null,
          children: child.children?.map((gc) => ({
            id: gc.id,
            title: gc.name,
            url: null,
            link_type: "category" as const,
            link_reference_id: gc.id,
            position: 0,
            is_active: true,
            open_in_new_tab: false,
            footer_section: null,
          })),
        })),
      }));

  return (
    <div
      ref={navRef}
      className="hidden lg:block border-t bg-background"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-11">
        <nav className="flex items-center gap-0">
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isMega = hasChildren && hasGrandchildren(item);
            const isSimpleDropdown = hasChildren && !isMega;
            const isActive = activeItem === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => hasChildren ? handleMouseEnter(item.id) : undefined}
                onMouseLeave={hasChildren ? handleMouseLeave : undefined}
              >
                {/* Nav item trigger — always a link, hover expands submenu */}
                <Link
                  to={buildUrl(item)}
                  target={item.open_in_new_tab ? "_blank" : undefined}
                  className={`flex items-center gap-1 px-4 h-11 text-sm font-medium transition-colors hover:text-foreground/80 ${
                    isActive ? "text-foreground border-b-2 border-foreground" : "text-foreground/70"
                  }`}
                  onClick={() => {
                    if (hasChildren) setActiveItem(null);
                  }}
                >
                  {item.title}
                  {hasChildren && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${isActive ? "rotate-180" : ""}`} />
                  )}
                </Link>

                {/* Simple dropdown */}
                {isSimpleDropdown && isActive && (
                  <div
                    className="absolute top-full left-0 z-50 bg-background border rounded-b-lg shadow-lg min-w-[220px] py-2"
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.children!.map((child) => (
                      <Link
                        key={child.id}
                        to={buildUrl(child)}
                        target={child.open_in_new_tab ? "_blank" : undefined}
                        className="block px-4 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                        onClick={() => setActiveItem(null)}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Mega menu */}
                {isMega && isActive && (
                  <MegaMenuPanel
                    item={item}
                    storeSlug={storeSlug}
                    storeId={storeId}
                    categories={categories}
                    buildUrl={buildUrl}
                    onClose={() => setActiveItem(null)}
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Utility links - show when few menu items (≤ 5) */}
        {navItems.length <= 5 && (
          <div className="flex items-center gap-5 text-sm flex-shrink-0">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span className="hidden xl:inline">Fale conosco no WhatsApp</span>
                <span className="xl:hidden">WhatsApp</span>
              </a>
            )}
            <Link
              to={buildPath(`/customer/orders`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Package className="h-4 w-4" />
              Meus Pedidos
            </Link>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ─── Mega Menu Panel ───────────────────────────────────────────

interface MegaMenuPanelProps {
  item: StorefrontMenuItem;
  storeSlug: string;
  storeId: string;
  categories: StorefrontCategory[];
  buildUrl: (item: StorefrontMenuItem) => string;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function MegaMenuPanel({
  item,
  storeSlug,
  storeId,
  categories,
  buildUrl,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuPanelProps) {
  const categoryId = findCategoryReference(item);

  // Group children: those with sub-children become column headers
  const columns = (item.children || []).filter((child) => child.children && child.children.length > 0);
  const standalone = (item.children || []).filter((child) => !child.children || child.children.length === 0);

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-background border-b shadow-lg"
      style={{ top: "auto" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Columns of subcategories */}
          <div className="flex-1 flex gap-8 flex-wrap">
            {columns.map((col) => (
              <div key={col.id} className="min-w-[160px]">
                <Link
                  to={buildUrl(col)}
                  className="block text-sm font-semibold text-foreground mb-3 hover:underline"
                  onClick={onClose}
                >
                  {col.title}
                </Link>
                <ul className="space-y-1.5">
                  {col.children!.map((subItem) => (
                    <li key={subItem.id}>
                      <Link
                        to={buildUrl(subItem)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={onClose}
                      >
                        {subItem.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {/* Standalone items (no grandchildren) as a simple list */}
            {standalone.length > 0 && (
              <div className="min-w-[160px]">
                <ul className="space-y-1.5">
                  {standalone.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={buildUrl(child)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={onClose}
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Featured product image */}
          {categoryId && (
            <div className="w-[280px] flex-shrink-0">
              <MegaMenuFeaturedProduct
                categoryId={categoryId}
                storeId={storeId}
                storeSlug={storeSlug}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
