import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  const { store } = useStorefront(storeSlug);

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Pedido Confirmado | {store?.name || 'Loja'}</title></Helmet>
      <StorefrontHeader 
        storeName={store.name} 
        storeSlug={storeSlug!} 
        storeId={store.id} 
        logoUrl={store.logo_url}
        headerBgColor={(store as any).header_bg_color}
        headerTextColor={(store as any).header_text_color}
        headerLayout={(store as any).header_layout}
        headerShowFavorites={(store as any).header_show_favorites}
        headerShowSearch={(store as any).header_show_search}
        headerMobileLogoPosition={(store as any).header_mobile_logo_position}
      />

      <main className="container mx-auto px-4 py-16">
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
            <h1 className="text-3xl font-bold mb-4">Pedido Realizado com Sucesso!</h1>
            <p className="text-muted-foreground mb-8">
              Obrigado pela sua compra! Você receberá em breve mais informações sobre o seu pedido.
            </p>
            <div className="space-y-3 w-full">
              <Button
                className="w-full font-bold"
                size="lg"
                onClick={() => navigate(buildPath("/"))}
                style={{
                  backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                  color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--primary-foreground))))',
                  borderRadius: 'var(--store-button-radius, 0.375rem)',
                }}
                onMouseEnter={(e) => {
                  const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                  if (hoverColor) e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--primary))))';
                }}
              >
                Continuar Comprando
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
