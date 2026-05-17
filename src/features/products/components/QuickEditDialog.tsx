import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Product } from '../types';
import { toast } from '@/hooks/use-toast';
import { CategorySelector } from '@/features/categories/components/CategorySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuickEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Partial<Product>) => Promise<void>;
}

export const QuickEditDialog = ({
  product,
  open,
  onOpenChange,
  onSave,
}: QuickEditDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: 0,
    sale_price: null as number | null,
    stock_quantity: null as number | null,
    unlimited_stock: false,
    is_active: true,
    category_id: undefined as string | undefined,
    brand: '' as string,
    weight: null as number | null,
    height: null as number | null,
    width: null as number | null,
    length: null as number | null,
    meta_title: '' as string,
    meta_description: '' as string,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        price: product.price,
        sale_price: product.sale_price || null,
        stock_quantity: product.stock_quantity ?? null,
        unlimited_stock: product.stock_quantity === null || product.stock_quantity === undefined,
        is_active: product.is_active,
        category_id: (product as any).category_id || undefined,
        brand: product.brand || '',
        weight: product.weight || null,
        height: product.height || null,
        width: product.width || null,
        length: product.length || null,
        meta_title: (product as any).meta_title || '',
        meta_description: (product as any).meta_description || '',
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const dataToSave: any = {
        id: product.id,
        name: formData.name,
        slug: formData.slug,
        price: formData.price,
        sale_price: formData.sale_price,
        stock_quantity: formData.unlimited_stock ? null : (formData.stock_quantity ?? 0),
        is_active: formData.is_active,
        brand: formData.brand || null,
        weight: formData.weight,
        height: formData.height,
        width: formData.width,
        length: formData.length,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
      };

      if (formData.category_id) {
        dataToSave.category_id = formData.category_id;
      }

      await onSave(dataToSave);
      toast({
        title: 'Produto atualizado',
        description: 'As alterações foram salvas',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    const newData = { ...formData, name: value };
    // Auto-generate slug if it matches old auto-generated slug
    const autoSlug = generateSlug(formData.name);
    if (formData.slug === autoSlug || !formData.slug) {
      newData.slug = generateSlug(value);
    }
    setFormData(newData);
  };

  if (!product) return null;

  const discount = formData.sale_price && formData.price > 0
    ? Math.round(((formData.price - formData.sale_price) / formData.price) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edição Rápida
            <Badge variant={formData.is_active ? "default" : "secondary"} className="text-xs">
              {formData.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edite rapidamente as informações do produto
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="quick-name">Nome *</Label>
              <Input
                id="quick-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quick-slug">URL (slug)</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/product/</span>
                <Input
                  id="quick-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quick-price">Preço (R$) *</Label>
                <Input
                  id="quick-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="quick-sale-price" className="flex items-center gap-2">
                  Preço Promo
                  {discount !== null && discount > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal">-{discount}%</Badge>
                  )}
                </Label>
                <Input
                  id="quick-sale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_price || ''}
                  placeholder="Sem promoção"
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    sale_price: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="quick-stock">Estoque</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="unlimited-stock" className="text-xs text-muted-foreground font-normal">
                    Ilimitado
                  </Label>
                  <Switch
                    id="unlimited-stock"
                    checked={formData.unlimited_stock}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      unlimited_stock: checked,
                      stock_quantity: checked ? null : (formData.stock_quantity ?? 0),
                    })}
                  />
                </div>
              </div>
              {!formData.unlimited_stock && (
                <Input
                  id="quick-stock"
                  type="number"
                  min="0"
                  value={formData.stock_quantity ?? 0}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              )}
              {formData.unlimited_stock && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  ♾️ Estoque ilimitado — sem controle de quantidade
                </p>
              )}
            </div>

            {product.store_id && (
              <CategorySelector
                storeId={product.store_id}
                value={formData.category_id}
                onChange={(val) => setFormData({ ...formData, category_id: val })}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quick-active">Produto ativo</Label>
                <p className="text-xs text-muted-foreground">Visível na loja</p>
              </div>
              <Switch
                id="quick-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </TabsContent>

          <TabsContent value="detalhes" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="quick-brand">Marca</Label>
              <Input
                id="quick-brand"
                value={formData.brand}
                placeholder="Ex: Nike, Adidas..."
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>

            <Separator />

            <p className="text-sm font-medium">Dimensões e Peso</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quick-weight">Peso (kg)</Label>
                <Input
                  id="quick-weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight || ''}
                  placeholder="0.00"
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <Label htmlFor="quick-height">Altura (cm)</Label>
                <Input
                  id="quick-height"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.height || ''}
                  placeholder="0.0"
                  onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <Label htmlFor="quick-width">Largura (cm)</Label>
                <Input
                  id="quick-width"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.width || ''}
                  placeholder="0.0"
                  onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <Label htmlFor="quick-length">Comprimento (cm)</Label>
                <Input
                  id="quick-length"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.length || ''}
                  placeholder="0.0"
                  onChange={(e) => setFormData({ ...formData, length: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="quick-meta-title">Meta Title</Label>
              <Input
                id="quick-meta-title"
                value={formData.meta_title}
                placeholder={formData.name}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.meta_title.length}/60 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="quick-meta-desc">Meta Description</Label>
              <textarea
                id="quick-meta-desc"
                value={formData.meta_description}
                placeholder="Descrição para mecanismos de busca..."
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                maxLength={160}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.meta_description.length}/160 caracteres
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
