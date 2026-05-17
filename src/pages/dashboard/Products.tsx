import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useStore } from "@/features/stores/hooks/useStore";
import { Product } from "@/features/products/types";
import { Store } from "@/features/stores/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, Search, Filter, MoreVertical, Pencil, Copy, Trash2, ArrowUpDown } from "lucide-react";
import { ProductTableActions } from "@/features/products/components/ProductTableActions";
import { QuickEditDialog } from "@/features/products/components/QuickEditDialog";
import { ProductForm } from "@/features/products/components/ProductForm";
import { StoreForm } from "@/features/stores/components/StoreForm";
import { ImportValidationDialog } from "@/features/products/components/ImportValidationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { ValidationResult } from "@/features/products/schemas/importValidation";

export default function Products() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getMyStores } = useStore();
  const { getStoreProducts } = useProducts();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    loadStores();
  }, [user]);

  useEffect(() => {
    if (selectedStore) {
      loadProducts();
    }
  }, [selectedStore]);

  const loadStores = async () => {
    const { stores: data, error } = await getMyStores();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar lojas",
        description: error.message,
      });
    } else {
      setStores(data || []);
      if (data && data.length > 0) {
        setSelectedStore(data[0]);
      }
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    if (!selectedStore) return;
    setLoading(true);
    const { products: data, error } = await getStoreProducts(selectedStore.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message,
      });
    } else {
      setProducts(data || []);
      setFilteredProducts(data || []);
    }
    setLoading(false);
  };

  // Filtrar e ordenar produtos
  useEffect(() => {
    let filtered = [...products];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de categoria
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Filtro de estoque
    if (stockFilter === "in_stock") {
      filtered = filtered.filter(p => (p.stock_quantity || 0) > 0);
    } else if (stockFilter === "out_of_stock") {
      filtered = filtered.filter(p => (p.stock_quantity || 0) === 0);
    } else if (stockFilter === "low_stock") {
      filtered = filtered.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5);
    }

    // Ordenação
    switch (sortBy) {
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price_asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "created_at_desc":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "created_at_asc":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, stockFilter, sortBy]);

  const handleProductCreated = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
    toast({
      title: editingProduct ? "Produto atualizado!" : "Produto criado com sucesso!",
      description: editingProduct 
        ? "As alterações foram salvas." 
        : "O produto foi adicionado à sua loja.",
    });
  };

  const handleStoreCreated = () => {
    setStoreDialogOpen(false);
    loadStores();
    toast({
      title: "Loja criada!",
      description: "Agora você pode adicionar produtos.",
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedStore) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      
      if (error) throw error;
      
      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso",
      });
      setDeleteTarget(null);
      loadProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedStore || selectedProducts.size === 0) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", Array.from(selectedProducts));
      
      if (error) throw error;
      
      toast({
        title: "Produtos deletados",
        description: `${selectedProducts.size} produto(s) removido(s)`,
      });
      setSelectedProducts(new Set());
      loadProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao deletar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    if (!selectedStore) return;
    setDuplicating(true);

    toast({
      title: "Duplicando produto...",
      description: "Aguarde, estamos criando uma cópia da estrutura.",
    });

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Generate unique slug (temporary, user will change name/slug in edit)
      const tempSlug = `novo-produto-${Date.now()}`;

      // Insert duplicated product — only structural data, no unique content
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          store_id: product.store_id,
          name: '', // Empty — user must fill
          slug: tempSlug,
          description: null, // User will write new description
          price: product.price,
          sale_price: product.sale_price,
          stock_quantity: product.stock_quantity,
          images: null, // No images — each product has its own photos
          keywords: null, // No keywords
          is_active: false,
          brand: product.brand,
          category: product.category,
          category_id: (product as any).category_id,
          category_ids: (product as any).category_ids,
          weight: product.weight,
          height: product.height,
          width: product.width,
          length: product.length,
          gender: product.gender,
          age_group: product.age_group,
          material: product.material,
          size_guide_id: product.size_guide_id,
          meta_title: null, // SEO will be unique
          meta_description: null,
          display_variations_separately: (product as any).display_variations_separately,
          gallery_layout: (product as any).gallery_layout,
          variant_selector_layout: (product as any).variant_selector_layout,
          tags: null, // No tags
          image_alt_tags: null,
          structured_data: null,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Duplicate variations structure (without images)
      const { data: variations } = await supabase
        .from("product_variations_v2")
        .select("*")
        .eq("product_id", product.id);

      if (variations && variations.length > 0) {
        const parentMap = new Map<string, string>();
        
        // Insert parent variations (without images)
        const parents = variations.filter(v => v.is_parent);
        for (const parent of parents) {
          const { id: _oldId, product_id: _pid, created_at: _ca, updated_at: _ua, sku: _oldSku, ...parentData } = parent;
          const { data: newParent } = await supabase
            .from("product_variations_v2")
            .insert({ 
              ...parentData, 
              product_id: newProduct.id,
              image_url: null,
              images: '[]',
              sku: null,
            })
            .select()
            .single();
          if (newParent) parentMap.set(parent.id, newParent.id);
        }

        // Insert child variations (without images)
        const children = variations.filter(v => !v.is_parent);
        for (const child of children) {
          const { id: _oldId, product_id: _pid, created_at: _ca, updated_at: _ua, sku: _oldSku, ...childData } = child;
          await supabase
            .from("product_variations_v2")
            .insert({
              ...childData,
              product_id: newProduct.id,
              parent_id: child.parent_id ? (parentMap.get(child.parent_id) || null) : null,
              image_url: null,
              images: '[]',
              sku: null,
            });
        }
      }

      toast({
        title: "Produto duplicado!",
        description: "Abrindo editor para você completar as informações...",
      });

      // Navigate to edit form so the user can fill name, description, images, SEO
      navigate(`/dashboard/products/${newProduct.id}/edit`);
    } catch (error) {
      console.error("Erro ao duplicar:", error);
      toast({
        variant: "destructive",
        title: "Erro ao duplicar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleImportProducts = async (productsData: any[]) => {
    if (!selectedStore) return;
    
    try {
      const { validateImportedProducts } = await import("@/features/products/schemas/importValidation");
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Validar produtos antes de importar
      const validationResult = validateImportedProducts(productsData);
      
      // Verificar duplicatas de slug DENTRO do próprio CSV
      const slugCounts = new Map<string, number>();
      validationResult.valid.forEach((p) => {
        slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
      });

      const duplicateSlugsInCsv = Array.from(slugCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([slug]) => slug);

      if (duplicateSlugsInCsv.length > 0) {
        // Mover produtos com slugs duplicados no CSV para inválidos (manter apenas a primeira ocorrência)
        const seenSlugs = new Set<string>();
        const validWithoutInternalDuplicates: typeof validationResult.valid = [];
        const internalDuplicates: typeof validationResult.invalid = [];

        validationResult.valid.forEach((p, index) => {
          if (duplicateSlugsInCsv.includes(p.slug)) {
            if (seenSlugs.has(p.slug)) {
              // É uma duplicata - adicionar aos inválidos
              internalDuplicates.push({
                row: index + 2,
                data: p,
                errors: [`O slug "${p.slug}" aparece ${slugCounts.get(p.slug)} vezes no arquivo CSV. Apenas a primeira ocorrência será importada.`]
              });
            } else {
              // É a primeira ocorrência - manter
              seenSlugs.add(p.slug);
              validWithoutInternalDuplicates.push(p);
            }
          } else {
            validWithoutInternalDuplicates.push(p);
          }
        });

        validationResult.valid = validWithoutInternalDuplicates;
        validationResult.invalid = [...validationResult.invalid, ...internalDuplicates];
      }
      
      // Verificar slugs duplicados no banco de dados
      const slugsToCheck = validationResult.valid.map(p => p.slug);
      if (slugsToCheck.length > 0) {
        const { data: existingProducts } = await supabase
          .from("products")
          .select("slug, name")
          .eq("store_id", selectedStore.id)
          .in("slug", slugsToCheck);

        if (existingProducts && existingProducts.length > 0) {
          // Mover produtos com slugs duplicados para a lista de inválidos
          const duplicateSlugs = new Set(existingProducts.map(p => p.slug));
          
          const validWithoutDuplicates = validationResult.valid.filter(
            p => !duplicateSlugs.has(p.slug)
          );
          
          const duplicateProducts = validationResult.valid
            .filter(p => duplicateSlugs.has(p.slug))
            .map((p, index) => ({
              row: index + 2,
              data: p,
              errors: [`Já existe um produto com o slug "${p.slug}" nesta loja. O produto existente é: "${existingProducts.find(ep => ep.slug === p.slug)?.name}"`]
            }));

          validationResult.valid = validWithoutDuplicates;
          validationResult.invalid = [...validationResult.invalid, ...duplicateProducts];
        }
      }
      
      if (validationResult.invalid.length > 0 || validationResult.valid.length > 0) {
        // Mostrar modal de validação
        setValidationResult(validationResult);
        setShowValidationDialog(true);
        return;
      }
      
      if (validationResult.valid.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhum produto válido",
          description: "Todos os produtos do arquivo contêm erros ou já existem no sistema.",
        });
        return;
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo",
      });
    }
  };


  const handleConfirmImport = async () => {
    if (!validationResult || !selectedStore) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const productsToInsert = validationResult.valid.map(p => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        sale_price: p.sale_price,
        stock_quantity: p.stock_quantity,
        brand: p.brand,
        category: p.category,
        weight: p.weight,
        height: p.height,
        width: p.width,
        length: p.length,
        is_active: p.is_active,
        images: p.images,
        store_id: selectedStore.id,
      }));
      
      const { error } = await supabase.from("products").insert(productsToInsert);
      
      if (error) throw error;
      
      toast({
        title: "Importação concluída",
        description: `${productsToInsert.length} produto(s) importado(s) com sucesso`,
      });
      
      setShowValidationDialog(false);
      setValidationResult(null);
      loadProducts();
    } catch (error) {
      console.error("Erro ao salvar produtos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro ao salvar produtos no banco de dados",
      });
    }
  };

  const handleQuickEdit = async (productData: Partial<Product>) => {
    if (!productData.id) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", productData.id);
      
      if (error) throw error;
      
      loadProducts();
    } catch (error) {
      throw error;
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Obter categorias únicas
  const categories = Array.from(new Set(
    products.map(p => p.category).filter(Boolean)
  )) as string[];

  if (stores.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">Você precisa criar uma loja para cadastrar produtos</p>
          </div>
          <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Loja
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Loja</DialogTitle>
              </DialogHeader>
              <StoreForm onSuccess={handleStoreCreated} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja criada</h3>
            <p className="text-muted-foreground">
              Crie sua primeira loja para adicionar produtos
            </p>
            <Button onClick={() => setStoreDialogOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie os produtos da sua loja</p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedStore?.id}
            onValueChange={(value) => {
              const store = stores.find((s) => s.id === value);
              setSelectedStore(store || null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione uma loja" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedStore && (
            <Button 
              className="gap-2"
              onClick={() => navigate(`/dashboard/products/new?storeId=${selectedStore.id}`)}
            >
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          )}
        </div>
      </div>

      {duplicating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 shadow-lg border">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Duplicando produto...</p>
            <p className="text-xs text-muted-foreground">Você será redirecionado ao editor em seguida</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione produtos à sua loja para começar a vender
            </p>
            <Button onClick={() => selectedStore && navigate(`/dashboard/products/new?storeId=${selectedStore.id}`)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Barra de ações, busca e filtros */}
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <ProductTableActions
                selectedProducts={products.filter(p => selectedProducts.has(p.id))}
                allProducts={filteredProducts}
                onImport={handleImportProducts}
                onDeleteSelected={handleDeleteSelected}
              />
              
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="in_stock">Em estoque</SelectItem>
                      <SelectItem value="low_stock">Estoque baixo</SelectItem>
                      <SelectItem value="out_of_stock">Sem estoque</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Mais recentes</SelectItem>
                      <SelectItem value="created_at_asc">Mais antigos</SelectItem>
                      <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                      <SelectItem value="price_asc">Preço (menor)</SelectItem>
                      <SelectItem value="price_desc">Preço (maior)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabela de produtos */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4"
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">Imagem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm || categoryFilter !== "all" || stockFilter !== "all" 
                        ? "Nenhum produto encontrado com os filtros aplicados" 
                        : "Nenhum produto cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stockQty = product.stock_quantity || 0;
                    // Calcular menor preço das variações (se existirem)
                    const variations = (product as any).variations || [];
                    let displayPrice = product.price || 0;
                    let displaySalePrice = (product as any).sale_price;
                    let showFromPrice = false;
                    
                    if (variations.length > 0) {
                      const variationPrices = variations
                        .map((v: any) => v.price || 0)
                        .filter((p: number) => p > 0);
                      
                      const variationSalePrices = variations
                        .map((v: any) => v.sale_price || 0)
                        .filter((p: number) => p > 0);
                      
                      if (variationPrices.length > 0) {
                        const minPrice = Math.min(...variationPrices);
                        const maxPrice = Math.max(...variationPrices);
                        displayPrice = minPrice;
                        
                        // Verificar se há preços promocionais nas variações
                        if (variationSalePrices.length > 0) {
                          displaySalePrice = Math.min(...variationSalePrices);
                        }
                        
                        // Só mostra "A partir de" se houver preços diferentes
                        showFromPrice = minPrice !== maxPrice;
                      }
                    }
                    
                    const hasPromotion = displaySalePrice && displaySalePrice > 0 && displaySalePrice < displayPrice;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {(() => {
                              // Prioridade: 1) Imagens do produto, 2) Primeira imagem da primeira variação
                              let imageUrl = null;
                              
                              if (product.images && (product.images as any[]).length > 0) {
                                imageUrl = typeof product.images[0] === 'string' 
                                  ? product.images[0] 
                                  : (product.images[0] as any).url;
                              } else if (variations.length > 0) {
                                const firstVariation = variations[0];
                                if (firstVariation.images && Array.isArray(firstVariation.images) && firstVariation.images.length > 0) {
                                  imageUrl = firstVariation.images[0]?.url;
                                } else if (firstVariation.image_url) {
                                  imageUrl = firstVariation.image_url;
                                }
                              }
                              
                              return imageUrl ? (
                                <img 
                                  src={imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium line-clamp-1">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(product as any).category ? (
                            <Badge variant="outline">{(product as any).category}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {hasPromotion ? (
                              <>
                                {showFromPrice && (
                                  <span className="text-xs text-muted-foreground">A partir de</span>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground line-through">
                                    R$ {Number(displayPrice).toFixed(2)}
                                  </span>
                                  <span className="font-medium text-primary">
                                    R$ {Number(displaySalePrice).toFixed(2)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                {showFromPrice && (
                                  <span className="text-xs text-muted-foreground">A partir de</span>
                                )}
                                <span className="font-medium">
                                  R$ {Number(displayPrice).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Calcular estoque considerando variações
                            let totalStock = 0;
                            let hasUnlimitedStock = false;
                            
                            console.log('Product:', product.name, 'stockQty:', stockQty, 'variations:', variations);
                            
                            if (variations.length > 0) {
                              // Se tem variações, somar estoque delas
                              variations.forEach((v: any) => {
                                console.log('Variation stock_quantity:', v.stock_quantity, 'type:', typeof v.stock_quantity);
                                if (v.stock_quantity === null || v.stock_quantity === undefined || v.stock_quantity === 0) {
                                  hasUnlimitedStock = true;
                                } else {
                                  totalStock += v.stock_quantity;
                                }
                              });
                            } else {
                              // Produto simples
                              console.log('Simple product stockQty:', stockQty, 'type:', typeof stockQty);
                              if (stockQty === null || stockQty === undefined || stockQty === 0) {
                                hasUnlimitedStock = true;
                              } else {
                                totalStock = stockQty;
                              }
                            }
                            
                            console.log('hasUnlimitedStock:', hasUnlimitedStock, 'totalStock:', totalStock);
                            
                            // Renderizar badge de estoque
                            if (hasUnlimitedStock) {
                              return <Badge className="bg-green-600 hover:bg-green-700">Em estoque</Badge>;
                            } else if (totalStock > 0) {
                              return (
                                <Badge 
                                  variant={totalStock <= 5 ? "destructive" : "default"}
                                  className={totalStock <= 5 ? "" : "bg-green-600 hover:bg-green-700"}
                                >
                                  {totalStock} {totalStock === 1 ? 'unidade' : 'unidades'}
                                </Badge>
                              );
                            } else {
                              return <Badge variant="secondary">Sem estoque</Badge>;
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setQuickEditProduct(product);
                                  setQuickEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edição Rápida
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar Completo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateProduct(product)} disabled={duplicating}>
                                <Copy className="h-4 w-4 mr-2" />
                                {duplicating ? 'Duplicando...' : 'Duplicar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Contador de produtos */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {filteredProducts.length} de {products.length} produtos
              {selectedProducts.size > 0 && ` • ${selectedProducts.size} selecionado(s)`}
            </p>
          </div>
        </div>
      )}

      {/* Diálogo de edição rápida */}
      <QuickEditDialog
        product={quickEditProduct}
        open={quickEditOpen}
        onOpenChange={setQuickEditOpen}
        onSave={handleQuickEdit}
      />

      {/* Diálogo de validação de importação */}
      <ImportValidationDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        validationResult={validationResult}
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setShowValidationDialog(false);
          setValidationResult(null);
        }}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? 
              Esta ação não pode ser desfeita. Todas as variações e dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteProduct(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
