import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Menu, GripVertical, Edit, Trash2, ExternalLink, Link, FolderSync, Loader2, ChevronRight, ChevronDown, Lock, HelpCircle, Building2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStoreMenus, type StoreMenuItem, type MenuWithItems } from "@/features/store/hooks/useStoreMenus";
import { useStorePages } from "@/features/store/hooks/useStorePages";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

// ===================== TREE UTILITIES =====================

interface FlatItem {
  item: StoreMenuItem;
  depth: number;
  index: number;
  parentId: string | null;
  childCount: number;
}

function flattenTree(items: StoreMenuItem[]): FlatItem[] {
  const result: FlatItem[] = [];
  const childrenMap = new Map<string, StoreMenuItem[]>();

  // Build children map
  items.forEach((item) => {
    const parentId = item.parent_id || "__root__";
    const list = childrenMap.get(parentId) || [];
    list.push(item);
    childrenMap.set(parentId, list);
  });

  // Sort children by position
  childrenMap.forEach((children) => {
    children.sort((a, b) => a.position - b.position);
  });

  function traverse(parentId: string, depth: number) {
    const children = childrenMap.get(parentId) || [];
    children.forEach((item) => {
      const itemChildren = childrenMap.get(item.id) || [];
      result.push({
        item,
        depth,
        index: result.length,
        parentId: parentId === "__root__" ? null : parentId,
        childCount: itemChildren.length,
      });
      traverse(item.id, depth + 1);
    });
  }

  traverse("__root__", 0);
  return result;
}

function getDescendantIds(items: StoreMenuItem[], parentId: string): string[] {
  const ids: string[] = [];
  const children = items.filter((i) => i.parent_id === parentId);
  children.forEach((child) => {
    ids.push(child.id);
    ids.push(...getDescendantIds(items, child.id));
  });
  return ids;
}

// Compute new parent from projected depth after drag
function getProjectedParent(
  flatItems: FlatItem[],
  activeId: string,
  overId: string,
  projectedDepth: number
): string | null {
  const overIndex = flatItems.findIndex((f) => f.item.id === overId);
  if (overIndex < 0) return null;

  // Walk upward from overIndex to find valid parent at projectedDepth
  if (projectedDepth === 0) return null;

  // The parent should be the closest item above with depth === projectedDepth - 1
  for (let i = overIndex; i >= 0; i--) {
    if (flatItems[i].item.id === activeId) continue;
    if (flatItems[i].depth === projectedDepth - 1) {
      return flatItems[i].item.id;
    }
    if (flatItems[i].depth < projectedDepth - 1) {
      // Can't go deeper than parent + 1
      return flatItems[i].item.id;
    }
  }

  return null;
}

const INDENT_PX = 32;

// ===================== SORTABLE ITEM =====================

