import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronDown, Flame } from "lucide-react";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { slugifyColor } from "@/features/storefront/lib/buildStorefrontProductLink";
import type { StoreAttribute } from "@/features/storefront/hooks/useStoreFilters";
import type { StorefrontCategory } from "@/features/storefront/hooks/useStorefrontCategories";
import type { StorefrontMenuItem } from "@/features/storefront/hooks/useStorefrontMenus";
import type { CategoryProduct } from "@/features/storefront/types/category";

interface CategoryFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributes: StoreAttribute[];
  priceMin: number;
  priceMax: number;
  onApplyFilters?: (filters: FilterState) => void;
  categories?: StorefrontCategory[];
  currentCategorySlug?: string;
  storeSlug?: string;
  /** Header menu items used to order/nest categories the same way the lojista configurou no Menu Principal */
  menuItems?: StorefrontMenuItem[];
  /** Products of the current category — used to suggest discounted picks ("Ofertas") below filters */
  categoryProducts?: CategoryProduct[];
}

export interface FilterState {
  priceRange: number[];
  selectedAttributes: Record<string, string[]>; // attributeId -> valueIds[]
  inStockOnly: boolean;
}

interface MenuCategoryNode {
  id: string;
  name: string;
  slug: string;
  children: MenuCategoryNode[];
}

/**
 * Build a category tree following the order/nesting of the lojista's Menu Principal.
 * Falls back to the alphabetical category tree when no menu items reference categories.
 */
function buildCategoriesFromMenu(
  menuItems: StorefrontMenuItem[] | undefined,
  categories: StorefrontCategory[]
): MenuCategoryNode[] {
  // Flat index of all known categories by id
  const flatCats = new Map<string, StorefrontCategory>();
  const indexCats = (cats: StorefrontCategory[]) => {
    for (const c of cats) {
      flatCats.set(c.id, c);
      if (c.children) indexCats(c.children);
    }
  };
  indexCats(categories);

  const walk = (items: StorefrontMenuItem[]): MenuCategoryNode[] => {
    const out: MenuCategoryNode[] = [];
    for (const it of items) {
      if (it.link_type !== "category" || !it.link_reference_id) {
        // Recurse into children to find nested category links even if parent isn't a category
        if (it.children?.length) out.push(...walk(it.children));
        continue;
      }
      const cat = flatCats.get(it.link_reference_id);
      if (!cat) continue;
      out.push({
        id: cat.id,
        name: it.title || cat.name,
        slug: cat.slug,
        children: it.children?.length ? walk(it.children) : [],
      });
    }
    return out;
  };

  const fromMenu = menuItems?.length ? walk(menuItems) : [];
  if (fromMenu.length > 0) return fromMenu;

  // Fallback: use the existing category tree as-is
  const fromCats = (cats: StorefrontCategory[]): MenuCategoryNode[] =>
    cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      children: c.children ? fromCats(c.children) : [],
    }));
  return fromCats(categories);
}

