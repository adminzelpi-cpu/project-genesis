import { useState } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { useCoupons, Coupon, CouponInput } from '@/features/coupons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Coupons() {
  const { store } = useActiveStore();
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon } = useCoupons(store?.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CouponInput>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 0,
    max_discount_value: null,
    usage_limit: null,
    is_active: true,
    expires_at: null,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_value: 0,
      max_discount_value: null,
      usage_limit: null,
      is_active: true,
      expires_at: null,
    });
    setEditingCoupon(null);
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_value: coupon.min_order_value,
        max_discount_value: coupon.max_discount_value,
        usage_limit: coupon.usage_limit,
        is_active: coupon.is_active,
        expires_at: coupon.expires_at,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCoupon) {
      await updateCoupon.mutateAsync({ id: editingCoupon.id, ...formData });
    } else {
      await createCoupon.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteCoupon.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const isCouponExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false;
    return new Date(coupon.expires_at) < new Date();
  };

  const isCouponLimitReached = (coupon: Coupon) => {
    if (!coupon.usage_limit) return false;
    return coupon.usage_count >= coupon.usage_limit;
  };

  if (!store) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma loja para gerenciar cupons</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-muted-foreground">Gerencie os cupons promocionais da sua loja</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código do Cupom *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="EX: DESCONTO10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do cupom"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: 'percentage' | 'fixed') => 
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Porcentagem
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor Fixo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    min="0"
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                  <Input
                    id="min_order_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_order_value || ''}
                    onChange={(e) => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {formData.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="max_discount_value">Desconto Máximo (R$)</Label>
                    <Input
                      id="max_discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, max_discount_value: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Sem limite"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usage_limit">Limite de Uso</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="0"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ilimitado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Data de Expiração</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at ? formData.expires_at.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Cupom Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCoupon.isPending || updateCoupon.isPending}>
                  {editingCoupon ? 'Salvar' : 'Criar Cupom'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando cupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/20">
          <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Nenhum cupom criado</h3>
          <p className="text-muted-foreground text-sm mb-4">Crie seu primeiro cupom de desconto</p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Cupom
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Pedido Mín.</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                  <TableCell>
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%`
                      : formatPrice(coupon.discount_value)
                    }
                    {coupon.discount_type === 'percentage' && coupon.max_discount_value && (
                      <span className="text-xs text-muted-foreground block">
                        máx. {formatPrice(coupon.max_discount_value)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.min_order_value > 0 
                      ? formatPrice(coupon.min_order_value)
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {coupon.usage_count}
                    {coupon.usage_limit && `/${coupon.usage_limit}`}
                  </TableCell>
                  <TableCell>{formatDate(coupon.expires_at)}</TableCell>
                  <TableCell>
                    {!coupon.is_active ? (
                      <Badge variant="secondary">Inativo</Badge>
                    ) : isCouponExpired(coupon) ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : isCouponLimitReached(coupon) ? (
                      <Badge variant="outline">Limite Atingido</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(coupon.id)}
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

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