function SortableMenuItem({
  flatItem,
  onEdit,
  onDelete,
  onAddChild,
  isOverlay = false,
  projectedDepth,
  isCollapsed,
  onToggleCollapse,
}: {
  flatItem: FlatItem;
  onEdit: (item: StoreMenuItem) => void;
  onDelete: (item: StoreMenuItem) => void;
  onAddChild?: (parentId: string) => void;
  isOverlay?: boolean;
  projectedDepth?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
}) {
  const { item, depth, childCount } = flatItem;
  const displayDepth = projectedDepth ?? depth;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: isOverlay ? 0 : `${displayDepth * INDENT_PX}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-md border",
        isDragging ? "opacity-30" : "bg-muted/50",
        isOverlay && "shadow-lg bg-background border-primary/50",
        displayDepth > 0 && !isOverlay && "border-l-2 border-l-primary/20"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {childCount > 0 && onToggleCollapse && (
        <button
          onClick={() => onToggleCollapse(item.id)}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {childCount > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
              {childCount}
            </span>
          )}
        </div>
        {item.url && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Link className="h-3 w-3 flex-shrink-0" />
            {item.url}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {item.open_in_new_tab && (
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        )}
        {item.is_system && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Auto</span>
        )}
        {!item.is_system && onAddChild && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Adicionar sub-item"
            onClick={() => onAddChild(item.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        {!item.is_system && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
        {!item.is_system && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ===================== MENU CARD =====================

function MenuCard({
  menu,
  onAddItem,
  onAddChildItem,
  onEditItem,
  onDeleteItem,
  onUpdateTree,
  onSyncCategories,
  isSyncing,
}: {
  menu: MenuWithItems;
  onAddItem: (menuId: string, footerSection?: "help" | "institutional" | null) => void;
  onAddChildItem: (menuId: string, parentId: string) => void;
  onEditItem: (item: StoreMenuItem) => void;
  onDeleteItem: (item: StoreMenuItem) => void;
  onUpdateTree: (menuId: string, updates: { id: string; parent_id: string | null; position: number }[]) => void;
  onSyncCategories?: (menuId: string) => void;
  isSyncing?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const pointerXRef = useRef(0);
  const snappedDepthRef = useRef(0);
  const snappedAnchorXRef = useRef(0); // X position when depth last snapped

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeOriginalDepth, setActiveOriginalDepth] = useState(0);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Track global pointer position for depth calculation
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const flatItems = useMemo(() => flattenTree(menu.items), [menu.items]);

  // Filter out collapsed children
  const visibleItems = useMemo(() => {
    const hiddenIds = new Set<string>();
    
    collapsedIds.forEach((collapsedId) => {
      const descendants = getDescendantIds(menu.items, collapsedId);
      descendants.forEach((id) => hiddenIds.add(id));
    });

    // Also hide descendants of dragged item
    if (activeId) {
      const descendants = getDescendantIds(menu.items, activeId);
      descendants.forEach((id) => hiddenIds.add(id));
    }

    return flatItems.filter((f) => !hiddenIds.has(f.item.id));
  }, [flatItems, collapsedIds, activeId, menu.items]);

  const activeItem = flatItems.find((f) => f.item.id === activeId);

  // Hysteresis snapping: once snapped to a depth, require extra movement to change
  const SNAP_THRESHOLD = INDENT_PX * 0.6; // ~19px to break out of current snap

  const projectedDepth = useMemo(() => {
    if (!activeId || !overId) return 0;

    const overIndex = visibleItems.findIndex((f) => f.item.id === overId);
    if (overIndex < 0) return 0;

    // How far from the snap anchor point
    const deltaFromSnap = pointerXRef.current - snappedAnchorXRef.current;
    let newDepth = snappedDepthRef.current;

    // Only change depth if cursor moved past the threshold from last snap point
    if (deltaFromSnap > SNAP_THRESHOLD) {
      const levels = Math.floor((deltaFromSnap - SNAP_THRESHOLD) / INDENT_PX) + 1;
      newDepth = snappedDepthRef.current + levels;
    } else if (deltaFromSnap < -SNAP_THRESHOLD) {
      const levels = Math.floor((-deltaFromSnap - SNAP_THRESHOLD) / INDENT_PX) + 1;
      newDepth = snappedDepthRef.current - levels;
    }

    // Max depth: previous non-active item's depth + 1
    let maxDepth = 0;
    for (let i = overIndex; i >= 0; i--) {
      if (visibleItems[i].item.id !== activeId) {
        maxDepth = visibleItems[i].depth + 1;
        break;
      }
    }

    const clampedDepth = Math.max(0, Math.min(maxDepth, newDepth));

    // Update snap anchor when depth actually changes
    if (clampedDepth !== snappedDepthRef.current) {
      snappedDepthRef.current = clampedDepth;
      snappedAnchorXRef.current = pointerXRef.current;
    }

    return clampedDepth;
  }, [activeId, overId, visibleItems]);

  // Parent item for current projected depth
  const projectedParentId = useMemo((): string | null => {
    if (!activeId || !overId || projectedDepth === 0) return null;
    const overIndex = visibleItems.findIndex((f) => f.item.id === overId);
    for (let i = overIndex; i >= 0; i--) {
      if (visibleItems[i].item.id === activeId) continue;
      if (visibleItems[i].depth === projectedDepth - 1) {
        return visibleItems[i].item.id;
      }
      if (visibleItems[i].depth < projectedDepth - 1) {
        return visibleItems[i].item.id;
      }
    }
    return null;
  }, [activeId, overId, projectedDepth, visibleItems]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    const item = flatItems.find((f) => f.item.id === id);
    const depth = item?.depth ?? 0;
    setActiveOriginalDepth(depth);
    // Initialize snap state
    snappedDepthRef.current = depth;
    snappedAnchorXRef.current = pointerXRef.current;
    dragStartXRef.current = pointerXRef.current;
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      setOverId(String(event.over.id));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (!over || !activeId) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const overId = String(over.id);
    const overItemFlat = visibleItems.find((f) => f.item.id === overId);
    if (!overItemFlat) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    // Use the projected values computed from absolute pointer position
    const finalDepth = projectedDepth;
    const newParentId = projectedParentId;

    // Get all items without the active item's subtree
    const descendantIds = getDescendantIds(menu.items, activeId);

    // Build flat list of non-active, non-descendant items
    const withoutActive = visibleItems.filter(
      (f) => f.item.id !== activeId && !descendantIds.includes(f.item.id)
    );
    const insertAfterIdx = withoutActive.findIndex((f) => f.item.id === overId);

    // Build position updates per sibling group
    const updates: { id: string; parent_id: string | null; position: number }[] = [];

    // Siblings in the new parent group (excluding active)
    const siblings = menu.items
      .filter((i) => (i.parent_id ?? null) === newParentId && i.id !== activeId)
      .sort((a, b) => a.position - b.position);

    // Insert active after the over item if it's a sibling, otherwise at end
    const overIsSibling = siblings.some((s) => s.id === overId);
    const overItem = siblings.find((s) => s.id === overId);

    let pos = 0;
    let activeInserted = false;

    if (overIsSibling) {
      siblings.forEach((s) => {
        if (s.id === overId) {
          updates.push({ id: s.id, parent_id: newParentId, position: pos++ });
          updates.push({ id: activeId, parent_id: newParentId, position: pos++ });
          activeInserted = true;
        } else {
          updates.push({ id: s.id, parent_id: newParentId, position: pos++ });
        }
      });
      if (!activeInserted) {
        updates.push({ id: activeId, parent_id: newParentId, position: pos });
      }
    } else {
      // Active becomes child of newParentId; insert at position after over or at end
      const overInParentGroup = menu.items.find(
        (i) => i.id === overId && (i.parent_id ?? null) === newParentId
      );
      // Place at end of siblings
      updates.push({ id: activeId, parent_id: newParentId, position: siblings.length });
      // Re-normalize siblings positions
      siblings.forEach((s, i) => {
        updates.push({ id: s.id, parent_id: newParentId, position: i });
      });
    }

    onUpdateTree(menu.id, updates);

    setActiveId(null);
    setOverId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const locationLabels: Record<string, string> = {
    header: "Cabeçalho da loja",
    footer: "Rodapé da loja",
    sidebar: "Barra lateral",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              {menu.name}
            </CardTitle>
            <CardDescription>{locationLabels[menu.location]}</CardDescription>
          </div>
          {menu.location === "header" && onSyncCategories && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSyncCategories(menu.id)}
              disabled={isSyncing}
              className="gap-2"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />}
              Importar categorias
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {menu.location === "footer" ? (
          (() => {
            // Filter items by section
            const helpItems = menu.items.filter(item => item.footer_section === "help");
            const institutionalItems = menu.items.filter(item => item.footer_section === "institutional" || !item.footer_section);
            const helpFlatItems = flattenTree(helpItems);
            const institutionalFlatItems = flattenTree(institutionalItems);
            
            return (
              <div className="space-y-6">
                {/* Fixed Section: Precisa de Ajuda? */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Precisa de Ajuda?</span>
                  </div>
                  
                  {/* System items */}
                  <div className="space-y-1.5">
                    {[
                      { title: "Acompanhe seu Pedido", url: "/customer/orders" },
                      { title: "Fale Conosco", url: "/contato" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Link className="h-3 w-3 shrink-0" />
                            {item.url}
                          </p>
                        </div>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">Sistema</span>
                      </div>
                    ))}
                    
                    {/* Custom help items */}
                    {helpFlatItems.map((flatItem) => (
                      <SortableMenuItem
                        key={flatItem.item.id}
                        flatItem={flatItem}
                        onEdit={onEditItem}
                        onDelete={onDeleteItem}
                      />
                    ))}
                  </div>

                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onAddItem(menu.id, "help")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar item
                  </Button>
                </div>

                {/* Divider */}
                <div className="border-t" />

                {/* Fixed Section: Institucional */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Institucional</span>
                  </div>
                  
                  {/* Editable menu items (policies + custom) */}
                  {institutionalItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {institutionalFlatItems.map((flatItem) => (
                        <SortableMenuItem
                          key={flatItem.item.id}
                          flatItem={flatItem}
                          onEdit={onEditItem}
                          onDelete={onDeleteItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-muted-foreground">
                      <p className="text-xs">As políticas legais aparecerão aqui automaticamente</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onAddItem(menu.id, "institutional")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar item
                  </Button>
                </div>
              </div>
            );
          })()
        ) : (
          <>
            {menu.items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Nenhum item no menu</p>
                {menu.location === "header" && onSyncCategories && (
                  <p className="text-xs mt-1">Use "Importar categorias" para popular automaticamente</p>
                )}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              >
                <SortableContext items={visibleItems.map((f) => f.item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5" ref={containerRef}>
                    {visibleItems.map((flatItem) => {
                      const isOver = activeId && overId === flatItem.item.id;
                      const isActive = activeId === flatItem.item.id;
                      return (
                        <div key={flatItem.item.id} className="relative">
                          {isOver && !isActive && (
                            <div
                              className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded z-10 pointer-events-none"
                              style={{ marginLeft: `${projectedDepth * INDENT_PX}px` }}
                            >
                              {projectedParentId && (
                                <span className="absolute -top-5 left-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                                  ↳ sub-item de "{visibleItems.find(f => f.item.id === projectedParentId)?.item.title}"
                                </span>
                              )}
                            </div>
                          )}
                          <SortableMenuItem
                            flatItem={flatItem}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                            onAddChild={(parentId) => onAddChildItem(menu.id, parentId)}
                            projectedDepth={isActive ? projectedDepth : undefined}
                            isCollapsed={collapsedIds.has(flatItem.item.id)}
                            onToggleCollapse={toggleCollapse}
                          />
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeItem ? (
                    <SortableMenuItem
                      flatItem={{ ...activeItem, depth: 0 }}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <GripVertical className="h-3 w-3" />
              <span>Arraste para reordenar. Mova o cursor para a direita para criar sub-menus.</span>
            </div>

            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onAddItem(menu.id)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar item
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== MAIN PAGE =====================


export default function StoreMenus() {
  const { menus, isLoading, createDefaultMenus, createMenuItem, updateMenuItem, deleteMenuItem, reorderItems } =
    useStoreMenus();
  const { pages } = useStorePages();
  const { store } = useActiveStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreMenuItem | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [deleteItemState, setDeleteItemState] = useState<StoreMenuItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    url: "",
    link_type: "custom" as "custom" | "page" | "category" | "product",
    link_reference_id: "",
    open_in_new_tab: false,
    parent_id: null as string | null,
    footer_section: null as "help" | "institutional" | null,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories-for-menu", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, slug, parent_id")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as CategoryOption[];
    },
    enabled: !!store?.id,
  });

  useEffect(() => {
    if (!isLoading && menus.length === 0) {
      createDefaultMenus.mutate();
    }
  }, [isLoading, menus.length]);

  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      link_type: "custom",
      link_reference_id: "",
      open_in_new_tab: false,
      parent_id: null,
      footer_section: null,
    });
    setEditingItem(null);
    setSelectedMenuId(null);
  };

  const handleOpenDialog = (menuId: string, item?: StoreMenuItem, parentId?: string, footerSection?: "help" | "institutional" | null) => {
    setSelectedMenuId(menuId);
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        url: item.url || "",
        link_type: item.link_type as any,
        link_reference_id: item.link_reference_id || "",
        open_in_new_tab: item.open_in_new_tab,
        parent_id: item.parent_id,
        footer_section: item.footer_section,
      });
    } else {
      resetForm();
      if (parentId) {
        setFormData((prev) => ({ ...prev, parent_id: parentId }));
      }
      if (footerSection) {
        setFormData((prev) => ({ ...prev, footer_section: footerSection }));
      }
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Get all items of the selected menu for parent selector (exclude editing item and its descendants)
  const selectedMenuItems = useMemo(() => {
    if (!selectedMenuId) return [];
    const menu = menus.find((m) => m.id === selectedMenuId);
    if (!menu) return [];
    const excludeIds = new Set<string>();
    if (editingItem) {
      excludeIds.add(editingItem.id);
      getDescendantIds(menu.items, editingItem.id).forEach((id) => excludeIds.add(id));
    }
    return flattenTree(menu.items).filter((f) => !excludeIds.has(f.item.id));
  }, [selectedMenuId, menus, editingItem]);

  const handleSubmit = async () => {
    if (!formData.title) return;

    let finalUrl = formData.url;

    if (formData.link_type === "page" && formData.link_reference_id) {
      const page = pages.find((p) => p.id === formData.link_reference_id);
      if (page) finalUrl = `/page/${page.slug}`;
    }

    if (formData.link_type === "category" && formData.link_reference_id) {
      const cat = categories.find((c) => c.id === formData.link_reference_id);
      if (cat) finalUrl = `/category/${cat.slug}`;
    }

    if (editingItem) {
      await updateMenuItem.mutateAsync({
        id: editingItem.id,
        title: formData.title,
        url: finalUrl,
        link_type: formData.link_type,
        link_reference_id: formData.link_reference_id || null,
        open_in_new_tab: formData.open_in_new_tab,
        parent_id: formData.parent_id,
        footer_section: formData.footer_section,
      });
    } else if (selectedMenuId) {
      await createMenuItem.mutateAsync({
        menu_id: selectedMenuId,
        title: formData.title,
        url: finalUrl,
        link_type: formData.link_type,
        link_reference_id: formData.link_reference_id || undefined,
        open_in_new_tab: formData.open_in_new_tab,
        parent_id: formData.parent_id,
        footer_section: formData.footer_section,
      });
    }

    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!deleteItemState) return;

    const menu = menus.find((m) => m.id === deleteItemState.menu_id);
    const descendantIds = getDescendantIds(menu?.items || [], deleteItemState.id);

    // Delete descendants first (deepest first)
    for (const id of descendantIds.reverse()) {
      await deleteMenuItem.mutateAsync(id);
    }
    await deleteMenuItem.mutateAsync(deleteItemState.id);
    setDeleteItemState(null);
  };

  const handleUpdateTree = async (
    menuId: string,
    updates: { id: string; parent_id: string | null; position: number }[]
  ) => {
    // Update parent_id and positions in batch
    for (const update of updates) {
      await updateMenuItem.mutateAsync({
        id: update.id,
        parent_id: update.parent_id,
        position: update.position,
      });
    }
  };

  const handleSyncCategories = async (menuId: string) => {
    if (!store?.id || categories.length === 0) {
      toast.error("Nenhuma categoria ativa encontrada para importar.");
      return;
    }

    setIsSyncing(true);
    try {
      const menu = menus.find((m) => m.id === menuId);
      const existingItems = menu?.items || [];
      
      // Map existing menu items by category reference id
      const existingByCategoryId = new Map<string, string>();
      existingItems.forEach((item) => {
        if (item.link_type === "category" && item.link_reference_id) {
          existingByCategoryId.set(item.link_reference_id, item.id);
        }
      });

      // Sort categories: roots first, then children, alphabetically within each level
      const rootCats = categories
        .filter((c) => !c.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name));

      const getChildren = (parentId: string) =>
        categories
          .filter((c) => c.parent_id === parentId)
          .sort((a, b) => a.name.localeCompare(b.name));

      let addedCount = 0;
      const currentMaxPosition = Math.max(0, ...existingItems.map((i) => i.position));
      let positionCounter = currentMaxPosition + 1;

      // Recursive function to import category and its children
      const importCategory = async (
        cat: typeof categories[0],
        parentMenuItemId: string | null
      ) => {
        // Skip if already exists in menu
        if (existingByCategoryId.has(cat.id)) {
          // Still process children using existing menu item as parent
          const existingMenuItemId = existingByCategoryId.get(cat.id)!;
          const children = getChildren(cat.id);
          for (const child of children) {
            await importCategory(child, existingMenuItemId);
          }
          return;
        }

        const newItem = await createMenuItem.mutateAsync({
          menu_id: menuId,
          title: cat.name,
          url: `/category/${cat.slug}`,
          link_type: "category",
          link_reference_id: cat.id,
          position: positionCounter++,
          parent_id: parentMenuItemId,
        });
        addedCount++;

        // Import children as sub-items
        const children = getChildren(cat.id);
        for (const child of children) {
          await importCategory(child, newItem.id);
        }
      };

      for (const cat of rootCats) {
        await importCategory(cat, null);
      }

      if (addedCount === 0) toast.info("Todas as categorias já estão no menu.");
      else toast.success(`${addedCount} categoria(s) importada(s) com sucesso!`);
    } catch {
      toast.error("Erro ao importar categorias.");
    } finally {
      setIsSyncing(false);
    }
  };

  const rootCategories = categories.filter((c) => !c.parent_id);
  const childCategories = categories.filter((c) => c.parent_id);

  const deleteChildCount = deleteItemState
    ? getDescendantIds(
        menus.find((m) => m.id === deleteItemState.menu_id)?.items || [],
        deleteItemState.id
      ).length
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Menus</h1>
          <p className="text-muted-foreground">Configure os menus de navegação da sua loja</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Menus</h1>
        <p className="text-muted-foreground">Configure os menus de navegação da sua loja</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[...menus].sort((a, b) => {
          const order = { header: 0, footer: 1, sidebar: 2 };
          return (order[a.location] ?? 9) - (order[b.location] ?? 9);
        }).map((menu) => (
          <MenuCard
            key={menu.id}
            menu={menu}
            onAddItem={(menuId, footerSection) => handleOpenDialog(menuId, undefined, undefined, footerSection)}
            onAddChildItem={(menuId, parentId) => handleOpenDialog(menuId, undefined, parentId)}
            onEditItem={(item) => handleOpenDialog(item.menu_id, item)}
            onDeleteItem={(item) => setDeleteItemState(item)}
            onUpdateTree={handleUpdateTree}
            onSyncCategories={handleSyncCategories}
            isSyncing={isSyncing}
          />
        ))}
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item do Menu"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize as informações do item" : "Adicione um novo item ao menu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedMenuItems.length > 0 && (
              <div className="space-y-2">
                <Label>Item pai (opcional)</Label>
                <Select
                  value={formData.parent_id || "_none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, parent_id: value === "_none" ? null : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (item raiz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum (item raiz)</SelectItem>
                    {selectedMenuItems.map((f) => (
                      <SelectItem key={f.item.id} value={f.item.id}>
                        {"—".repeat(f.depth)} {f.depth > 0 ? "↳ " : ""}{f.item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione um item pai para criar um sub-menu
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Início, Produtos, Contato..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_type">Tipo de link</Label>
              <Select
                value={formData.link_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    link_type: value as any,
                    url: "",
                    link_reference_id: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">URL personalizada</SelectItem>
                  <SelectItem value="category">Categoria</SelectItem>
                  <SelectItem value="page">Página institucional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.link_type === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://... ou /pagina"
                />
              </div>
            )}

            {formData.link_type === "category" && (
              <div className="space-y-2">
                <Label>Selecionar categoria</Label>
                <Select
                  value={formData.link_reference_id}
                  onValueChange={(value) => {
                    const cat = categories.find((c) => c.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      link_reference_id: value,
                      title: prev.title || cat?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {rootCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    {childCategories.map((cat) => {
                      const parent = categories.find((c) => c.id === cat.parent_id);
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          {parent ? `${parent.name} → ` : ""}{cat.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.link_type === "page" && (
              <div className="space-y-2">
                <Label>Selecionar página</Label>
                <Select
                  value={formData.link_reference_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, link_reference_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma página" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages
                      .filter((p) => p.is_published)
                      .map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Abrir em nova aba</Label>
                <p className="text-xs text-muted-foreground">Link abrirá em uma nova janela</p>
              </div>
              <Switch
                checked={formData.open_in_new_tab}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, open_in_new_tab: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMenuItem.isPending || updateMenuItem.isPending}
            >
              {editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItemState} onOpenChange={() => setDeleteItemState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteItemState?.title}" do menu?
              {deleteChildCount > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  ⚠️ Este item possui {deleteChildCount} sub-item(ns) que também serão removidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
