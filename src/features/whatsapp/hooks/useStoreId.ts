import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Hook utilitário: garante que o lojista tem loja e devolve o id (ou null). */
export function useStoreId(): { storeId: string | null; loading: boolean } {
  // simples wrapper síncrono usando state local
  // implementação reutilizada nas páginas
  return useStoreIdInner();
}

import { useState } from "react";
function useStoreIdInner() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setLoading(false); return; }
      const { data: store } = await supabase
        .from("stores").select("id").eq("merchant_id", data.user.id).maybeSingle();
      setStoreId(store?.id ?? null);
      setLoading(false);
    })();
  }, []);
  return { storeId, loading };
}

export function useRequireConnection() {
  const navigate = useNavigate();
  const { storeId, loading } = useStoreId();
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_connections")
        .select("id").eq("store_id", storeId).maybeSingle();
      setHasConnection(!!data);
      if (!data) navigate("/dashboard/whatsapp", { replace: true });
    })();
  }, [storeId, navigate]);
  return { storeId, loading: loading || hasConnection === null, hasConnection };
}
