import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '../hooks/useCategories';

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId: string;
}

export const CategoryDialog = ({ open, onClose, onSuccess, storeId }: CategoryDialogProps) => {
  const { createCategory, loading } = useCategories();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    google_category: '',
    seo_title: '',
    seo_description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      await createCategory({
        ...formData,
        slug,
        store_id: storeId,
        is_active: true,
      });
      
      setFormData({
        name: '',
        description: '',
        google_category: '',
        seo_title: '',
        seo_description: '',
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Categoria</DialogTitle>
          <DialogDescription>
            Organize seus produtos criando categorias e subcategorias para ajudar clientes a encontrarem o que buscam rapidamente!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Informações da Categoria</h3>
            
            <div>
              <Label htmlFor="category-name">Nome *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Eletrônicos"
                required
              />
            </div>

            <div>
              <Label htmlFor="category-desc">Descrição</Label>
              <Textarea
                id="category-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da categoria..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Google Shopping</h3>
            <p className="text-sm text-muted-foreground">
              Aumente a relevância dos seus produtos nos buscadores Google.
            </p>
            
            <div>
              <Label htmlFor="google-category">Categoria do Google Shopping</Label>
              <Input
                id="google-category"
                value={formData.google_category}
                onChange={(e) => setFormData({ ...formData, google_category: e.target.value })}
                placeholder="Ex: Vestuário e acessórios > Roupas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O texto deve ser igual ao do{' '}
                <a 
                  href="https://support.google.com/merchants/answer/6324436" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">SEO</h3>
            
            <div>
              <Label htmlFor="seo-title">Título SEO</Label>
              <Input
                id="seo-title"
                value={formData.seo_title}
                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                placeholder="Ex: Comprar celular"
                maxLength={60}
              />
            </div>

            <div>
              <Label htmlFor="seo-desc">Descrição SEO</Label>
              <Textarea
                id="seo-desc"
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                placeholder="Descrição para buscadores..."
                maxLength={160}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
