import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Plus, Check, Pencil, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedAddress {
  id: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  is_default: boolean | null;
}

interface SavedAddressSelectorProps {
  addresses: SavedAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: SavedAddress | null) => void;
  onAddNewAddress: () => void;
  onAddressUpdated?: (updatedAddress: SavedAddress) => void;
}

export function SavedAddressSelector({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddNewAddress,
  onAddressUpdated,
}: SavedAddressSelectorProps) {
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    is_default: false,
    noNumber: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const streetRef = useRef<HTMLInputElement>(null);

  // Focus on street field when editing starts
  useEffect(() => {
    if (editingAddressId && streetRef.current) {
      setTimeout(() => {
        streetRef.current?.focus();
      }, 100);
    }
  }, [editingAddressId]);

  const handleStartEdit = (address: SavedAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddressId(address.id);
    setEditFormData({
      rua: address.rua,
      numero: address.numero,
      complemento: address.complemento || '',
      bairro: address.bairro,
      is_default: address.is_default || false,
      noNumber: address.numero === 'S/N',
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddressId(null);
    setEditFormData({
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      is_default: false,
      noNumber: false,
    });
  };

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingAddressId) return;

    // Validate required fields
    if (!editFormData.rua.trim()) {
      toast.error('Preencha o endereço');
      return;
    }
    if (!editFormData.numero.trim() && !editFormData.noNumber) {
      toast.error('Preencha o número');
      return;
    }
    if (!editFormData.bairro.trim()) {
      toast.error('Preencha o bairro');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customer_addresses')
        .update({
          rua: editFormData.rua,
          numero: editFormData.noNumber ? 'S/N' : editFormData.numero,
          complemento: editFormData.complemento || null,
          bairro: editFormData.bairro,
          is_default: editFormData.is_default,
        })
        .eq('id', editingAddressId);

      if (error) throw error;

      // Find the original address and create updated version
      const originalAddress = addresses.find(a => a.id === editingAddressId);
      if (originalAddress && onAddressUpdated) {
        const updatedAddress: SavedAddress = {
          ...originalAddress,
          rua: editFormData.rua,
          numero: editFormData.noNumber ? 'S/N' : editFormData.numero,
          complemento: editFormData.complemento || null,
          bairro: editFormData.bairro,
          is_default: editFormData.is_default,
        };
        onAddressUpdated(updatedAddress);
      }

      toast.success('Endereço atualizado!');
      setEditingAddressId(null);
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInputChange = (field: keyof typeof editFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;
          const isEditing = editingAddressId === address.id;
          
          return (
            <div key={address.id}>
              <button
                type="button"
                onClick={() => {
                  if (!isEditing) {
                    onSelectAddress(address);
                  }
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  isSelected
                    ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                    : "border-checkout-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                    isSelected ? "border-foreground bg-foreground" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-background" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {address.rua}, {address.numero}
                        {address.complemento && ` - ${address.complemento}`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {address.bairro} - {address.cidade}/{address.estado}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CEP: {address.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {address.is_default && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        Padrão
                      </span>
                    )}
                    {isSelected && !isEditing && (
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(address, e)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </button>

              {/* Inline Edit Form */}
              {isEditing && (
                <div className="mt-2 p-4 border border-checkout-border rounded-lg bg-muted/30 space-y-4">
                  <div className="flex gap-4">
                    <div className="space-y-2" style={{ width: '65%' }}>
                      <Label htmlFor="edit-street" className="text-sm font-medium text-checkout-title">
                        Endereço
                      </Label>
                      <Input
                        id="edit-street"
                        ref={streetRef}
                        placeholder="Rua, Avenida, etc."
                        value={editFormData.rua}
                        onChange={handleEditInputChange('rua')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                    </div>
                    <div className="space-y-2" style={{ width: '35%' }}>
                      <Label htmlFor="edit-number" className="text-sm font-medium text-checkout-title">
                        Número
                      </Label>
                      <Input
                        id="edit-number"
                        placeholder="Ex: 123"
                        disabled={editFormData.noNumber}
                        value={editFormData.numero}
                        onChange={handleEditInputChange('numero')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-noNumber"
                          checked={editFormData.noNumber}
                          onCheckedChange={(checked) => {
                            setEditFormData(prev => ({
                              ...prev,
                              noNumber: checked as boolean,
                              numero: checked ? 'S/N' : '',
                            }));
                          }}
                        />
                        <label htmlFor="edit-noNumber" className="text-sm text-muted-foreground cursor-pointer">
                          Sem número
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2" style={{ width: '50%' }}>
                      <Label htmlFor="edit-complement" className="text-sm font-medium text-checkout-title">
                        Complemento (opcional)
                      </Label>
                      <Input
                        id="edit-complement"
                        placeholder="Apto, bloco, referência"
                        value={editFormData.complemento}
                        onChange={handleEditInputChange('complemento')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                    </div>
                    <div className="space-y-2" style={{ width: '50%' }}>
                      <Label htmlFor="edit-neighborhood" className="text-sm font-medium text-checkout-title">
                        Bairro
                      </Label>
                      <Input
                        id="edit-neighborhood"
                        placeholder="Nome do bairro"
                        value={editFormData.bairro}
                        onChange={handleEditInputChange('bairro')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-default"
                      checked={editFormData.is_default}
                      onCheckedChange={(checked) => {
                        setEditFormData(prev => ({ ...prev, is_default: checked as boolean }));
                      }}
                    />
                    <label htmlFor="edit-default" className="text-sm text-foreground cursor-pointer">
                      Definir como endereço padrão
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new address option */}
        <button
          type="button"
          onClick={onAddNewAddress}
          className="w-full text-left p-3 rounded-lg border border-dashed border-checkout-border hover:border-muted-foreground/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
            
            <span className="font-medium text-sm text-muted-foreground">
              Adicionar novo endereço
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