export function CategoryFilters({
  open,
  onOpenChange,
  attributes,
  priceMin,
  priceMax,
  onApplyFilters,
  categories = [],
  currentCategorySlug = "",
  storeSlug = "",
  menuItems,
  categoryProducts = [],
}: CategoryFiltersProps) {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const [priceRange, setPriceRange] = useState([priceMin, priceMax]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [expandedAttrs, setExpandedAttrs] = useState<Record<string, boolean>>({});
  const [expandedCatNodes, setExpandedCatNodes] = useState<Record<string, boolean>>({});

  // Threshold: if a parent category has up to N children, start expanded; otherwise collapsed
  const SUBCAT_AUTO_EXPAND_THRESHOLD = 5;

  // Sync price range when min/max change
  useEffect(() => {
    setPriceRange([priceMin, priceMax]);
  }, [priceMin, priceMax]);

  const handleAttributeToggle = (attributeId: string, valueId: string) => {
    setSelectedAttributes((prev) => {
      const current = prev[attributeId] || [];
      const updated = current.includes(valueId)
        ? current.filter((v) => v !== valueId)
        : [...current, valueId];
      return { ...prev, [attributeId]: updated };
    });
  };

  const handleClearAll = () => {
    setPriceRange([priceMin, priceMax]);
    setSelectedAttributes({});
  };

  const handleApply = () => {
    onApplyFilters?.({
      priceRange,
      selectedAttributes,
      inStockOnly: false,
    });
    onOpenChange(false);
  };

  const activeCount =
    Object.values(selectedAttributes).reduce((sum, v) => sum + v.length, 0) +
    (priceRange[0] !== priceMin || priceRange[1] !== priceMax ? 1 : 0);

  // Categories ordered like the Menu Principal
  const menuCategories = useMemo(
    () => buildCategoriesFromMenu(menuItems, categories),
    [menuItems, categories]
  );

  // Top discounted products in this category — high-conversion suggestion block
  const discountedPicks = useMemo(() => {
    return categoryProducts
      .filter((p) => p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price)
      .map((p) => {
        const off = Math.round(((p.price - (p.sale_price as number)) / p.price) * 100);
        return { product: p, discountPct: off };
      })
      .sort((a, b) => b.discountPct - a.discountPct)
      .slice(0, 4);
  }, [categoryProducts]);

  const goToProduct = (p: CategoryProduct) => {
    const slug = p._productCode ? `${p.slug}-${p._productCode}` : p.slug;
    let url = buildPath(`/product/${slug}`);
    if (p._colorCode != null) url += `?cor=${p._colorCode}`;
    else if (p._colorName) url += `?cor=${slugifyColor(p._colorName)}`;
    navigate(url);
    onOpenChange(false);
  };

  const renderCategoryNode = (node: MenuCategoryNode, depth = 0) => {
    const isCurrent = node.slug === currentCategorySlug;
    const hasChildren = node.children.length > 0;
    const autoExpanded = node.children.length <= SUBCAT_AUTO_EXPAND_THRESHOLD;
    const isExpanded = expandedCatNodes[node.id] ?? autoExpanded;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center w-full rounded-md transition-colors ${
            isCurrent
              ? "bg-primary/10 text-primary font-medium"
              : depth === 0
              ? "hover:bg-muted text-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        >
          <button
            onClick={() => {
              navigate(buildPath(`/category/${node.slug}`));
              onOpenChange(false);
            }}
            className="flex-1 text-left py-2 px-2 text-sm"
          >
            {node.name}
          </button>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedCatNodes((prev) => ({ ...prev, [node.id]: !isExpanded }));
              }}
              aria-label={isExpanded ? "Recolher subcategorias" : "Expandir subcategorias"}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className={depth === 0 ? "h-4 w-4" : "h-3 w-3"} />
              ) : (
                <ChevronRight className={depth === 0 ? "h-4 w-4" : "h-3 w-3"} />
              )}
            </button>
          ) : (
            <ChevronRight className={`${depth === 0 ? "h-4 w-4" : "h-3 w-3"} text-muted-foreground mr-2`} />
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">Filtros</SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Limpar tudo
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Ordem: Preço → Variações → Categorias → Ofertas */}

          {/* Faixa de Preço */}
          {priceMax > priceMin && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Preço</h3>
                <div className="space-y-4">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={priceMin}
                    max={priceMax}
                    step={Math.max(1, Math.round((priceMax - priceMin) / 50))}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      R$ {priceRange[0].toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">
                      R$ {priceRange[1].toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Dynamic Attributes */}
          {attributes.map((attr) => {
            const LIMITS: Record<string, number> = { color: 10, size: 9 };
            const limit = LIMITS[attr.type] ?? 6;
            const isExpanded = expandedAttrs[attr.id] ?? false;
            const hasMore = attr.values.length > limit;
            const visibleValues = hasMore && !isExpanded ? attr.values.slice(0, limit) : attr.values;

            return (
            <div key={attr.id}>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">{attr.name}</h3>

                {attr.type === "color" ? (
                  <>
                    <div className="grid grid-cols-7 gap-2">
                      {visibleValues.map((val) => {
                        const isSelected = (selectedAttributes[attr.id] || []).includes(val.id);
                        const hex = val.color_hex || "#ccc";
                        const isLight =
                          hex.toLowerCase() === "#ffffff" ||
                          hex.toLowerCase() === "#fff" ||
                          hex.toLowerCase() === "#ffd700" ||
                          hex.toLowerCase() === "#ffff00";

                        return (
                          <button
                            key={val.id}
                            onClick={() => handleAttributeToggle(attr.id, val.id)}
                            className={`relative w-9 h-9 rounded-full border-2 transition-all ${
                              isSelected
                                ? "border-primary scale-110"
                                : "border-border hover:scale-105"
                            }`}
                            title={val.value}
                            style={{
                              backgroundColor: hex,
                              boxShadow:
                                hex.toLowerCase() === "#ffffff" || hex.toLowerCase() === "#fff"
                                  ? "inset 0 0 0 1px #e5e7eb"
                                  : "none",
                            }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isLight ? "bg-gray-800" : "bg-white"
                                  }`}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAttrs(prev => ({ ...prev, [attr.id]: !isExpanded }))}
                        className="text-xs text-primary hover:underline"
                      >
                        {isExpanded ? "Ver menos" : `Ver todas (${attr.values.length})`}
                      </button>
                    )}
                  </>
                ) : attr.type === "size" ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {visibleValues.map((val) => {
                        const isSelected = (selectedAttributes[attr.id] || []).includes(val.id);
                        return (
                          <button
                            key={val.id}
                            onClick={() => handleAttributeToggle(attr.id, val.id)}
                            className={`py-1.5 px-2 text-sm font-medium rounded-md border transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary"
                            }`}
                          >
                            {val.value}
                          </button>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAttrs(prev => ({ ...prev, [attr.id]: !isExpanded }))}
                        className="text-xs text-primary hover:underline"
                      >
                        {isExpanded ? "Ver menos" : `Ver todos (${attr.values.length})`}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {visibleValues.map((val) => {
                        const isSelected = (selectedAttributes[attr.id] || []).includes(val.id);
                        return (
                          <div key={val.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`attr-${val.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleAttributeToggle(attr.id, val.id)}
                            />
                            <Label htmlFor={`attr-${val.id}`} className="cursor-pointer">
                              {val.value}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAttrs(prev => ({ ...prev, [attr.id]: !isExpanded }))}
                        className="text-xs text-primary hover:underline"
                      >
                        {isExpanded ? "Ver menos" : `Ver todos (${attr.values.length})`}
                      </button>
                    )}
                  </>
                )}
              </div>
              <Separator className="mt-6" />
            </div>
            );
          })}

          {/* Categorias — abaixo das Variações, na ordem do Menu Principal */}
          {menuCategories.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Categorias</h3>
              <div className="space-y-1">
                {menuCategories.map((cat) => renderCategoryNode(cat))}
              </div>
            </div>
          )}

          {/* Ofertas da categoria — gatilho de conversão */}
          {discountedPicks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-primary" />
                Ofertas nesta categoria
              </h3>
              <div className="space-y-2">
                {discountedPicks.map(({ product, discountPct }) => {
                  const img = product.images?.[0];
                  return (
                    <button
                      key={`${product.id}-${product._colorValueId || ""}`}
                      onClick={() => goToProduct(product)}
                      className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <span className="absolute top-0.5 left-0.5 text-[9px] font-semibold bg-primary text-primary-foreground rounded px-1 py-0.5 leading-none">
                          -{discountPct}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-2">
                          {product.name}
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-sm font-semibold text-primary">
                            R$ {(product.sale_price as number).toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-[10px] text-muted-foreground line-through">
                            R$ {product.price.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Aplicar */}
        <div className="sticky bottom-0 left-0 right-0 pt-4 pb-4 bg-background border-t mt-6">
          <Button onClick={handleApply} className="w-full">
            Aplicar Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
