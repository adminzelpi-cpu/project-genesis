import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface ProductsTabProps {
  topProducts: { name: string; quantity: number; revenue: number; image?: string }[];
  lowStockProducts: { id: string; name: string; stock_quantity: number | null; images: any }[];
}

export function ProductsTab({ topProducts, lowStockProducts }: ProductsTabProps) {
  const getProductImage = (product: { images: any }) => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Ranking por receita gerada</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <span className={`font-bold ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {index + 1}º
                      </span>
                    </TableCell>
                    <TableCell className="flex items-center gap-3">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt="" 
                          className="w-10 h-10 rounded-md object-cover border"
                        />
                      )}
                      <span className="font-medium truncate max-w-[250px]">{product.name}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{product.quantity}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma venda registrada ainda</p>
              <p className="text-sm">Os produtos mais vendidos aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Estoque Baixo</CardTitle>
              <CardDescription>Produtos com 5 ou menos unidades</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => {
                  const image = getProductImage(product);
                  const stock = product.stock_quantity || 0;
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="flex items-center gap-3">
                        {image && (
                          <img 
                            src={image} 
                            alt="" 
                            className="w-10 h-10 rounded-md object-cover border"
                          />
                        )}
                        <span className="font-medium truncate max-w-[250px]">{product.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {stock}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock === 0 ? (
                          <Badge variant="destructive">Esgotado</Badge>
                        ) : stock <= 2 ? (
                          <Badge variant="destructive">Crítico</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">Baixo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Todos os produtos estão com estoque ok!</p>
              <p className="text-sm">Produtos com estoque baixo aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
