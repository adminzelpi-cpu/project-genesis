import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveStore } from "@/features/stores";
import { useCategories } from "@/features/categories";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { CategoryInitialDialog } from "@/features/categories/components/CategoryInitialDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ProductCategory } from "@/features/categories";
import { supabase } from "@/integrations/supabase/client";

interface CategoryRow extends ProductCategory {
  depth: number;
}

/** Build a depth-first ordered list with depth so we can render hierarchy via indentation */
function buildHierarchy(categories: ProductCategory[]): CategoryRow[] {
  const byParent = new Map<string | null, ProductCategory[]>();
  categories.forEach((c) => {
    const key = c.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  });

  const result: CategoryRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) || [];
    children.forEach((c) => {
      result.push({ ...c, depth });
      visit(c.id, depth + 1);
    });
  };
  visit(null, 0);
  // Append any orphans whose parent was not found in the list (safety)
  const seen = new Set(result.map((r) => r.id));
  categories.forEach((c) => {
    if (!seen.has(c.id)) result.push({ ...c, depth: 0 });
  });
  return result;
}

export default function Categories() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { store: activeStore } = useActiveStore();
  const { getStoreCategories, deleteCategory, getProductCountByCategory, loading } =
    useCategories();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [initialDialogOpen, setInitialDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = async () => {
    if (!activeStore?.id) return;
    const data = await getStoreCategories(activeStore.id, { includeInactive: true });
    setCategories(data);
    if (data.length > 0) {
      const counts = await getProductCountByCategory(
        activeStore.id,
        data.map((c) => c.id)
      );
      setProductCounts(counts);
    } else {
      setProductCounts({});
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id]);

  const orderedCategories = useMemo(() => buildHierarchy(categories), [categories]);

  const handleCreate = () => setInitialDialogOpen(true);

  const handleGenerateWithAI = async (name: string, shortDesc: string) => {
    if (!activeStore?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke("generate-product-content", {
        body: { productName: name, shortDescription: shortDesc },
      });

      if (error) throw error;

      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: newCategory, error: insertError } = await supabase
        .from("product_categories")
        .insert({
          name,
          slug,
          description: data?.fullDescription || shortDesc,
          seo_title: data?.metaTitle || name,
          seo_description: data?.metaDescription || shortDesc,
          store_id: activeStore.id,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Categoria criada com IA!");
      navigate(`/dashboard/categories/${newCategory.id}/edit`);
    } catch (error) {
      console.error("Erro ao gerar categoria:", error);
      toast.error("Erro ao gerar categoria com IA. Tente criar manualmente.");
    }
  };

  const handleEdit = (category: ProductCategory) => {
    navigate(`/dashboard/categories/${category.id}/edit`);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !activeStore?.id) return;
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id, activeStore.id);
      setCategoryToDelete(null);
      await loadCategories();
    } catch {
      // toast handled in hook
    } finally {
      setDeleting(false);
    }
  };

  const deletingCount = categoryToDelete ? productCounts[categoryToDelete.id] ?? 0 : 0;
  const deletingChildrenCount = categoryToDelete
    ? categories.filter((c) => c.parent_id === categoryToDelete.id).length
    : 0;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as categorias e subcategorias dos seus produtos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {!activeStore ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">
            Selecione uma loja para gerenciar categorias
          </p>
        </div>
      ) : loading && categories.length === 0 ? (
        <div className="text-center py-12">
          <p>Carregando categorias...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground mb-4">Nenhuma categoria cadastrada</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div
                      className="flex items-center"
                      style={{ paddingLeft: `${category.depth * 20}px` }}
                    >
                      {category.depth > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                      )}
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {productCounts[category.id] ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCategoryToDelete(category)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Excluir ${category.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryInitialDialog
        open={initialDialogOpen}
        onClose={() => setInitialDialogOpen(false)}
        onGenerate={handleGenerateWithAI}
      />

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir categoria "{categoryToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esta ação não pode ser desfeita. <strong>Os produtos não serão excluídos</strong> —
                  apenas perderão o vínculo com esta categoria.
                </p>
                {deletingCount > 0 && (
                  <p className="text-foreground">
                    <strong>{deletingCount}</strong>{" "}
                    {deletingCount === 1 ? "produto será desvinculado" : "produtos serão desvinculados"}.
                  </p>
                )}
                {deletingChildrenCount > 0 && (
                  <p className="text-foreground">
                    <strong>{deletingChildrenCount}</strong>{" "}
                    {deletingChildrenCount === 1
                      ? "subcategoria será movida"
                      : "subcategorias serão movidas"}{" "}
                    para o nível principal.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir categoria"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
