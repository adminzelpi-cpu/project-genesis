import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStorePublicUrl } from "../_shared/storeUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// User-agent patterns for social media crawlers / bots
const BOT_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "WhatsApp",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "Pinterest",
  "Googlebot",
  "bingbot",
  "Discordbot",
];

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((p) => userAgent.includes(p));
}

const SITE_URL = "https://zelpi.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userAgent = req.headers.get("user-agent") || "";

    // Only intercept bot requests
    if (!isBot(userAgent)) {
      // Redirect real users to the SPA
      const path = url.searchParams.get("path") || "/";
      return Response.redirect(`${SITE_URL}${path}`, 302);
    }

    const path = url.searchParams.get("path") || "/";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the path to determine page type
    // /store/{slug} - Home
    // /store/{slug}/product/{productSlug} - Product
    // /store/{slug}/category/{categorySlug} - Category
    const storeMatch = path.match(/^\/store\/([^/]+)/);
    if (!storeMatch) {
      return buildHtml({
        title: "Zelpi - Plataforma de E-commerce",
        description: "Crie sua loja online com a Zelpi.",
        url: `${SITE_URL}${path}`,
      });
    }

    const storeSlug = storeMatch[1];

    // Fetch store info
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, logo_url, favicon_url, slug")
      .eq("slug", storeSlug)
      .single();

    if (!store) {
      return buildHtml({
        title: "Loja não encontrada",
        description: "A loja que você procura não foi encontrada.",
        url: `${SITE_URL}${path}`,
      });
    }

    // Resolve canonical store URL (custom domain → fallback to <slug>.zelpi.com.br)
    const storeBaseUrl = await getStorePublicUrl(supabase, { id: store.id, slug: store.slug });
    // Path inside the store (strip /store/<slug> prefix so it works on custom domains too)
    const storePath = path.replace(`/store/${storeSlug}`, "") || "/";
    const canonicalUrl = `${storeBaseUrl}${storePath}`;

    // Product page
    const productMatch = path.match(/\/product\/(.+)/);
    if (productMatch) {
      const productSlugFull = productMatch[1].split("?")[0];
      // Extract product_code from slug (last part after last hyphen that's a number)
      const codeMatch = productSlugFull.match(/-(\d+)$/);
      const productCode = codeMatch ? parseInt(codeMatch[1]) : null;

      // Extract ?cor= param for color variation image
      const corMatch = path.match(/[?&]cor=(\d+)/);
      const colorValueCode = corMatch ? parseInt(corMatch[1]) : null;

      let product = null;

      if (productCode) {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, meta_title, meta_description, images, price, sale_price, slug, product_code")
          .eq("store_id", store.id)
          .eq("product_code", productCode)
          .eq("is_active", true)
          .single();
        product = data;
      }

      if (!product) {
        // Fallback: try by slug
        const baseSlug = codeMatch ? productSlugFull.replace(/-\d+$/, "") : productSlugFull;
        const { data } = await supabase
          .from("products")
          .select("id, name, description, meta_title, meta_description, images, price, sale_price, slug, product_code")
          .eq("store_id", store.id)
          .eq("slug", baseSlug)
          .eq("is_active", true)
          .single();
        product = data;
      }

      if (product) {
        let ogImage: string | undefined;
        // Normalize images: accept string[] or {url: string}[]
        const rawImages = Array.isArray(product.images) ? product.images : [];
        const productImages = rawImages
          .map((i: any) => (typeof i === "string" ? i : i?.url))
          .filter(Boolean) as string[];

        // Try to get image from variation (color-specific)
        if (colorValueCode !== null) {
          // Find the color attribute value by value_code
          const { data: colorVal } = await supabase
            .from("attribute_values")
            .select("id")
            .eq("value_code", colorValueCode)
            .maybeSingle();

          if (colorVal) {
            // Find variation with this color
            const { data: variations } = await supabase
              .from("product_variations_v2")
              .select("image_url, images")
              .eq("product_id", product.id)
              .eq("is_active", true);

            if (variations) {
              for (const v of variations) {
                const attrs = v.attributes as Record<string, string> | null;
                if (attrs && Object.values(attrs).includes(colorVal.id)) {
                  const varImagesRaw = Array.isArray(v.images) ? v.images : [];
                  const varImages = varImagesRaw.map((i: any) => (typeof i === "string" ? i : i?.url)).filter(Boolean);
                  ogImage = varImages[0] as string || v.image_url || undefined;
                  break;
                }
              }
            }
          }
        }

        // Fallback to product images, then first variation images, then store logo
        if (!ogImage && productImages.length > 0) {
          ogImage = productImages[0];
        }
        if (!ogImage) {
          // Try first variation image
          const { data: firstVar } = await supabase
            .from("product_variations_v2")
            .select("image_url, images")
            .eq("product_id", product.id)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();
          if (firstVar) {
            const fvImagesRaw = Array.isArray(firstVar.images) ? firstVar.images : [];
            const fvImages = fvImagesRaw.map((i: any) => (typeof i === "string" ? i : i?.url)).filter(Boolean);
            ogImage = fvImages[0] as string || firstVar.image_url || undefined;
          }
        }
        if (!ogImage) ogImage = store.logo_url || undefined;

        // Price fallback: if product price is 0, use cheapest variation price
        let displayPrice = product.sale_price || product.price;
        if (!displayPrice) {
          const { data: minVar } = await supabase
            .from("product_variations_v2")
            .select("price, sale_price")
            .eq("product_id", product.id)
            .eq("is_active", true)
            .order("price", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (minVar) displayPrice = minVar.sale_price || minVar.price;
        }

        const priceStr = `R$ ${Number(displayPrice).toFixed(2).replace(".", ",")}`;
        // Strip HTML from both meta_description and description
        const stripHtml = (s: string | null | undefined) => s ? s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";
        const descRaw = stripHtml(product.meta_description) ||
          stripHtml(product.description).slice(0, 160);
        const description = descRaw || `${product.name} por ${priceStr} na ${store.name}`;

        const titleBase = (product as any).meta_title || product.name;
        return buildHtml({
          title: `${titleBase} | ${store.name}`,
          description,
          image: ogImage,
          url: canonicalUrl,
          type: "product",
          price: displayPrice,
          currency: "BRL",
          storeName: store.name,
          favicon: store.favicon_url,
        });
      }
    }

    // Category page
    const categoryMatch = path.match(/\/category\/(.+)/);
    if (categoryMatch) {
      const categorySlug = categoryMatch[1].split("?")[0];
      const { data: category } = await supabase
        .from("product_categories")
        .select("name, seo_title, seo_description, description")
        .eq("store_id", store.id)
        .eq("slug", categorySlug)
        .eq("is_active", true)
        .single();

      if (category) {
        const title = category.seo_title || category.name;
        const description = category.seo_description || category.description || 
          `Confira os produtos de ${category.name} na ${store.name}`;

        return buildHtml({
          title: `${title} | ${store.name}`,
          description,
          image: store.logo_url || undefined,
          url: canonicalUrl,
          storeName: store.name,
          favicon: store.favicon_url,
        });
      }
    }

    // Policy/institutional page: /store/{slug}/pagina/{policySlug}
    const policyMatch = path.match(/\/pagina\/(.+)/);
    if (policyMatch) {
      const policySlug = policyMatch[1].split("?")[0];
      const { data: policy } = await supabase
        .from("store_policies")
        .select("title, meta_title, meta_description, content")
        .eq("store_id", store.id)
        .eq("slug", policySlug)
        .eq("is_published", true)
        .maybeSingle();

      if (policy) {
        const stripHtml = (s: string | null | undefined) => s ? s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";
        const title = (policy as any).meta_title || policy.title;
        const description = (policy as any).meta_description || stripHtml(policy.content).slice(0, 160) || `${policy.title} - ${store.name}`;

        return buildHtml({
          title: `${title} | ${store.name}`,
          description,
          image: store.logo_url || undefined,
          url: canonicalUrl,
          storeName: store.name,
          favicon: store.favicon_url,
        });
      }
    }

    // Store home (default)
    return buildHtml({
      title: store.name,
      description: `Loja oficial ${store.name}. Confira nossos produtos e ofertas.`,
      image: store.logo_url || undefined,
      url: storeBaseUrl,
      storeName: store.name,
      favicon: store.favicon_url,
    });
  } catch (err) {
    console.error("[og-meta] Error:", err);
    return buildHtml({
      title: "Zelpi",
      description: "Plataforma de e-commerce inteligente.",
      url: SITE_URL,
    });
  }
});

