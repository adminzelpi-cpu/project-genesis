import { useState, useMemo } from "react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { useAdminAnnouncements } from "@/features/store/hooks/useAdminAnnouncements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trash2, GripVertical, Plus, Link as LinkIcon, Save, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface AnnouncementItemProps {
  id: string;
  text: string;
  link: string | null;
  isActive: boolean;
  onUpdate: (data: { text?: string; link?: string; is_active?: boolean }) => void;
  onDelete: () => void;
}

function SortableAnnouncementItem({ id, text, link, isActive, onUpdate, onDelete }: AnnouncementItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editLink, setEditLink] = useState(link || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onUpdate({ text: editText, link: editLink || undefined });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-background border rounded-lg ${!isActive ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Texto do anúncio"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Input
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                placeholder="Link (opcional)"
                className="text-sm flex-1"
              />
              <Button size="sm" onClick={handleSave}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            <p className="text-sm font-medium truncate">{text}</p>
            {link && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <LinkIcon className="h-3 w-3" />
                {link}
              </p>
            )}
          </div>
        )}
      </div>

      <Switch
        checked={isActive}
        onCheckedChange={(checked) => onUpdate({ is_active: checked })}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function StoreAnnouncements() {
  const { store: activeStore } = useActiveStore();
  const {
    announcements,
    settings,
    isLoading,
    updateSettings,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    reorderAnnouncements,
    isUpdating,
  } = useAdminAnnouncements(activeStore?.id);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newLink, setNewLink] = useState("");

  // Local state for settings (editable before saving)
  const [localSettings, setLocalSettings] = useState<{
    enabled: boolean;
    bgColor: string;
    textColor: string;
    speed: number;
  } | null>(null);

  // Track if settings have been modified
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local settings when settings load
  useMemo(() => {
    if (settings && !localSettings) {
      setLocalSettings({
        enabled: settings.enabled,
        bgColor: settings.bgColor,
        textColor: settings.textColor,
        speed: settings.speed,
      });
    }
  }, [settings, localSettings]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = announcements.findIndex((a) => a.id === active.id);
    const newIndex = announcements.findIndex((a) => a.id === over.id);

    const newOrder = arrayMove(announcements, oldIndex, newIndex);
    reorderAnnouncements(newOrder.map((a) => a.id));
  };

  const handleAddAnnouncement = () => {
    if (!newText.trim()) return;
    createAnnouncement({ text: newText, link: newLink || undefined });
    setNewText("");
    setNewLink("");
    setAddDialogOpen(false);
  };

  const updateLocalSetting = <K extends keyof typeof localSettings>(key: K, value: NonNullable<typeof localSettings>[K]) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [key]: value });
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!localSettings || !hasChanges) return;
    setIsSaving(true);
    updateSettings(localSettings);
    setHasChanges(false);
    setIsSaving(false);
  };

  // Calculate animation duration for preview: speed 1 -> 20s, speed 160 -> 2.5s
  const previewAnimationDuration = useMemo(() => {
    const speed = localSettings?.speed || 80;
    const minDuration = 2.5;
    const maxDuration = 20;
    const normalizedSpeed = Math.max(1, Math.min(160, speed));
    return maxDuration - ((normalizedSpeed - 1) / 159) * (maxDuration - minDuration);
  }, [localSettings?.speed]);

  // Get active announcements for preview
  const activeAnnouncements = useMemo(() => 
    announcements.filter(a => a.is_active),
    [announcements]
  );

  if (isLoading || !localSettings) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Barra de Anúncios</h1>
        <p className="text-muted-foreground">
          Configure os anúncios que aparecem no topo da sua loja
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Configurações</CardTitle>
            <CardDescription>Ative e personalize a barra de anúncios</CardDescription>
          </div>
          <Button 
            onClick={handleSaveSettings} 
            disabled={!hasChanges || isSaving || isUpdating}
            className="gap-2"
          >
            {isSaving || isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar barra de anúncios</Label>
              <p className="text-sm text-muted-foreground">
                Exibe a barra no topo de todas as páginas da loja
              </p>
            </div>
            <Switch
              checked={localSettings.enabled}
              onCheckedChange={(checked) => updateLocalSetting('enabled', checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor de fundo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localSettings.bgColor}
                  onChange={(e) => updateLocalSetting('bgColor', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localSettings.bgColor}
                  onChange={(e) => updateLocalSetting('bgColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor do texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localSettings.textColor}
                  onChange={(e) => updateLocalSetting('textColor', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localSettings.textColor}
                  onChange={(e) => updateLocalSetting('textColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Velocidade da animação</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.speed <= 40 ? 'Lenta' : localSettings.speed <= 80 ? 'Normal' : localSettings.speed <= 120 ? 'Rápida' : 'Muito rápida'}
              </span>
            </div>
            <Slider
              value={[localSettings.speed]}
              onValueChange={([value]) => updateLocalSetting('speed', value)}
              min={1}
              max={160}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Arraste para ajustar a velocidade (esquerda = lento, direita = rápido)
            </p>
          </div>

          {/* Faithful Preview */}
          {localSettings.enabled && activeAnnouncements.length > 0 && (
            <div className="space-y-2">
              <Label>Pré-visualização (exatamente como aparece na loja)</Label>
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  backgroundColor: localSettings.bgColor, 
                  color: localSettings.textColor 
                }}
              >
                {activeAnnouncements.length === 1 ? (
                  // Single announcement: static centered
                  <div className="py-2 text-xs font-medium text-center">
                    {activeAnnouncements[0].text}
                  </div>
                ) : (
                  // Multiple announcements: marquee animation
                  <div className="py-2 text-xs font-medium overflow-hidden">
                    <div className="relative flex">
                      <div
                        className="animate-marquee flex shrink-0"
                        style={{ animationDuration: `${previewAnimationDuration}s` }}
                      >
                        {activeAnnouncements.map((a) => (
                          <span key={a.id} className="inline-block whitespace-nowrap mx-4 md:mx-16">
                            {a.text}
                          </span>
                        ))}
                      </div>
                      <div
                        className="animate-marquee flex shrink-0"
                        style={{ animationDuration: `${previewAnimationDuration}s` }}
                      >
                        {activeAnnouncements.map((a) => (
                          <span key={`${a.id}-dup`} className="inline-block whitespace-nowrap mx-4 md:mx-16">
                            {a.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Anúncios</CardTitle>
            <CardDescription>
              Arraste para reordenar, clique para editar
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum anúncio cadastrado</p>
              <p className="text-sm">Clique em "Adicionar" para criar seu primeiro anúncio</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={announcements.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {announcements.map((announcement) => (
                    <SortableAnnouncementItem
                      key={announcement.id}
                      id={announcement.id}
                      text={announcement.text}
                      link={announcement.link}
                      isActive={announcement.is_active}
                      onUpdate={(data) => updateAnnouncement({ id: announcement.id, data })}
                      onDelete={() => deleteAnnouncement(announcement.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Anúncio</DialogTitle>
            <DialogDescription>
              Adicione um novo anúncio à barra do topo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Texto do anúncio *</Label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Ex: Frete grátis a partir de R$ 199"
              />
            </div>
            <div className="space-y-2">
              <Label>Link (opcional)</Label>
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Ex: /categoria/promocoes"
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, o anúncio será clicável
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddAnnouncement} disabled={!newText.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}