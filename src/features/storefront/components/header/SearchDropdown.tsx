import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, X, Eye } from "lucide-react";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useSearchHistory } from "../../hooks/useSearchHistory";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { buildStorefrontProductLink } from "../../lib/buildStorefrontProductLink";
import { useStorePath } from "@/contexts/StoreSlugContext";

interface SearchDropdownProps {
  storeId: string;
  storeSlug: string;
  isFocused: boolean;
  query: string;
  onClose: () => void;
  onSearch: (term: string) => void;
}

export function SearchDropdown({ storeId, storeSlug, isFocused, query, onClose, onSearch }: SearchDropdownProps) {
  const { data: suggestions = [], isLoading } = useProductSearch(storeId, query, isFocused);
  const { history, clearHistory } = useSearchHistory(storeId);
  const { getRecentlyViewed } = useRecentlyViewed(storeId);
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const recentProducts = getRecentlyViewed([], 8);

  if (!isFocused) return null;

  const hasQuery = query.trim().length >= 2;
  const showInitialState = !hasQuery;

  const handleProductClick = (product: typeof suggestions[0]) => {
    const link = buildStorefrontProductLink({
      storeSlug,
      productSlug: product.slug,
      productCode: product._productCode ?? product.product_code,
      colorCode: product._colorCode,
      buildPath,
    });
    onClose();
    navigate(link);
  };

  const handleTermClick = (term: string) => {
    onSearch(term);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-background shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
      {/* Initial state: recently viewed + history */}
      {showInitialState && (
        <>
          {recentProducts.length > 0 && (
            <div className={`p-3 ${history.length > 0 ? 'border-b' : ''}`}>
              <span className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Vistos recentemente
              </span>
              <div className="flex gap-2.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                {recentProducts.map((product) => (
                  <button
                    key={product.colorCode != null ? `${product.id}__${product.colorCode}` : product.id}
                    onClick={() => {
                      const link = buildStorefrontProductLink({
                        storeSlug,
                        productSlug: product.slug,
                        productCode: product.productCode,
                        colorCode: product.colorCode,
                        buildPath,
                      });
                      onClose();
                      navigate(link);
                    }}
                    className="flex-shrink-0 w-[90px] sm:w-[100px] group text-left"
                  >
                    <div className="aspect-square w-full rounded-md overflow-hidden bg-muted">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <p className="text-[11px] leading-tight text-muted-foreground mt-1.5 line-clamp-2 group-hover:text-foreground transition-colors">
                      {product.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Buscas recentes</span>
                <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground">
                  Limpar
                </button>
              </div>
              <div className="space-y-1">
                {history.slice(0, 5).map((term) => (
                  <button
                    key={term}
                    onClick={() => handleTermClick(term)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length === 0 && recentProducts.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Digite para buscar produtos...
            </div>
          )}
        </>
      )}

      {/* Search suggestions (when typing) */}
      {hasQuery && (
        <>
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          
          {!isLoading && suggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{query}"
            </div>
          )}
          
          {!isLoading && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-accent text-left"
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2">
                      {product.sale_price ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                          <span className="text-sm font-semibold text-primary">{formatPrice(product.sale_price)}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {/* View all results link */}
              <button
                onClick={() => onSearch(query)}
                className="flex items-center justify-center gap-2 w-full mt-1 px-2 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-accent"
              >
                <Search className="h-4 w-4" />
                Ver todos os resultados para "{query}"
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
