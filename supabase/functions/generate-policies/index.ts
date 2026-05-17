import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StoreData {
  id: string;
  name: string;
  business_name: string | null;
  document: string | null;
  document_type: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  slug: string;
}

interface PolicyType {
  type: string;
  title: string;
  slug: string;
}

const POLICY_TYPES: PolicyType[] = [
  { type: "terms", title: "Termos de Uso", slug: "termos-de-uso" },
  { type: "privacy", title: "Política de Privacidade", slug: "politica-de-privacidade" },
  { type: "returns", title: "Trocas e Devoluções", slug: "trocas-e-devolucoes" },
  { type: "shipping", title: "Política de Envio", slug: "politica-de-envio" },
];

function buildPrompt(store: StoreData, policyType: PolicyType): string {
  const companyName = store.business_name || store.name;
  const docType = store.document_type === "cnpj" ? "CNPJ" : "CPF";
  const document = store.document || "[Documento não informado]";
  const email = store.email || "[E-mail não informado]";
  const phone = store.phone || store.whatsapp || "[Telefone não informado]";
  
  let address = "";
  if (store.address_street) {
    address = `${store.address_street}`;
    if (store.address_number) address += `, ${store.address_number}`;
    if (store.address_complement) address += ` - ${store.address_complement}`;
    if (store.address_neighborhood) address += `, ${store.address_neighborhood}`;
    if (store.address_city && store.address_state) {
      address += ` - ${store.address_city}/${store.address_state}`;
    }
    if (store.address_zip) address += ` - CEP: ${store.address_zip}`;
  } else {
    address = "[Endereço não informado]";
  }

  const baseContext = `
Dados da empresa:
- Nome: ${companyName}
- ${docType}: ${document}
- E-mail: ${email}
- Telefone: ${phone}
- Endereço: ${address}
- Site: ${store.slug}
`;

  const prompts: Record<string, string> = {
    terms: `Gere uma página completa de Termos de Uso para um e-commerce brasileiro.
${baseContext}

A página deve incluir:
1. Identificação da empresa
2. Objeto do contrato (uso do site/loja)
3. Cadastro e conta do usuário
4. Condições de compra
5. Preços e pagamentos
6. Responsabilidades
7. Propriedade intelectual
8. Alterações nos termos
9. Foro e legislação aplicável
10. Contato

Use linguagem formal mas acessível. Formate em HTML com tags h2, h3, p, ul, li.`,

    privacy: `Gere uma Política de Privacidade completa para um e-commerce brasileiro, seguindo a LGPD.
${baseContext}

A página deve incluir:
1. Dados que coletamos e por quê
2. Como usamos os dados
3. Compartilhamento de dados
4. Cookies e tecnologias similares
5. Direitos do titular (acesso, correção, exclusão)
6. Segurança dos dados
7. Retenção de dados
8. Alterações na política
9. Contato do encarregado de dados
10. Como exercer seus direitos

Baseie-se na Lei Geral de Proteção de Dados (LGPD). Formate em HTML com tags h2, h3, p, ul, li.`,

    returns: `Gere uma Política de Trocas e Devoluções para um e-commerce brasileiro.
${baseContext}

A página deve incluir:
1. Direito de arrependimento (7 dias - CDC)
2. Condições para troca
3. Condições para devolução
4. Produtos com defeito
5. Prazo para solicitação
6. Como solicitar troca/devolução
7. Custos de frete
8. Prazo para estorno/reembolso
9. Produtos não elegíveis
10. Contato

Baseie-se no Código de Defesa do Consumidor. Formate em HTML com tags h2, h3, p, ul, li.`,

    shipping: `Gere uma Política de Envio para um e-commerce brasileiro.
${baseContext}

A página deve incluir:
1. Formas de envio disponíveis
2. Prazos de entrega
3. Cálculo do frete
4. Área de cobertura
5. Rastreamento de pedidos
6. Problemas na entrega
7. Endereço incorreto
8. Tentativas de entrega
9. Frete grátis (se aplicável)
10. Contato

Formate em HTML com tags h2, h3, p, ul, li.`,
  };

  return prompts[policyType.type] || prompts.terms;
}

