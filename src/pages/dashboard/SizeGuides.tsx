import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { useSizeGuides } from '@/features/size-guides';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Ruler, Edit, Trash2, MoreHorizontal, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SizeGuideEditorDialog } from '@/features/size-guides/components/SizeGuideEditorDialog';
import { Skeleton } from '@/components/ui/skeleton';

const TEMPLATE_LABELS: Record<string, string> = {
  custom: 'Personalizado',
  polo: 'Polo / Camiseta',
  calca: 'Calça',
  vestido: 'Vestido',
  calcado: 'Calçado',
  infantil: 'Infantil',
};

export default function SizeGuides() {
  const { store } = useActiveStore();
  const { guides, isLoading, deleteGuide, duplicateGuide } = useSizeGuides(store?.id);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<string | null>(null);

  const handleEdit = (guideId: string) => {
    setEditingGuide(guideId);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setEditorOpen(true);
  };

  const handleDelete = (guideId: string) => {
    setGuideToDelete(guideId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (guideToDelete) {
      deleteGuide.mutate(guideToDelete);
    }
    setDeleteDialogOpen(false);
    setGuideToDelete(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Guias de Medidas</h1>
            <p className="text-muted-foreground">
              Crie guias de tamanhos para ajudar seus clientes a escolherem o tamanho certo
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Guia
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : guides.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ruler className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum guia criado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie seu primeiro guia de medidas para ajudar seus clientes
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Guia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Card key={guide.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        {guide.name}
                      </CardTitle>
                      {guide.description && (
                        <CardDescription className="line-clamp-2">
                          {guide.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(guide.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateGuide.mutate(guide.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(guide.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {TEMPLATE_LABELS[guide.template_type] || guide.template_type}
                    </Badge>
                    {!guide.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SizeGuideEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        guideId={editingGuide}
        storeId={store?.id}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O guia será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
