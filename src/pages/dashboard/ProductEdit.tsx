import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { Product } from "@/features/products/types";
import { ProductForm } from "@/features/products/components/ProductForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ProductEdit() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { store, isLoading: storeLoading } = useActiveStore();
  const { getProduct } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Obter storeId dos parâmetros de URL se não houver productId
  const storeIdFromParams = searchParams.get('storeId');

  useEffect(() => {
    if (productId) {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    
    setLoading(true);
    const { product: data, error } = await getProduct(productId);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produto",
        description: error.message,
      });
      navigate("/dashboard/products");
    } else {
      setProduct(data);
    }
    setLoading(false);
  };

  const handleSuccess = (savedProductId?: string) => {
    if (productId) {
      // Editing existing product — stay on page
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    } else if (savedProductId) {
      // Creating new product — redirect to edit page
      toast({
        title: "Produto criado!",
        description: "O produto foi adicionado à sua loja.",
      });
      navigate(`/dashboard/products/${savedProductId}/edit`, { replace: true });
    }
  };

  if (!store && !storeLoading && !storeIdFromParams) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </div>
    );
  }

  const currentStoreId = product?.store_id || store?.id || storeIdFromParams;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {productId ? 'Editar Produto' : 'Novo Produto'}
            </h1>
            <p className="text-muted-foreground">
              {productId ? 'Atualize as informações do produto' : 'Adicione um novo produto à sua loja'}
            </p>
          </div>
        </div>
      </div>

      <ProductForm 
        storeId={currentStoreId!} 
        product={product || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
