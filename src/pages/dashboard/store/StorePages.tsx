import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { useStorePages, type StorePage } from "@/features/store/hooks/useStorePages";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StorePages() {
  const navigate = useNavigate();
  const { store } = useActiveStore();
  const { pages, isLoading, deletePage, togglePublish } = useStorePages();
  const [pageToDelete, setPageToDelete] = useState<StorePage | null>(null);

  const handleDelete = async () => {
    if (pageToDelete) {
      await deletePage.mutateAsync(pageToDelete.id);
      setPageToDelete(null);
    }
  };

  const handleTogglePublish = async (page: StorePage) => {
    await togglePublish.mutateAsync({ id: page.id, is_published: !page.is_published });
  };

  // Empty state
  if (!isLoading && pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Páginas</h1>
            <p className="text-muted-foreground">
              Crie páginas institucionais para sua loja
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/store/pages/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Criar página
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Fale sobre sua marca</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Crie páginas de conteúdo para contar sua história, benefícios da sua marca
              ou como seus clientes podem pagar e receber suas compras.
            </p>
            <Button onClick={() => navigate("/dashboard/store/pages/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Criar página
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
          <h1 className="text-3xl font-bold">Páginas</h1>
          <p className="text-muted-foreground">
            Gerencie as páginas institucionais da sua loja
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/store/pages/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Criar página
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      /page/{page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={page.is_published ? "default" : "secondary"}>
                        {page.is_published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(page.updated_at), "dd MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/dashboard/store/pages/${page.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(page)}>
                            {page.is_published ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Despublicar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Publicar
                              </>
                            )}
                          </DropdownMenuItem>
                          {page.is_published && store?.slug && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/store/${store.slug}/page/${page.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver na loja
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setPageToDelete(page)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!pageToDelete} onOpenChange={() => setPageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a página "{pageToDelete?.title}"? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
