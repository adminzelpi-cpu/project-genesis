import { useState } from "react";
import { useActiveStore } from "@/features/stores";
import { useAttributes, useAttributeValues } from "@/features/attributes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, LogOut, Bell, Pencil, Check, X } from "lucide-react";
import { HexColorPicker } from "@/components/ui/hex-color-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";

export default function Attributes() {
  const { store } = useActiveStore();
  const { attributes, createAttribute, deleteAttribute } = useAttributes(store?.id);
  const { signOut, user } = useAuth();
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeType, setNewAttributeType] = useState<string>("custom");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateAttribute = async () => {
    if (!newAttributeName.trim()) return;

    await createAttribute({
      name: newAttributeName,
      type: newAttributeType,
    });

    setNewAttributeName("");
    setNewAttributeType("custom");
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="h-16 border-b bg-background flex items-center justify-end px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Merchant</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/30 p-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Atributos</h1>
              <p className="text-muted-foreground">
                Gerencie os atributos globais da sua loja
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Atributo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Atributo</DialogTitle>
                  <DialogDescription>
                    Adicione um novo atributo global para seus produtos
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Atributo</Label>
                    <Input
                      id="name"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      placeholder="Ex: Material, Gênero, Estilo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={newAttributeType} onValueChange={setNewAttributeType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Personalizado</SelectItem>
                        <SelectItem value="color">Cor</SelectItem>
                        <SelectItem value="size">Tamanho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateAttribute} className="w-full">
                    Criar Atributo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {attributes.map((attribute) => (
              <AttributeCard
                key={attribute.id}
                attribute={attribute}
                onDelete={() => deleteAttribute(attribute.id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AttributeCard({
  attribute,
  onDelete,
}: {
  attribute: any;
  onDelete: () => void;
}) {
  const { values, createValue, updateValue, deleteValue } = useAttributeValues(attribute.id);
  const [newValue, setNewValue] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [isAddingValue, setIsAddingValue] = useState(false);

  const handleAddValue = async () => {
    if (!newValue.trim()) return;

    await createValue({
      value: newValue,
      color_hex: attribute.type === "color" ? newColorHex : undefined,
    });

    setNewValue("");
    setNewColorHex("#000000");
    setIsAddingValue(false);
  };

  const getTypeBadge = () => {
    const typeMap = {
      color: { label: "Cor", variant: "default" as const },
      size: { label: "Tamanho", variant: "secondary" as const },
      custom: { label: "Personalizado", variant: "outline" as const },
    };
    const type = typeMap[attribute.type as keyof typeof typeMap] || typeMap.custom;
    return <Badge variant={type.variant}>{type.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {attribute.name}
              {getTypeBadge()}
            </CardTitle>
            <CardDescription>{values.length} valores</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <EditableValueChip
                key={value.id}
                value={value}
                attributeType={attribute.type}
                onUpdate={updateValue}
                onDelete={() => deleteValue(value.id)}
              />
            ))}
          </div>

          <Separator />

          {isAddingValue ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Novo valor"
                  onKeyDown={(e) => e.key === "Enter" && handleAddValue()}
                />
                {attribute.type === "color" && (
                  <HexColorPicker
                    value={newColorHex}
                    onChange={setNewColorHex}
                    swatchOnly
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddValue} size="sm">Adicionar</Button>
                <Button onClick={() => setIsAddingValue(false)} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsAddingValue(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Valor
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditableValueChip({
  value,
  attributeType,
  onUpdate,
  onDelete,
}: {
  value: any;
  attributeType: string;
  onUpdate: (data: { id: string; value: string; color_hex?: string | null; size_category?: string | null }) => Promise<any>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(value.value);
  const [editColorHex, setEditColorHex] = useState(value.color_hex || "#000000");
  const [editSizeCategory, setEditSizeCategory] = useState(value.size_category || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditName(value.value);
      setEditColorHex(value.color_hex || "#000000");
      setEditSizeCategory(value.size_category || "");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate({
        id: value.id,
        value: editName.trim(),
        color_hex: attributeType === "color" ? editColorHex : undefined,
        size_category: attributeType === "size" ? (editSizeCategory || null) : undefined,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="group flex items-center gap-2 bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors border border-transparent hover:border-border cursor-pointer"
        >
          {attributeType === "color" && value.color_hex && (
            <div
              className="w-5 h-5 rounded-full border border-border shadow-sm"
              style={{ backgroundColor: value.color_hex }}
            />
          )}
          <span className="text-sm font-medium">{value.value}</span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Editar valor</p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome do valor"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>

          {attributeType === "color" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tom da cor</Label>
              <HexColorPicker
                value={editColorHex}
                onChange={setEditColorHex}
              />
            </div>
          )}

          {attributeType === "size" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={editSizeCategory} onValueChange={setEditSizeCategory}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adulto">Adulto</SelectItem>
                  <SelectItem value="calca">Calça</SelectItem>
                  <SelectItem value="infantil">Infantil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
