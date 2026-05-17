import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomDomainResult {
  storeSlug: string | null;
  storeId: string | null;
  isLoading: boolean;
  isCustomDomain: boolean;
}

function getDomainCandidates(hostname: string) {
  const lower = hostname.trim().toLowerCase();
  const withoutWww = lower.replace(/^www\./, '');
  return lower === withoutWww ? [lower] : [lower, withoutWww];
}

/**
 * Resolves a custom domain (e.g. larrizi.com.br) to a store slug.
 * If the request comes from www.dominio.com, it also tries dominio.com
 * so root-domain records automatically cover the www version too.
 */
export function useCustomDomainResolver(hostname: string): CustomDomainResult {
  const [result, setResult] = useState<CustomDomainResult>({
    storeSlug: null,
    storeId: null,
    isLoading: true,
    isCustomDomain: false,
  });

  useEffect(() => {
    async function resolve() {
      if (!hostname) {
        setResult({ storeSlug: null, storeId: null, isLoading: false, isCustomDomain: false });
        return;
      }

      try {
        const candidates = getDomainCandidates(hostname);
        const { data, error } = await supabase
          .from('custom_domains')
          .select('domain, store_id, stores!inner(slug)')
          .in('domain', candidates)
          .limit(1);

        if (error || !data || data.length === 0) {
          setResult({ storeSlug: null, storeId: null, isLoading: false, isCustomDomain: false });
          return;
        }

        const match = data.find((item) => item.domain === candidates[0]) ?? data[0];
        const store = match.stores as unknown as { slug: string };

        setResult({
          storeSlug: store.slug,
          storeId: match.store_id,
          isLoading: false,
          isCustomDomain: true,
        });
      } catch {
        setResult({ storeSlug: null, storeId: null, isLoading: false, isCustomDomain: false });
      }
    }

    resolve();
  }, [hostname]);

  return result;
}
