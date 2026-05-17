import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paintbrush, Eye } from "lucide-react";

export default function StoreThemes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: store } = useQuery({
    queryKey: ["store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, slug, theme_primary_color, theme_secondary_color, logo_url")
        .eq("merchant_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const themes = [
    {
      id: "default",
      name: "Padrão",
      description: "Tema limpo e moderno com foco em conversão",
      active: true,
      colors: {
        primary: store?.theme_primary_color || "#000000",
        secondary: store?.theme_secondary_color || "#D4A853",
      },
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Temas</h1>
          <p className="text-muted-foreground">
            Gerencie e personalize o visual da sua loja
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <Card
            key={theme.id}
            className={`overflow-hidden transition-shadow hover:shadow-lg ${
              theme.active ? "ring-2 ring-primary" : ""
            }`}
          >
            {/* Theme Preview */}
            <div className="relative aspect-[4/3] bg-muted flex flex-col overflow-hidden">
              {/* Mini preview of the theme */}
              <div className="flex-1 flex flex-col">
                {/* Mini header */}
                <div className="h-8 bg-background border-b flex items-center px-3 gap-2">
                  {store?.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-4 object-contain" />
                  ) : (
                    <div className="h-3 w-16 bg-foreground/20 rounded" />
                  )}
                  <div className="ml-auto flex gap-1.5">
                    <div className="h-2 w-8 bg-foreground/10 rounded" />
                    <div className="h-2 w-8 bg-foreground/10 rounded" />
                    <div className="h-2 w-8 bg-foreground/10 rounded" />
                  </div>
                </div>
                {/* Mini hero */}
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center space-y-2">
                    <div className="h-3 w-32 mx-auto bg-foreground/15 rounded" />
                    <div className="h-2 w-24 mx-auto bg-foreground/10 rounded" />
                    <div
                      className="h-5 w-20 mx-auto rounded-sm mt-2"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                  </div>
                </div>
                {/* Mini product grid */}
                <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="aspect-square bg-foreground/5 rounded" />
                      <div className="h-1.5 w-full bg-foreground/10 rounded" />
                      <div className="h-1.5 w-2/3 bg-foreground/8 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Active badge */}
              {theme.active && (
                <Badge className="absolute top-2 right-2 text-xs" variant="default">
                  Ativo
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{theme.name}</h3>
                {/* Color dots */}
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: theme.colors.secondary }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {theme.description}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => navigate("/dashboard/store/appearance")}
                >
                  <Paintbrush className="h-4 w-4 mr-2" />
                  Personalizar
                </Button>
                {store && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`https://${store.slug}.zelpi.com.br`, "_blank")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
