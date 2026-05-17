import { ShoppingCart } from "lucide-react";
import { AbandonedCartsTable } from "@/features/abandoned-carts/components/AbandonedCartsTable";

export default function AbandonedCarts() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Carrinhos Abandonados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e recupere carrinhos abandonados pelos seus clientes
          </p>
        </div>
      </div>

      {/* Table */}
      <AbandonedCartsTable />
    </div>
  );
}