interface HtmlParams {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
  price?: number;
  currency?: string;
  storeName?: string;
  favicon?: string;
}

function buildHtml(params: HtmlParams): Response {
  const { title, description, image, url, type, price, currency, storeName, favicon } = params;

  const faviconTag = favicon 
    ? `<link rel="icon" type="image/png" sizes="32x32" href="${escHtml(favicon)}" />
       <link rel="icon" type="image/png" sizes="16x16" href="${escHtml(favicon)}" />
       <link rel="apple-touch-icon" sizes="180x180" href="${escHtml(favicon)}" />
       <link rel="shortcut icon" href="${escHtml(favicon)}" />` 
    : "";

  const imageTag = image
    ? `<meta property="og:image" content="${escHtml(image)}" />
       <meta name="twitter:image" content="${escHtml(image)}" />`
    : "";

  const productTags = type === "product" && price != null
    ? `<meta property="product:price:amount" content="${price}" />
       <meta property="product:price:currency" content="${currency || 'BRL'}" />
       <meta property="og:type" content="product" />`
    : `<meta property="og:type" content="website" />`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  ${faviconTag}

  <!-- Open Graph -->
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:url" content="${escHtml(url)}" />
  ${imageTag}
  ${productTags}
  ${storeName ? `<meta property="og:site_name" content="${escHtml(storeName)}" />` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />

  <!-- Redirect real browsers -->
  <meta http-equiv="refresh" content="0;url=${escHtml(url)}" />
</head>
<body>
  <p>Redirecionando para <a href="${escHtml(url)}">${escHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
