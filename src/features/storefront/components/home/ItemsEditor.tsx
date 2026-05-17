import { useState, useEffect } from "react";
import { SectionWithDetails, useHomeSections } from "@/features/storefront/hooks/useHomeSections";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Package, Grid3X3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { ProductCategory } from "@/features/categories/types";
import type { Product } from "@/features/products/types";

interface ExpandedProduct {
  id: string; // product_id
  name: string;
  images: string[];
  colorValueId?: string | null;
  colorName?: string;
  colorHex?: string | null;
  /** Composite key for dedup: "productId" or "productId_color_colorValueId" */
  uniqueKey: string;
}

interface ItemsEditorProps {
  section: SectionWithDetails;
  storeId: string;
}

export function ItemsEditor({ section, storeId }: ItemsEditorProps) {
  const { addItem, removeItem } = useHomeSections(storeId);
  const { getStoreCategories } = useCategories();
  const { getStoreProducts } = useProducts();
  
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<ExpandedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [cats, prodsResult] = await Promise.all([
        getStoreCategories(storeId),
        getStoreProducts(storeId),
      ]);
      setCategories(cats);

      const products = prodsResult.products || [];

      // Fetch color attribute and values for this store
      const { data: attributes } = await supabase
        .from('attributes')
        .select('id, name, type')
        .eq('store_id', storeId);

      const { findVisualAttributeId } = await import('@/features/storefront/lib/visualAttributeUtils');
      const colorAttributeId = findVisualAttributeId((attributes || []).map(a => ({ id: a.id, type: a.type, name: a.name })));

      let valueMap = new Map<string, { value: string; color_hex: string | null }>();
      if (colorAttributeId) {
        const attrIds = (attributes || []).map(a => a.id);
        const { data: attrValues } = await supabase
          .from('attribute_values')
          .select('id, value, color_hex, attribute_id')
          .in('attribute_id', attrIds);
        
        (attrValues || []).forEach(v => {
          valueMap.set(v.id, { value: v.value, color_hex: v.color_hex });
        });
      }

      // Fetch variations for products that have display_variations_separately
      const separableProductIds = products
        .filter((p: any) => p.display_variations_separately && colorAttributeId)
        .map((p: any) => p.id);

      let variationsMap = new Map<string, any[]>();
      if (separableProductIds.length > 0) {
        const { data: variations } = await supabase
          .from('product_variations_v2')
          .select('product_id, attributes, image_url, images')
          .in('product_id', separableProductIds)
          .eq('is_active', true);

        (variations || []).forEach(v => {
          if (!variationsMap.has(v.product_id)) {
            variationsMap.set(v.product_id, []);
          }
          variationsMap.get(v.product_id)!.push(v);
        });
      }

      // Build expanded list
      const expanded: ExpandedProduct[] = [];

      for (const product of products as any[]) {
        const shouldSeparate = product.display_variations_separately && colorAttributeId;

        if (shouldSeparate) {
          const productVariations = variationsMap.get(product.id) || [];
          const colorGroups = new Map<string, any[]>();

          productVariations.forEach((v: any) => {
            const colorValId = v.attributes?.[colorAttributeId!];
            if (colorValId) {
              if (!colorGroups.has(colorValId)) colorGroups.set(colorValId, []);
              colorGroups.get(colorValId)!.push(v);
            }
          });

          for (const [colorValId, colorVars] of colorGroups.entries()) {
            const colorInfo = valueMap.get(colorValId);
            const colorName = colorInfo?.value || 'Variação';
            
            // Get image from first variation of this color
            let image: string | null = null;
            const firstVar = colorVars[0];
            if (firstVar.images && Array.isArray(firstVar.images)) {
              const imgs = firstVar.images as Array<{ url?: string }>;
              image = imgs[0]?.url || null;
            }
            if (!image && firstVar.image_url) {
              image = firstVar.image_url;
            }

            expanded.push({
              id: product.id,
              name: `${product.name} - ${colorName}`,
              images: image ? [image] : getProductImages(product),
              colorValueId: colorValId,
              colorName,
              colorHex: colorInfo?.color_hex || null,
              uniqueKey: `${product.id}_color_${colorValId}`,
            });
          }
        } else {
          expanded.push({
            id: product.id,
            name: product.name,
            images: getProductImages(product),
            colorValueId: null,
            uniqueKey: product.id,
          });
        }
      }

      setExpandedProducts(expanded);
      setLoading(false);
    };
    loadData();
  }, [storeId]);

  const isCategorySection = section.section_type === 'featured_categories';
  const isProductSection = section.section_type === 'featured_products' || section.section_type === 'new_arrivals';

  const items = section.items || [];
  
  // Build set of selected unique keys
  const selectedKeys = new Set(
    items.map(i => {
      if (i.color_value_id) return `${i.item_id}_color_${i.color_value_id}`;
      return i.item_id;
    })
  );

  // Get details for selected items
  const getItemDetails = (itemId: string, itemType: 'category' | 'product', colorValueId?: string | null) => {
    if (itemType === 'category') {
      return categories.find(c => c.id === itemId);
    }
    const key = colorValueId ? `${itemId}_color_${colorValueId}` : itemId;
    return expandedProducts.find(p => p.uniqueKey === key);
  };

  const handleAddItem = (item: ExpandedProduct) => {
    addItem.mutate({
      section_id: section.id,
      item_type: 'product',
      item_id: item.id,
      color_value_id: item.colorValueId || null,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setSearchQuery("");
      }
    });
  };

  const handleAddCategory = (categoryId: string) => {
    addItem.mutate({
      section_id: section.id,
      item_type: 'category',
      item_id: categoryId,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setSearchQuery("");
      }
    });
  };

  // Filter available items
  const availableCategories = categories.filter(c => !selectedKeys.has(c.id));
  const availableProducts = expandedProducts.filter(p => !selectedKeys.has(p.uniqueKey));

  const filteredCategories = availableCategories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProducts = availableProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Items List */}
      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          {isCategorySection ? (
            <Grid3X3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          ) : (
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum {isCategorySection ? 'categoria' : 'produto'} selecionado
          </p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar {isCategorySection ? 'Categoria' : 'Produto'}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const details = getItemDetails(item.item_id, item.item_type, item.color_value_id);
              if (!details) return null;

              const isExpanded = 'uniqueKey' in details;
              const imageUrl = isExpanded 
                ? (details as ExpandedProduct).images?.[0]
                : null;
              const colorHex = isExpanded ? (details as ExpandedProduct).colorHex : null;

              return (
                <div 
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50"
                >
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {isCategorySection ? (
                        <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {isExpanded ? (details as ExpandedProduct).name : (details as ProductCategory).name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={() => removeItem.mutate(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Adicionar {isCategorySection ? 'Categoria' : 'Produto'}
            </DialogTitle>
          </DialogHeader>
          
          <Command className="border rounded-lg">
            <CommandInput 
              placeholder={`Buscar ${isCategorySection ? 'categoria' : 'produto'}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
              
              {isCategorySection && (
                <CommandGroup heading="Categorias">
                  {filteredCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      onSelect={() => handleAddCategory(category.id)}
                      className="cursor-pointer"
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      {category.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {isProductSection && (
                <CommandGroup heading="Produtos">
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.uniqueKey}
                      value={product.name}
                      onSelect={() => handleAddItem(product)}
                      className="cursor-pointer py-2"
                    >
                      <div className="flex items-center gap-3 w-full">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate">{product.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getProductImages(product: any): string[] {
  if (!Array.isArray(product.images)) return [];
  return product.images
    .map((img: any) => typeof img === 'string' ? img : img?.url)
    .filter(Boolean) as string[];
}
