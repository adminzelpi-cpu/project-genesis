import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useCustomerAuth } from "@/features/auth";

/**
 * Protected route for the customer portal.
 *
 * Requires the store-isolated customer JWT. The legacy supabase.auth fallback
 * was removed after the migration was completed.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const { isAuthenticated, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = storeSlug ? `${buildPath("/")}?login=true` : "/auth";
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}

