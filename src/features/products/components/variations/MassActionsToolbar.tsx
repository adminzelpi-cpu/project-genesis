import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2, DollarSign, Package, Ruler } from "lucide-react";

interface MassActionsToolbarProps {
  onMassUpdate: (field: string, value: any) => void;
  basePrice: number;
}

export const MassActionsToolbar = ({
  onMassUpdate,
  basePrice,
}: MassActionsToolbarProps) => {
  const [massPrice, setMassPrice] = useState<string | number>(basePrice);
  const [massSalePrice, setMassSalePrice] = useState<string | number>("");
  const [massStock, setMassStock] = useState("");
  const [massWeight, setMassWeight] = useState<string | number>("");
  const [massDimensions, setMassDimensions] = useState<{ length: string | number; width: string | number; height: string | number }>({ length: "", width: "", height: "" });

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="h-4 w-4" />
        <span className="font-medium text-sm">Ações em Massa</span>
        <span className="text-xs text-muted-foreground ml-2">
          Aplicar valores para todas as variações
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Preço */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Preço
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <Label>Preço</Label>
                <CurrencyInput
                  value={massPrice}
                  onChange={setMassPrice}
                />
              </div>
              <div>
                <Label>Preço Promocional</Label>
                <CurrencyInput
                  value={massSalePrice}
                  onChange={setMassSalePrice}
                />
              </div>
              <Button
                onClick={() => {
                  const price = typeof massPrice === 'number' ? massPrice : parseFloat(String(massPrice));
                  if (!isNaN(price)) onMassUpdate("price", price);
                  const sale = typeof massSalePrice === 'number' ? massSalePrice : parseFloat(String(massSalePrice));
                  if (!isNaN(sale) && sale > 0) onMassUpdate("sale_price", sale);
                }}
                className="w-full"
              >
                Aplicar Preços
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Estoque */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Estoque
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-4">
              <div>
                <Label>Quantidade em Estoque</Label>
                <Input
                  type="number"
                  value={massStock}
                  onChange={(e) => setMassStock(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={() => onMassUpdate("stock_quantity", parseInt(massStock) || 0)}
                className="w-full"
              >
                Aplicar Estoque
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Peso */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Peso
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-4">
              <div>
                <Label>Peso (kg)</Label>
                <CurrencyInput
                  decimals={3}
                  value={massWeight}
                  onChange={setMassWeight}
                  placeholder="0,000"
                />
              </div>
              <Button
                onClick={() => {
                  const w = typeof massWeight === 'number' ? massWeight : parseFloat(String(massWeight));
                  onMassUpdate("weight", isNaN(w) ? 0 : w);
                }}
                className="w-full"
              >
                Aplicar Peso
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Dimensões */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Ruler className="h-4 w-4 mr-2" />
              Dimensões
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Comprimento (cm)</Label>
                  <CurrencyInput
                    value={massDimensions.length}
                    onChange={(v) => setMassDimensions({ ...massDimensions, length: v })}
                  />
                </div>
                <div>
                  <Label>Largura (cm)</Label>
                  <CurrencyInput
                    value={massDimensions.width}
                    onChange={(v) => setMassDimensions({ ...massDimensions, width: v })}
                  />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <CurrencyInput
                    value={massDimensions.height}
                    onChange={(v) => setMassDimensions({ ...massDimensions, height: v })}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  const toNum = (v: string | number) => typeof v === 'number' ? v : parseFloat(String(v));
                  const l = toNum(massDimensions.length);
                  const w = toNum(massDimensions.width);
                  const h = toNum(massDimensions.height);
                  if (!isNaN(l) && l > 0) onMassUpdate("length", l);
                  if (!isNaN(w) && w > 0) onMassUpdate("width", w);
                  if (!isNaN(h) && h > 0) onMassUpdate("height", h);
                }}
                className="w-full"
              >
                Aplicar Dimensões
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
