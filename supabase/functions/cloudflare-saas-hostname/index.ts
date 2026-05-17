// =============================================================
// Cloudflare for SaaS - Automação de Custom Hostnames
// =============================================================
// Cria/consulta/remove custom hostnames via API do Cloudflare,
// permitindo SSL automático para domínios de lojistas.
//
// Actions:
//   - "create": cria custom hostname (chamado ao adicionar domínio)
//   - "status": consulta status SSL/validação
//   - "delete": remove custom hostname (chamado ao remover domínio)
// =============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CF_API = 'https://api.cloudflare.com/client/v4';
const FALLBACK_ORIGIN = 'fallback.zelpi.com.br';
const WORKER_NAME = 'zelpi-og-router';

/**
 * Cria uma rota no Worker zelpi-og-router pra um padrão (ex: "larrizi.com.br/*").
 * Idempotente: se já existe (erro 10020), retorna sucesso silenciosamente.
 */
async function createWorkerRoute(
  pattern: string,
  zoneId: string,
  token: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await cfFetch<{ id: string }>(
      `/zones/${zoneId}/workers/routes`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ pattern, script: WORKER_NAME }),
      }
    );
    if (res.success) return { success: true, id: res.result.id };
    // 10020 = route already exists
    const alreadyExists = res.errors?.some((e) => e.code === 10020);
    if (alreadyExists) return { success: true };
    return { success: false, error: JSON.stringify(res.errors) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

interface CFResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: unknown[];
  result: T;
}

