import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Upload, Trash2, MoreHorizontal } from 'lucide-react';
import { Product } from '../types';
import { useProductImportExport } from '../hooks/useProductImportExport';

interface ProductTableActionsProps {
  selectedProducts: Product[];
  allProducts: Product[];
  onImport: (products: any[]) => void;
  onDeleteSelected: () => void;
}

export const ProductTableActions = ({
  selectedProducts,
  allProducts,
  onImport,
  onDeleteSelected,
}: ProductTableActionsProps) => {
  const { exportToCSV, importFromCSV, importing, exporting } = useProductImportExport();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importFromCSV(file, onImport);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const productsToExport = selectedProducts.length > 0 ? selectedProducts : allProducts;
    exportToCSV(productsToExport);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleImport}
          disabled={importing}
        >
          <Upload className="h-4 w-4 mr-2" />
          {importing ? 'Importando...' : 'Importar CSV'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || allProducts.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exportando...' : `Exportar ${selectedProducts.length > 0 ? `(${selectedProducts.length})` : 'Todos'}`}
        </Button>

        {selectedProducts.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar ({selectedProducts.length})
          </Button>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {selectedProducts.length} produto(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected();
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
