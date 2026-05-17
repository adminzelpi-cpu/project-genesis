import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const isCloudflareEdgeIp = (ip: string) => {
  return ip.startsWith('104.') || ip.startsWith('172.') || ip.startsWith('188.114.') || ip.startsWith('190.93.') || ip.startsWith('197.234.') || ip.startsWith('198.41.') || ip.startsWith('162.158.') || ip.startsWith('131.0.72.') || ip.startsWith('141.101.');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain_id } = await req.json();

    if (!domain_id) {
      return new Response(JSON.stringify({ error: 'domain_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the domain record
    const { data: domainRecord, error: fetchError } = await supabase
      .from('custom_domains')
      .select('domain, store_id')
      .eq('id', domain_id)
      .single();

    if (fetchError || !domainRecord) {
      return new Response(JSON.stringify({ error: 'Domain not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domain = domainRecord.domain;

    // Check DNS resolution using Cloudflare DoH (DNS over HTTPS)
    let isVerified = false;
    let dnsDetails: Record<string, unknown> = {};
    let verificationStatus = 'dns_not_configured';
    let verificationMessage = 'DNS ainda não está configurado corretamente.';
    let routingStatus: number | null = null;

    try {
      const [rootAResponse, rootCnameResponse, wwwAResponse, wwwCnameResponse] = await Promise.all([
        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }
        }),
        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`, {
          headers: { 'Accept': 'application/dns-json' }
        }),
        fetch(`https://cloudflare-dns.com/dns-query?name=www.${domain}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }
        }),
        fetch(`https://cloudflare-dns.com/dns-query?name=www.${domain}&type=CNAME`, {
          headers: { 'Accept': 'application/dns-json' }
        }),
      ]);

      const [rootAData, rootCnameData, wwwAData, wwwCnameData] = await Promise.all([
        rootAResponse.json(),
        rootCnameResponse.json(),
        wwwAResponse.json(),
        wwwCnameResponse.json(),
      ]);

      const rootARecords = rootAData.Answer?.map((r: { data: string }) => r.data) || [];
      const rootCnameRecords = rootCnameData.Answer?.map((r: { data: string }) => r.data.replace(/\.$/, '')) || [];
      const wwwARecords = wwwAData.Answer?.map((r: { data: string }) => r.data) || [];
      const wwwCnameRecords = wwwCnameData.Answer?.map((r: { data: string }) => r.data.replace(/\.$/, '')) || [];

      dnsDetails = {
        root: { a_records: rootARecords, cname_records: rootCnameRecords },
        www: { a_records: wwwARecords, cname_records: wwwCnameRecords },
      };

      const expectedIp = '192.0.2.1';
      const expectedCname = 'zelpi.pages.dev';

      const rootHasPlaceholderIp = rootARecords.includes(expectedIp);
      const wwwHasPlaceholderIp = wwwARecords.includes(expectedIp);
      const hasCorrectCname = [...rootCnameRecords, ...wwwCnameRecords].some((c: string) =>
        c === expectedCname || c.endsWith(`.${expectedCname}`)
      );

      const hasCloudflareProxy = [...rootARecords, ...wwwARecords].some((ip: string) => isCloudflareEdgeIp(ip));
      const hasDnsOnlyPlaceholder = rootHasPlaceholderIp || wwwHasPlaceholderIp;

      if (hasCloudflareProxy || hasCorrectCname) {
        isVerified = true;
        verificationStatus = hasCorrectCname ? 'configured_via_cname' : 'configured_via_cloudflare_proxy';
        verificationMessage = hasCorrectCname
          ? 'Domínio configurado corretamente via CNAME.'
          : 'Domínio configurado corretamente com proxy do Cloudflare ativo.';
      } else if (hasDnsOnlyPlaceholder) {
        isVerified = false;
        verificationStatus = 'cloudflare_proxy_disabled';
        verificationMessage = 'Os registros estão apontando para 192.0.2.1 em modo Somente DNS. Ative a nuvem laranja (Proxied) no Cloudflare para evitar erro 522.';
      } else {
        isVerified = false;
        verificationStatus = 'dns_not_configured';
        verificationMessage = 'Os registros DNS ainda não apontam corretamente para a infraestrutura da loja.';
      }

      dnsDetails = {
        ...dnsDetails,
        verification_status: verificationStatus,
        verification_message: verificationMessage,
      };

      if (isVerified) {
        try {
          const routingResponse = await fetch(`https://${domain}`, {
            method: 'GET',
            redirect: 'manual',
            headers: {
              'user-agent': 'Zelpi Domain Verifier/1.0',
              'accept': 'text/html,application/xhtml+xml',
            },
          });

          routingStatus = routingResponse.status;

          if (routingResponse.status === 522) {
            isVerified = false;
            verificationStatus = 'worker_route_missing';
            verificationMessage = `O DNS já propagou, mas o Cloudflare ainda não está roteando ${domain} para a loja. Adicione as rotas ${domain}/* e www.${domain}/* no Worker zelpi-og-router.`;
            dnsDetails = {
              ...dnsDetails,
              routing_status: routingStatus,
              verification_status: verificationStatus,
              verification_message: verificationMessage,
            };
          } else {
            dnsDetails = {
              ...dnsDetails,
              routing_status: routingStatus,
            };
          }
        } catch (routingError) {
          console.error('Routing check error:', routingError);
          dnsDetails = {
            ...dnsDetails,
            routing_status: 'check_failed',
          };
        }
      }
    } catch (dnsError) {
      console.error('DNS lookup error:', dnsError);
      verificationStatus = 'dns_lookup_failed';
      verificationMessage = 'Não foi possível consultar os registros DNS agora.';
      dnsDetails = { error: 'DNS lookup failed', verification_status: verificationStatus, verification_message: verificationMessage };
    }

    // Update the domain record
    const { error: updateError } = await supabase
      .from('custom_domains')
      .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
      .eq('id', domain_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        domain,
        is_verified: isVerified,
          verification_status: verificationStatus,
          verification_message: verificationMessage,
          routing_status: routingStatus,
        dns_details: dnsDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