async function populateFooterMenu(supabase: any, storeId: string, policies: any[]) {
  try {
    // Find or create footer menu
    let { data: footerMenu } = await supabase
      .from("store_menus")
      .select("id")
      .eq("store_id", storeId)
      .eq("location", "footer")
      .single();

    if (!footerMenu) {
      const { data: newMenu } = await supabase
        .from("store_menus")
        .insert({ store_id: storeId, name: "Menu Rodapé", location: "footer" })
        .select("id")
        .single();
      footerMenu = newMenu;
    }

    if (!footerMenu) return;

    // Get current max position
    const { data: existingItems } = await supabase
      .from("store_menu_items")
      .select("position, url")
      .eq("menu_id", footerMenu.id)
      .order("position", { ascending: false })
      .limit(1);

    let nextPosition = (existingItems?.[0]?.position || 0) + 1;

    // Check which policies are already in the menu
    const { data: currentItems } = await supabase
      .from("store_menu_items")
      .select("url, is_system")
      .eq("menu_id", footerMenu.id);

    const existingUrls = new Set((currentItems || []).map((i: any) => i.url));

    // Add each policy as a menu item if not already present
    for (const policy of policies) {
      const policyUrl = `/pagina/${policy.slug}`;
      if (existingUrls.has(policyUrl)) continue;

      await supabase
        .from("store_menu_items")
        .insert({
          menu_id: footerMenu.id,
          title: policy.title,
          url: policyUrl,
          link_type: "custom",
          position: nextPosition,
          is_active: true,
          is_system: true,
        });

      nextPosition++;
    }
  } catch (err) {
    console.error("Error populating footer menu:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, policyTypes } = await req.json();
    
    if (!storeId) {
      return new Response(JSON.stringify({ error: "Store ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("merchant_id", user.id)
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Store not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check required fields
    const missingFields: string[] = [];
    if (!store.business_name && !store.name) missingFields.push("Nome da empresa");
    if (!store.document) missingFields.push("CPF/CNPJ");
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Campos obrigatórios não preenchidos",
        missingFields 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate policies
    const typesToGenerate = policyTypes 
      ? POLICY_TYPES.filter(p => policyTypes.includes(p.type))
      : POLICY_TYPES;

    const generatedPolicies = [];

    for (const policyType of typesToGenerate) {
      const prompt = buildPrompt(store as StoreData, policyType);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "Você é um advogado especialista em direito do consumidor e proteção de dados no Brasil. Gere páginas de políticas profissionais, claras e em conformidade com a legislação brasileira. Responda APENAS com o conteúdo HTML da página, sem explicações adicionais, sem blocos de código markdown.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        console.error(`AI error for ${policyType.type}:`, await response.text());
        continue;
      }

      const aiData = await response.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      
      // Clean markdown code blocks if present
      content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

      // Generate a short summary for product page display
      let summary = "";
      try {
        const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "Você é um especialista em UX de e-commerce. Crie um resumo CURTO e objetivo de uma política para exibir na página do produto. Máximo 3-4 parágrafos curtos. Use HTML simples (p, strong, ul, li). Foque nos pontos mais importantes para o consumidor decidir a compra. Seja direto e claro. Responda APENAS com o HTML, sem explicações.",
              },
              { role: "user", content: `Resuma esta política de "${policyType.title}" para exibir na página do produto de um e-commerce. O resumo deve ser curto, claro e focado no que o cliente precisa saber antes de comprar:\n\n${content}` },
            ],
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          summary = summaryData.choices?.[0]?.message?.content || "";
          summary = summary.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
        }
      } catch (err) {
        console.error(`Error generating summary for ${policyType.type}:`, err);
      }

      // Upsert policy
      const { data: policy, error: policyError } = await supabase
        .from("store_policies")
        .upsert({
          store_id: storeId,
          policy_type: policyType.type,
          title: policyType.title,
          slug: policyType.slug,
          content: content,
          summary: summary || null,
          is_published: true,
          is_auto_generated: true,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "store_id,policy_type" })
        .select()
        .single();

      if (policyError) {
        console.error(`Error saving ${policyType.type}:`, policyError);
      } else {
        generatedPolicies.push(policy);
      }
    }

    // Update store
    await supabase
      .from("stores")
      .update({
        policies_auto_generated: true,
        policies_generated_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    // Auto-populate footer menu with policy links
    if (generatedPolicies.length > 0) {
      await populateFooterMenu(supabase, storeId, generatedPolicies);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      policies: generatedPolicies,
      count: generatedPolicies.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});