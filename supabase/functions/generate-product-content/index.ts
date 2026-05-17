import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, shortDescription, descriptionStyle, lastProduct, existingCategories } = await req.json();
    
    if (!productName || !shortDescription) {
      return new Response(
        JSON.stringify({ error: "Nome do produto e descrição curta são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build style instructions
    let styleInstructions = "";
    if (descriptionStyle) {
      const lengthMap: Record<string, string> = {
        short: "1-2 parágrafos curtos",
        medium: "3-4 parágrafos médios",
        long: "5 ou mais parágrafos detalhados"
      };
      const formatMap: Record<string, string> = {
        paragraphs: "Use apenas parágrafos corridos, sem listas",
        bullets: "Use principalmente bullet points (•) para destacar informações",
        mixed: "Combine parágrafos introdutórios com listas de bullet points para detalhes"
      };
      const focusMap: Record<string, string> = {
        benefits: "Foque principalmente nos BENEFÍCIOS para o cliente (o que ele ganha)",
        features: "Foque principalmente nas CARACTERÍSTICAS TÉCNICAS do produto",
        balanced: "Balance entre benefícios para o cliente e características técnicas"
      };
      const toneMap: Record<string, string> = {
        professional: "Tom profissional, técnico e formal",
        casual: "Tom casual, amigável e próximo",
        persuasive: "Tom persuasivo, empolgante e que convida à compra. Use gatilhos de desejo, escassez sutil e urgência. Destaque transformação e resultado que o cliente terá."
      };

      styleInstructions = `
ESTILO DA DESCRIÇÃO (SIGA RIGOROSAMENTE):
- Tamanho: ${lengthMap[descriptionStyle.length] || lengthMap.medium}
- Formato: ${formatMap[descriptionStyle.format] || formatMap.mixed}
- Foco: ${focusMap[descriptionStyle.focus] || focusMap.benefits}
- Tom: ${toneMap[descriptionStyle.tone] || toneMap.persuasive}
- Call-to-action: ${descriptionStyle.includeCTA !== false ? "Incluir um convite à ação no final" : "Não incluir call-to-action"}

INSTRUÇÕES DE FORMATAÇÃO HTML ESPECÍFICAS PARA O FORMATO ESCOLHIDO:
${descriptionStyle.format === 'paragraphs' ? `
- Use APENAS tags <p> para parágrafos
- Use <strong> para destacar palavras-chave importantes dentro dos parágrafos
- NÃO use listas (<ul>, <li>), apenas parágrafos corridos
- Exemplo: <p>Este produto oferece <strong>qualidade superior</strong> e design moderno.</p>` : ''}
${descriptionStyle.format === 'bullets' ? `
- Use principalmente <ul> e <li> para listas
- Use <strong> dentro de <li> para destacar labels
- Pode incluir 1 parágrafo introdutório em <p> no início
- Exemplo: <p>Principais características:</p><ul><li><strong>Material:</strong> Algodão 100%</li><li><strong>Design:</strong> Moderno</li></ul>` : ''}
${descriptionStyle.format === 'mixed' ? `
- Combine <p> para parágrafos introdutórios e conclusivos
- Use <ul> e <li> para listas de características
- Use <strong> dentro de <li> para destacar labels
- Exemplo: <p>Texto introdutório</p><ul><li><strong>Material:</strong> Algodão</li></ul><p>Texto conclusivo</p>` : ''}`;
    }

    // Build pattern matching instructions
    let patternInstructions = "";
    if (lastProduct) {
      patternInstructions = `
MANTER PADRÃO DO PRODUTO ANTERIOR:
O usuário acabou de criar este produto: "${lastProduct.name}"
Com a descrição: "${lastProduct.description?.substring(0, 200)}..."

IMPORTANTE: Se o novo produto for similar (mesma categoria, apenas cor/tamanho diferente), 
mantenha o MESMO PADRÃO de nome e descrição, alterando apenas o que for diferente.
Exemplo: se o anterior era "Camisa polo básica em malha piquet preta masculina" 
e o novo é amarelo, gere "Camisa polo básica em malha piquet amarela masculina".`;
    }

    // Build category instructions
    let categoryInstructions = "";
    if (existingCategories && existingCategories.length > 0) {
      const catNames = existingCategories.map((c: any) => `"${c.name}" (id: ${c.id})`).join(", ");
      categoryInstructions = `
CATEGORIAS EXISTENTES NA LOJA: ${catNames}

Para "suggestedCategory":
- Se alguma das categorias existentes se encaixa bem, retorne: { "existingId": "id-da-categoria", "name": "nome-dela" }
- Se nenhuma se encaixa, sugira uma nova: { "existingId": null, "name": "Nome da Nova Categoria" }
- Prefira SEMPRE usar categorias existentes quando fizer sentido.`;
    } else {
      categoryInstructions = `
Não existem categorias na loja ainda. Para "suggestedCategory", sugira uma nova categoria adequada:
{ "existingId": null, "name": "Nome da Categoria Sugerida" }`;
    }

    const prompt = `Você é um especialista em e-commerce e SEO. Com base nas informações abaixo, gere conteúdo otimizado para um produto:

Produto base: ${productName}
Descrição curta: ${shortDescription}
${styleInstructions}
${patternInstructions}
${categoryInstructions}

Gere o seguinte conteúdo em formato JSON:
{
  "productTitle": "Nome/título profissional e otimizado do produto (baseado no produto base fornecido, mas refinado)",
  "fullDescription": "Descrição completa em HTML formatado seguindo EXATAMENTE o estilo solicitado",
  "metaTitle": "Título SEO otimizado (máximo 60 caracteres, inclua palavra-chave principal)",
  "metaDescription": "Meta description atrativa (máximo 160 caracteres, inclua call-to-action)",
  "suggestedCategory": { "existingId": "id ou null", "name": "Nome da Categoria" },
  "aiSearchContent": "Conteúdo otimizado para IA (ChatGPT, Perplexity): descrição estruturada com bullet points, especificações técnicas, casos de uso, público-alvo. Seja direto e factual.",
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "nome do produto",
    "description": "descrição do produto",
    "category": "categoria apropriada"
  },
  "imageAltTags": ["alt tag 1 descritiva", "alt tag 2 descritiva", "alt tag 3 descritiva"]
}

FORMATAÇÃO HTML CRÍTICA para fullDescription:
- A descrição DEVE ser gerada em HTML PURO, pronta para ser exibida em um editor visual
- Use APENAS as seguintes tags: <p>, <strong>, <ul>, <li>, <h3>
- NUNCA use markdown, asteriscos, ou formatação de texto puro
- NUNCA use <br>, <div>, <span>, CSS inline, ou outras tags
- Para parágrafos: <p>texto do parágrafo</p>
- Para destacar palavras importantes: <strong>palavra</strong> (dentro de <p> ou <li>)
- Para títulos de seção (opcional): <h3>Título da Seção</h3>
- Para listas: <ul><li><strong>Label:</strong> descrição</li></ul>

Exemplo formato PARÁGRAFOS (paragraphs):
<p>Este produto oferece <strong>qualidade superior</strong> e <strong>design moderno</strong>.</p>
<p>Ideal para quem busca <strong>conforto</strong> e <strong>durabilidade</strong> no dia a dia.</p>

Exemplo formato BULLETS (bullets):
<p>Principais características do produto:</p>
<ul>
<li><strong>Material:</strong> Algodão 100% de alta qualidade</li>
<li><strong>Durabilidade:</strong> Alta resistência ao uso diário</li>
<li><strong>Conforto:</strong> Tecido macio e respirável</li>
</ul>

Exemplo formato MISTO (mixed):
<p>Este produto oferece <strong>qualidade superior</strong> e design moderno.</p>
<h3>Principais Características:</h3>
<ul>
<li><strong>Material:</strong> Algodão 100% de alta qualidade</li>
<li><strong>Design:</strong> Estilo contemporâneo e versátil</li>
<li><strong>Conforto:</strong> Tecido macio e respirável</li>
</ul>
<p>Ideal para uso diário e ocasiões especiais.</p>

IMPORTANTE:
- Gere um productTitle profissional e otimizado baseado no produto base fornecido
- Siga RIGOROSAMENTE as instruções de estilo E formatação HTML da descrição
- Se houver padrão de produto anterior, mantenha consistência no nome e estrutura
- SEO tradicional: foco em palavras-chave, meta tags, título atrativo
- SEO para IA: foco em informações estruturadas, bullet points, dados técnicos claros
- Alt tags: descritivas e específicas para acessibilidade e SEO
- Responda APENAS com o JSON, sem texto adicional

TÉCNICAS DE COPYWRITING PARA CONVERSÃO (aplique naturalmente):
- Comece com o BENEFÍCIO principal que resolve uma dor ou desejo do cliente
- Use palavras sensoriais e emocionais (conforto, praticidade, elegância, segurança)
- Destaque diferenciais únicos com <strong> para facilitar escaneabilidade
- Estruture com hierarquia visual clara: título da seção → benefício → detalhe técnico
- Adapte o nível de linguagem ao tipo de produto (luxo = sofisticado, casual = amigável)
- A descrição deve ser fácil de ler rapidamente (scannable) em dispositivos móveis`;

    console.log("Chamando Lovable AI para gerar conteúdo...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em e-commerce, SEO e otimização para buscas por IA. Sempre responda com JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da Lovable AI:", response.status, errorText);
      throw new Error(`Erro ao gerar conteúdo: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta da IA recebida");

    let generatedContent = data.choices[0].message.content;
    
    // Remover markdown code blocks se existirem
    generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsedContent = JSON.parse(generatedContent);

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro em generate-product-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