async function cfFetch<T = unknown>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<CFResponse<T>> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return await res.json() as CFResponse<T>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!CF_TOKEN || !CF_ZONE_ID) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, domain_id } = await req.json();

    if (!action || !domain_id) {
      return new Response(
        JSON.stringify({ error: 'action and domain_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Buscar domínio
    const { data: domainRecord, error: fetchError } = await supabase
      .from('custom_domains')
      .select('id, domain, store_id, cloudflare_hostname_id')
      .eq('id', domain_id)
      .single();

    if (fetchError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: 'Domain not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = domainRecord.domain;

    // ============= CREATE =============
    if (action === 'create') {
      // Se já existe, apenas consulta status — mas garante que rotas do Worker existam
      if (domainRecord.cloudflare_hostname_id) {
        const statusRes = await cfFetch<{
          status: string;
          ssl: { status: string; validation_records?: unknown[] };
          ownership_verification?: { name: string; type: string; value: string };
        }>(
          `/zones/${CF_ZONE_ID}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`,
          CF_TOKEN
        );

        // Idempotente: garante rotas do Worker mesmo em hostnames antigos
        const rootRoute = await createWorkerRoute(`${domain}/*`, CF_ZONE_ID, CF_TOKEN);
        const wwwRoute = await createWorkerRoute(`www.${domain}/*`, CF_ZONE_ID, CF_TOKEN);

        return new Response(
          JSON.stringify({
            already_exists: true,
            cloudflare_hostname_id: domainRecord.cloudflare_hostname_id,
            fallback_origin: FALLBACK_ORIGIN,
            cf_status: statusRes.result?.status,
            cf_ssl_status: statusRes.result?.ssl?.status,
            ownership_verification: statusRes.result?.ownership_verification,
            worker_routes: { root: rootRoute.success, www: wwwRoute.success },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar custom hostname para root + www
      const createRes = await cfFetch<{
        id: string;
        hostname: string;
        ssl: { status: string };
        ownership_verification?: { name: string; type: string; value: string };
      }>(
        `/zones/${CF_ZONE_ID}/custom_hostnames`,
        CF_TOKEN,
        {
          method: 'POST',
          body: JSON.stringify({
            hostname: domain,
            ssl: {
              method: 'http',
              type: 'dv',
              settings: {
                http2: 'on',
                min_tls_version: '1.2',
                tls_1_3: 'on',
              },
            },
          }),
        }
      );

      if (!createRes.success) {
        console.error('CF create failed:', createRes.errors);
        return new Response(
          JSON.stringify({
            error: 'Failed to create custom hostname',
            cf_errors: createRes.errors,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hostnameId = createRes.result.id;

      // Tentar criar também o www.<dominio>
      let wwwHostnameId: string | null = null;
      try {
        const wwwRes = await cfFetch<{ id: string }>(
          `/zones/${CF_ZONE_ID}/custom_hostnames`,
          CF_TOKEN,
          {
            method: 'POST',
            body: JSON.stringify({
              hostname: `www.${domain}`,
              ssl: { method: 'http', type: 'dv' },
            }),
          }
        );
        if (wwwRes.success) wwwHostnameId = wwwRes.result.id;
      } catch (e) {
        console.warn('www custom hostname failed (non-critical):', e);
      }

      // Salvar hostname IDs no banco
      await supabase
        .from('custom_domains')
        .update({
          cloudflare_hostname_id: hostnameId,
          cloudflare_www_hostname_id: wwwHostnameId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domain_id);

      // Criar rotas no Worker (zelpi-og-router) automaticamente
      // Necessário pra que o domínio do lojista seja roteado pro storefront
      const rootRoute = await createWorkerRoute(`${domain}/*`, CF_ZONE_ID, CF_TOKEN);
      const wwwRoute = await createWorkerRoute(`www.${domain}/*`, CF_ZONE_ID, CF_TOKEN);

      if (!rootRoute.success) console.warn(`Worker route ${domain}/* failed:`, rootRoute.error);
      if (!wwwRoute.success) console.warn(`Worker route www.${domain}/* failed:`, wwwRoute.error);

      return new Response(
        JSON.stringify({
          created: true,
          cloudflare_hostname_id: hostnameId,
          cloudflare_www_hostname_id: wwwHostnameId,
          fallback_origin: FALLBACK_ORIGIN,
          cf_status: createRes.result.ssl?.status,
          ownership_verification: createRes.result.ownership_verification,
          worker_routes: {
            root: rootRoute.success,
            www: wwwRoute.success,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= STATUS =============
    if (action === 'status') {
      if (!domainRecord.cloudflare_hostname_id) {
        return new Response(
          JSON.stringify({ error: 'Custom hostname not yet created' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusRes = await cfFetch<{
        status: string;
        ssl: { status: string; validation_errors?: Array<{ message: string }> };
        verification_errors?: string[];
        ownership_verification?: { name: string; type: string; value: string };
      }>(
        `/zones/${CF_ZONE_ID}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`,
        CF_TOKEN
      );

      if (!statusRes.success) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch status', cf_errors: statusRes.errors }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isActive = statusRes.result.status === 'active' && statusRes.result.ssl?.status === 'active';

      // Se ativo, marcar como verificado
      if (isActive) {
        await supabase
          .from('custom_domains')
          .update({ is_verified: true, updated_at: new Date().toISOString() })
          .eq('id', domain_id);
      }

      return new Response(
        JSON.stringify({
          domain,
          fallback_origin: FALLBACK_ORIGIN,
          cf_status: statusRes.result.status,
          cf_ssl_status: statusRes.result.ssl?.status,
          is_active: isActive,
          ownership_verification: statusRes.result.ownership_verification,
          verification_errors: statusRes.result.verification_errors || [],
          ssl_validation_errors: statusRes.result.ssl?.validation_errors || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= DELETE =============
    if (action === 'delete') {
      const ids = [
        domainRecord.cloudflare_hostname_id,
        (domainRecord as { cloudflare_www_hostname_id?: string }).cloudflare_www_hostname_id,
      ].filter(Boolean) as string[];

      for (const id of ids) {
        try {
          await cfFetch(`/zones/${CF_ZONE_ID}/custom_hostnames/${id}`, CF_TOKEN, {
            method: 'DELETE',
          });
        } catch (e) {
          console.warn('CF delete failed (non-critical):', e);
        }
      }

      return new Response(
        JSON.stringify({ deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('cloudflare-saas-hostname error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
