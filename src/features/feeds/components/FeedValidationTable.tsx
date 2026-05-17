import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductValidation {
  id: string;
  name: string;
  slug: string;
  missingFields: string[];
  recommendedFields?: string[];
  isEligible: boolean;
  hasImage: boolean;
  hasStock: boolean;
  hasPrice: boolean;
  hasBrand: boolean;
  hasDescription: boolean;
  hasGender?: boolean;
  hasAgeGroup?: boolean;
  hasMaterial?: boolean;
  hasCategory?: boolean;
}

interface FeedValidationTableProps {
  products: ProductValidation[];
  loading: boolean;
  storeId?: string;
}

export function FeedValidationTable({ products, loading, storeId }: FeedValidationTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Sort: products with issues first
  const sortedProducts = [...products].sort((a, b) => {
    if (a.isEligible === b.isEligible) return a.name.localeCompare(b.name);
    return a.isEligible ? 1 : -1;
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead className="text-center">Imagem</TableHead>
          <TableHead className="text-center">Estoque</TableHead>
          <TableHead className="text-center">Preço</TableHead>
          <TableHead className="text-center">Marca</TableHead>
          <TableHead className="text-center">Descrição</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedProducts.map(product => (
          <TableRow key={product.id}>
            <TableCell className="font-medium max-w-[200px] truncate">
              {product.name}
            </TableCell>
            <TableCell className="text-center">
              {product.hasImage ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {product.hasStock ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {product.hasPrice ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {product.hasBrand ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {product.hasDescription ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
              )}
            </TableCell>
            <TableCell>
              {product.isEligible ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                  Pronto
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Pendente
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost" asChild>
                <Link to={`/dashboard/products/${product.id}/edit`}>
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
