import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FB_SDK_VERSION = "v25.0";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/**
 * Carrega o SDK do Facebook uma única vez e devolve flag de pronto.
 * Mantém comportamento idêntico à implementação inline anterior.
 */
export function useFacebookSDK() {
  const [sdkReady, setSdkReady] = useState(false);
  const [metaConfigId, setMetaConfigId] = useState<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initSdk = (appId: string, sdkVersion = FB_SDK_VERSION) => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: sdkVersion,
      });
      if (!cancelled) setSdkReady(true);
    };

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-meta-config");
        if (data?.error || error) throw new Error(data?.error || error?.message || "Configuração Meta indisponível");

        const appId = String(data?.app_id || "");
        const configId = String(data?.config_id || "");
        const sdkVersion = String(data?.sdk_version || FB_SDK_VERSION);
        if (!appId || !configId) throw new Error("Configuração Meta incompleta");
        if (cancelled) return;

        setMetaConfigId(configId);
        setSdkError(null);

        if (window.FB) {
          initSdk(appId, sdkVersion);
          return;
        }

        window.fbAsyncInit = () => initSdk(appId, sdkVersion);

        if (!document.getElementById("facebook-jssdk")) {
          const script = document.createElement("script");
          script.id = "facebook-jssdk";
          script.src = "https://connect.facebook.net/en_US/sdk.js";
          script.async = true;
          script.defer = true;
          script.crossOrigin = "anonymous";
          document.body.appendChild(script);
        }
      } catch (e: any) {
        if (!cancelled) setSdkError(e?.message || "Falha ao carregar configuração Meta");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { sdkReady, metaConfigId, sdkError };
}
