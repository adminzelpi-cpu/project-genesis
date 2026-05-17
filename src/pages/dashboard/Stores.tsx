import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/features/stores/hooks/useStore";
import { Store } from "@/features/stores/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store as StoreIcon, ExternalLink } from "lucide-react";
import { StoreForm } from "@/features/stores/components/StoreForm";
import { toast } from "@/hooks/use-toast";

export default function Stores() {
  const { user } = useAuth();
  const { getMyStores } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = async () => {
    setLoading(true);
    const { stores: data, error } = await getMyStores();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar loja",
        description: error.message,
      });
    } else {
      // Como é apenas uma loja por cliente, pegamos a primeira
      setStore(data && data.length > 0 ? data[0] : null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStore();
  }, [user]);

  const handleStoreSuccess = () => {
    loadStore();
    toast({
      title: store ? "Loja atualizada!" : "Loja criada!",
      description: store ? "As informações da sua loja foram atualizadas." : "Sua loja está pronta para receber produtos.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{store ? "Minha Loja" : "Criar Loja"}</h1>
          <p className="text-muted-foreground">
            {store ? "Configure sua loja online" : "Crie sua loja para começar a vender"}
          </p>
        </div>

        {store && (
          <Button variant="outline" className="gap-2" asChild>
            <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Ver Loja
            </a>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : store ? (
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Loja</CardTitle>
          </CardHeader>
          <CardContent>
            <StoreForm store={store} onSuccess={handleStoreSuccess} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <StoreIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Crie sua loja</h3>
              <p className="text-muted-foreground mb-6">
                Preencha as informações abaixo para criar sua loja online
              </p>
            </div>
            <StoreForm onSuccess={handleStoreSuccess} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
