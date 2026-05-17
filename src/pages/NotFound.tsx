import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import StorefrontNotFound from "./storefront/[storeSlug]/not-found";
import { StoreSlugProvider } from "@/contexts/StoreSlugContext";
import { useHostDetection } from "@/hooks/useHostDetection";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDev, mode, storeSlug: detectedStoreSlug } = useHostDetection();

  const [resolvedStoreSlug, setResolvedStoreSlug] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // Path-based slug fallback (covers /store/<slug>/... in dev and main domain)
  const pathSlugMatch = location.pathname.match(/^\/store\/([^/]+)/);
  const pathStoreSlug = pathSlugMatch ? pathSlugMatch[1] : null;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Resolve the storefront context for the friendly 404:
  // 1. Subdomain mode (e.g. larrizi.zelpi.com.br) → slug from useHostDetection
  // 2. Path mode (/store/<slug>/...) → slug from URL
  // 3. Custom domain (e.g. larrizi.com.br) → look up in custom_domains
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // Case 1: subdomain mode already gave us a slug
      if (mode === "storefront" && detectedStoreSlug) {
        if (!cancelled) {
          setResolvedStoreSlug(detectedStoreSlug);
          setResolving(false);
        }
        return;
      }

      // Case 2: /store/<slug>/... path (works in dev + main domain)
      if (pathStoreSlug && (isDev || mode === "storefront")) {
        if (!cancelled) {
          setResolvedStoreSlug(pathStoreSlug);
          setResolving(false);
        }
        return;
      }

      // Case 3: custom domain — only resolve when NOT on the main app/admin/dev hosts
      if (!isDev && mode === "landing") {
        const hostname = window.location.hostname.toLowerCase();
        try {
          const { data } = await supabase
            .from("custom_domains")
            .select("store_id, stores!inner(slug)")
            .eq("domain", hostname)
            .eq("is_verified", true)
            .maybeSingle();

          if (!cancelled) {
            const slug = (data as any)?.stores?.slug ?? null;
            setResolvedStoreSlug(slug);
            setResolving(false);
          }
          return;
        } catch (err) {
          console.warn("[NotFound] custom domain lookup failed:", err);
        }
      }

      if (!cancelled) {
        setResolvedStoreSlug(null);
        setResolving(false);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [mode, detectedStoreSlug, pathStoreSlug, isDev]);

  // While resolving the storefront context, show a minimal placeholder
  // to avoid flashing the generic 404 before the friendly one loads.
  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If we resolved to a storefront, render the friendly 404 with proper context.
  // Use subdomain mode (root-level routes) when the store is served from a
  // subdomain or custom domain. Only use path mode (/store/<slug>/...) when
  // the URL actually contains the /store/<slug> prefix (dev or main domain).
  if (resolvedStoreSlug) {
    const isPathMode = !!pathStoreSlug && mode !== "storefront";
    return (
      <StoreSlugProvider slug={resolvedStoreSlug} forceSubdomainMode={!isPathMode}>
        <StorefrontNotFound />
      </StoreSlugProvider>
    );
  }

  // Generic 404 for non-storefront routes (admin, landing, unknown hosts)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
          <Package className="h-10 w-10 text-gray-400" />
        </div>

        <h1 className="text-5xl font-bold text-gray-300 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Página não encontrada</h2>
        <p className="text-gray-600 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/")} variant="default">
            <Home className="h-4 w-4 mr-2" />
            Ir para o início
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
