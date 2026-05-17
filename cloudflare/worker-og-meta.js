/**
 * Cloudflare Worker — OG + JSON-LD + Sitemap + Favicon dinâmico + Manifest + Canonical
 *
 * Melhorias v3 (skeleton + performance):
 * - Skeleton HTML estático injetado no <body> antes do React montar → zero tela branca
 * - resolveLcpImage paralelo com index.html e storeMeta (não bloqueia mais o streaming)
 * - window.__STORE_META__ expandido (name, favicon, logo) → React pode pular fetch inicial
 * - Todas as funcionalidades v2 preservadas (OG, JSON-LD, sitemap, favicon proxy,
 *   manifest, canonical, LCP preload, __STORE_SLUG__, feeds, SEO consolidation
 *   redirect zelpi → custom domain, robots.txt dinâmico, HTMLRewriter streaming,
 *   preconnect Supabase, redirect www → sem-www)
 */

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
  "ChatGPT",
  "GPTBot",
  "Google-Extended",
  "PerplexityBot",
  "ClaudeBot",
  "Bytespider",
  "Applebot",
  "YandexBot",
  "DuckDuckBot",
  "Baiduspider",
  "CCBot",
  "anthropic-ai",
  "cohere-ai",
];

function isBot(ua) {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function escHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(s) {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").trim();
}

function slugifyText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Skeleton HTML estático injetado antes do React montar ---
// Aparece no primeiro byte, some quando o React assume o #root.
// Usa cores neutras para funcionar em qualquer loja sem precisar do tema.
const STORE_SKELETON_HTML = `
<style>
  #zelpi-skeleton{position:fixed;inset:0;z-index:9999;background:#f5f5f5;display:flex;flex-direction:column;overflow:hidden;font-family:sans-serif}
  #zelpi-skeleton.hidden{display:none}
  .zsk-header{height:60px;background:#fff;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
  .zsk-logo{width:120px;height:32px;border-radius:6px;background:#e8e8e8;animation:zsk-pulse 1.4s ease-in-out infinite}
  .zsk-header-spacer{flex:1}
  .zsk-header-icon{width:32px;height:32px;border-radius:50%;background:#e8e8e8;animation:zsk-pulse 1.4s ease-in-out infinite}
  .zsk-banner{width:100%;height:200px;background:#e0e0e0;animation:zsk-pulse 1.4s ease-in-out infinite;flex-shrink:0}
  .zsk-body{flex:1;padding:16px;overflow:hidden}
  .zsk-section-title{height:20px;width:140px;border-radius:4px;background:#e8e8e8;animation:zsk-pulse 1.4s ease-in-out infinite;margin-bottom:16px}
  .zsk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(min-width:640px){.zsk-grid{grid-template-columns:repeat(3,1fr)}}
  @media(min-width:1024px){.zsk-grid{grid-template-columns:repeat(4,1fr)}}
  .zsk-card{border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .zsk-card-img{width:100%;padding-top:100%;background:#e8e8e8;animation:zsk-pulse 1.4s ease-in-out infinite}
  .zsk-card-body{padding:10px;display:flex;flex-direction:column;gap:6px}
  .zsk-card-name{height:14px;border-radius:3px;background:#e8e8e8;animation:zsk-pulse 1.4s ease-in-out infinite}
  .zsk-card-name.short{width:60%}
  .zsk-card-price{height:16px;width:50%;border-radius:3px;background:#e0e0e0;animation:zsk-pulse 1.4s ease-in-out infinite}
  @keyframes zsk-pulse{0%,100%{opacity:1}50%{opacity:.5}}
</style>
<div id="zelpi-skeleton">
  <div class="zsk-header">
    <div class="zsk-logo"></div>
    <div class="zsk-header-spacer"></div>
    <div class="zsk-header-icon"></div>
    <div class="zsk-header-icon"></div>
  </div>
  <div class="zsk-banner"></div>
  <div class="zsk-body">
    <div class="zsk-section-title"></div>
    <div class="zsk-grid">
      ${Array(8)
        .fill(
          `
        <div class="zsk-card">
          <div class="zsk-card-img"></div>
          <div class="zsk-card-body">
            <div class="zsk-card-name"></div>
            <div class="zsk-card-name short"></div>
            <div class="zsk-card-price"></div>
          </div>
        </div>`,
        )
        .join("")}
    </div>
  </div>
</div>
<script>
  (function(){
    // Remove o skeleton assim que o React renderizar conteúdo real no #root
    var sk = document.getElementById('zelpi-skeleton');
    if(!sk) return;
    var root = document.getElementById('root');
    if(!root){ sk.classList.add('hidden'); return; }
    var observer = new MutationObserver(function(){
      if(root.children.length > 0){
        sk.classList.add('hidden');
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true, subtree: false });
    // Fallback: remove após 8s para não ficar preso caso algo falhe
    setTimeout(function(){ sk.classList.add('hidden'); }, 8000);
  })();
</script>
`;

// --- JSON-LD builders ---
function buildProductJsonLd({
  product,
  store,
  canonicalUrl,
  canonicalBase,
  ogImage,
  displayPrice,
  categoryName,
  categorySlug,
  variation,
  productName,
}) {
  const name = productName || product.name;
  const inStock = variation?.stockQuantity == null || variation.stockQuantity > 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: stripHtml(product.description || product.meta_description || ""),
    url: canonicalUrl,
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      price: Number(displayPrice).toFixed(2),
      priceCurrency: "BRL",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: store.name },
      url: canonicalUrl,
    },
  };
  if (variation?.sku) jsonLd.sku = variation.sku;
  if (variation?.colorName) jsonLd.color = variation.colorName;
  if (ogImage) jsonLd.image = [ogImage];
  if (variation?.images && variation.images.length > 0) {
    jsonLd.image = variation.images;
  } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    jsonLd.image = product.images.map((img) => (typeof img === "string" ? img : img.url)).filter(Boolean);
  }
  const basePrice = variation?.price ?? product.price;
  const salePrice = variation?.salePrice ?? product.sale_price;
  if (salePrice && basePrice && salePrice < basePrice) {
    jsonLd.offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  const breadcrumbItems = [{ "@type": "ListItem", position: 1, name: store.name, item: canonicalBase }];
  if (categoryName && categorySlug) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: categoryName,
      item: `${canonicalBase}/categoria/${categorySlug}`,
    });
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name, item: canonicalUrl });
  } else {
    breadcrumbItems.push({ "@type": "ListItem", position: 2, name, item: canonicalUrl });
  }
  jsonLd.breadcrumb = { "@type": "BreadcrumbList", itemListElement: breadcrumbItems };

  return jsonLd;
}

function buildCategoryJsonLd({ category, store, canonicalUrl, canonicalBase }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.seo_title || category.name,
    description: category.seo_description || category.description || `Produtos de ${category.name}`,
    url: canonicalUrl,
    isPartOf: { "@type": "WebSite", name: store.name },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: store.name, item: canonicalBase },
        { "@type": "ListItem", position: 2, name: category.seo_title || category.name, item: canonicalUrl },
      ],
    },
  };
}

function buildStoreJsonLd({ store, canonicalBase }) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: canonicalBase,
    ...(store.logo_url ? { logo: store.logo_url } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalBase}/busca?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// --- Full HTML for bots ---
function buildFullHtml({
  title,
  description,
  image,
  url,
  type,
  price,
  currency,
  storeName,
  favicon,
  jsonLd,
  bodyContent,
  robots,
}) {
  const faviconTags = favicon
    ? `<link rel="icon" type="image/png" sizes="32x32" href="${escHtml(favicon)}">
  <link rel="icon" type="image/png" sizes="192x192" href="${escHtml(favicon)}">
  <link rel="apple-touch-icon" href="${escHtml(favicon)}">`
    : "";

  const imageTags = image
    ? `<meta property="og:image" content="${escHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${escHtml(image)}">`
    : "";

  const productTags =
    type === "product" && price != null
      ? `<meta property="product:price:amount" content="${Number(price).toFixed(2)}">
  <meta property="product:price:currency" content="${currency || "BRL"}">`
      : "";

  const jsonLdTag = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : "";
  const canonicalTag = url ? `<link rel="canonical" href="${escHtml(url)}">` : "";
  const robotsTag = robots ? `<meta name="robots" content="${escHtml(robots)}">` : "";
  const body = bodyContent || `<h1>${escHtml(title)}</h1>`;

  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta name="theme-color" content="#ffffff">
  ${faviconTags}
  ${canonicalTag}
  ${robotsTag}
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="${type === "product" ? "product" : "website"}">
  ${url ? `<meta property="og:url" content="${escHtml(url)}">` : ""}
  ${imageTags}
  ${productTags}
  ${storeName ? `<meta property="og:site_name" content="${escHtml(storeName)}">` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  ${jsonLdTag}
</head>
<body>${body}</body>
</html>`,
    { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=300" } },
  );
}

// --- Supabase fetch ---
async function supabaseFetch(env, table, query, cacheTtl = 300) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cf: { cacheTtl, cacheEverything: true },
  });
  if (!res.ok) return null;
  return res.json();
}

async function resolveStoreByCustomDomain(env, hostname) {
  const candidates = hostname.startsWith("www.") ? [hostname, hostname.replace(/^www\./, "")] : [hostname];

  for (const candidate of candidates) {
    const data = await supabaseFetch(
      env,
      "custom_domains",
      `select=domain,store_id,stores(id,slug,name,logo_url,favicon_url)&domain=eq.${encodeURIComponent(candidate)}&limit=1`,
      600,
    );
    if (data?.[0]?.stores) return data[0].stores;
  }

  return null;
}

async function getPrimaryVerifiedDomain(env, storeId) {
  const data = await supabaseFetch(
    env,
    "custom_domains",
    `select=domain,is_primary,is_verified,updated_at` +
      `&store_id=eq.${encodeURIComponent(storeId)}` +
      `&is_verified=eq.true` +
      `&order=is_primary.desc,updated_at.desc&limit=1`,
    300,
  );
  const domain = data?.[0]?.domain;
  return domain ? domain.replace(/\/+$/, "") : null;
}

async function resolveStoreBySlug(env, slug) {
  const data = await supabaseFetch(
    env,
    "stores",
    `select=id,name,slug,logo_url,favicon_url&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    600,
  );
  return data?.[0] || null;
}

async function resolveProduct(env, storeId, productSlugFull) {
  const codeMatch = productSlugFull.match(/-(\d+)$/);
  const productCode = codeMatch ? parseInt(codeMatch[1]) : null;
  const fields =
    "id,name,description,meta_description,meta_title,images,price,sale_price,slug,product_code,category_id,display_variations_separately";
  let product = null;
  if (productCode) {
    const data = await supabaseFetch(
      env,
      "products",
      `select=${fields}&store_id=eq.${storeId}&product_code=eq.${productCode}&is_active=eq.true&limit=1`,
      120,
    );
    product = data?.[0] || null;
  }
  if (!product) {
    const baseSlug = codeMatch ? productSlugFull.replace(/-\d+$/, "") : productSlugFull;
    const data = await supabaseFetch(
      env,
      "products",
      `select=${fields}&store_id=eq.${storeId}&slug=eq.${encodeURIComponent(baseSlug)}&is_active=eq.true&limit=1`,
      120,
    );
    product = data?.[0] || null;
  }
  return product;
}

async function getVariationDetails(env, storeId, productId, colorParam) {
  if (colorParam == null || colorParam === "") return null;
  const rawColorParam = String(colorParam);
  const numericColorCode = /^\d+$/.test(rawColorParam) ? Number(rawColorParam) : null;
  const slugColorParam = slugifyText(rawColorParam);

  const NON_VISUAL_KEYWORDS = [
    "tamanho",
    "voltagem",
    "capacidade",
    "volume",
    "quantidade",
    "peso",
    "potência",
    "potencia",
    "ml",
    "litro",
    "kg",
    "gramas",
    "watts",
    "volts",
    "amperes",
    "dimensão",
    "dimensao",
    "comprimento",
    "largura",
    "altura",
    "gb",
    "tb",
    "mb",
    "memória",
    "memoria",
    "armazenamento",
    "bateria",
    "mah",
  ];

  const [allAttributes, colorVals, variations] = await Promise.all([
    supabaseFetch(env, "attributes", `select=id,name,type&store_id=eq.${storeId}&limit=50`, 600),
    numericColorCode != null
      ? supabaseFetch(
          env,
          "attribute_values",
          `select=id,value,attribute_id&value_code=eq.${numericColorCode}&limit=50`,
          600,
        )
      : supabaseFetch(env, "attribute_values", `select=id,value,attribute_id&limit=500`, 600),
    supabaseFetch(
      env,
      "product_variations_v2",
      `select=image_url,images,attributes,sku,price,sale_price,stock_quantity&product_id=eq.${productId}&is_active=eq.true`,
      120,
    ),
  ]);
  if (!allAttributes?.length || !colorVals?.length || !variations?.length) return null;

  const visualAttributeIds = new Set(
    allAttributes
      .filter((attr) => {
        if (attr.type === "color") return true;
        if (attr.type === "size") return false;
        const nameLower = (attr.name || "").toLowerCase();
        return !NON_VISUAL_KEYWORDS.some((kw) => nameLower.includes(kw));
      })
      .map((attr) => attr.id)
      .filter(Boolean),
  );

  const matchingColorValues = colorVals.filter((value) => {
    if (!visualAttributeIds.has(value.attribute_id)) return false;
    if (numericColorCode != null) return true;
    return slugifyText(value.value) === slugColorParam;
  });
  const matchingColorValueIds = new Set(matchingColorValues.map((v) => v.id).filter(Boolean));
  const colorName = matchingColorValues[0]?.value || null;

  if (matchingColorValueIds.size === 0) return null;

  for (const v of variations) {
    const variationValueIds =
      v.attributes && typeof v.attributes === "object" ? Object.values(v.attributes).filter(Boolean) : [];

    if (variationValueIds.some((valueId) => matchingColorValueIds.has(valueId))) {
      const varImages = Array.isArray(v.images)
        ? v.images.map((i) => (typeof i === "string" ? i : i?.url)).filter(Boolean)
        : [];
      return {
        colorName,
        image: varImages[0] || v.image_url || null,
        images: varImages,
        sku: v.sku || null,
        price: v.price ?? null,
        salePrice: v.sale_price ?? null,
        stockQuantity: v.stock_quantity ?? null,
      };
    }
  }
  return { colorName, image: null, images: [], sku: null, price: null, salePrice: null, stockQuantity: null };
}

async function resolveCategory(env, storeId, categorySlug) {
  const data = await supabaseFetch(
    env,
    "product_categories",
    `select=id,name,seo_title,seo_description,description,slug&store_id=eq.${storeId}&slug=eq.${encodeURIComponent(categorySlug)}&is_active=eq.true&limit=1`,
    300,
  );
  return data?.[0] || null;
}

async function resolveCategoryById(env, categoryId) {
  if (!categoryId) return null;
  const data = await supabaseFetch(env, "product_categories", `select=name,slug&id=eq.${categoryId}&limit=1`, 600);
  return data?.[0] || null;
}

async function resolveStorePage(env, storeId, pageSlug) {
  const data = await supabaseFetch(
    env,
    "store_pages",
    `select=title,slug,content,meta_title,meta_description&store_id=eq.${storeId}&slug=eq.${encodeURIComponent(pageSlug)}&is_published=eq.true&limit=1`,
    300,
  );
  return data?.[0] || null;
}

async function getFirstVariationImage(env, productId) {
  const variations = await supabaseFetch(
    env,
    "product_variations_v2",
    `select=image_url,images&product_id=eq.${productId}&is_active=eq.true&order=id.asc&limit=10`,
    120,
  );
  if (!variations?.length) return null;
  for (const v of variations) {
    const varImages = Array.isArray(v.images)
      ? v.images.map((i) => (typeof i === "string" ? i : i?.url)).filter(Boolean)
      : [];
    if (varImages.length > 0) return varImages[0];
    if (v.image_url) return v.image_url;
  }
  return null;
}

// --- LCP image resolver ---
function toTransformedImageUrl(rawUrl, width = 400) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  if (rawUrl.includes("/storage/v1/render/image/")) return rawUrl;
  const marker = "/storage/v1/object/public/";
  const idx = rawUrl.indexOf(marker);
  if (idx === -1) return rawUrl;
  const prefix = rawUrl.slice(0, idx);
  const path = rawUrl.slice(idx + marker.length);
  return `${prefix}/storage/v1/render/image/public/${path}?width=${width}&quality=80&resize=contain`;
}

// === Mirror do front: src/features/storefront/lib/interleaveByParent.ts ===
// MUST stay in sync com aquele arquivo. Recriamos só os primeiros itens da
// sequência, suficientes para preload acima da dobra sem baixar a grade inteira.
//
// Mesmo seed daily, mesmo Fisher-Yates, mesmo weighted-shuffle com noise:
// se o front mudar a heurística, este bloco deve ser atualizado junto.
function lcpSeededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
  };
}
function lcpDailySeed(extra) {
  const t = new Date();
  return `${t.getUTCFullYear()}-${t.getUTCMonth()}-${t.getUTCDate()}-${extra}`;
}
function lcpProximityPenalty(distance) {
  if (distance === 0) return 1000;
  if (distance === 1) return 8;
  if (distance === 2) return 6;
  if (distance === 3) return 3;
  if (distance === 4) return 1.5;
  if (distance === 5) return 0.5;
  return 0;
}
/** Returns the virtual ids that the front will render first. */
function pickTopAfterInterleave(virtualIds, seedKey, limit = 4) {
  if (virtualIds.length <= 2) return virtualIds.slice(0, limit);
  const rng = lcpSeededRandom(lcpDailySeed(seedKey));
  // Group by parent (id before "_color_")
  const groupMap = new Map();
  const parentOrder = [];
  for (const id of virtualIds) {
    const idx = id.indexOf("_color_");
    const parentId = idx === -1 ? id : id.substring(0, idx);
    if (!groupMap.has(parentId)) {
      groupMap.set(parentId, []);
      parentOrder.push(parentId);
    }
    groupMap.get(parentId).push(id);
  }
  const hasMultiColorGroup = parentOrder.some((pid) => (groupMap.get(pid)?.length || 0) > 1);
  if (!hasMultiColorGroup) return virtualIds.slice(0, limit);
  // Fisher-Yates inside each group (matches front)
  const groups = parentOrder.map((pid) => {
    const arr = [...groupMap.get(pid)];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  // Weighted-shuffle — same scoring and same rng() call order as the front.
  const result = [];
  const totalItems = groups.reduce((sum, g) => sum + g.length, 0);
  const lastSeenAt = new Map();

  while (result.length < totalItems && result.length < limit) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < groups.length; i++) {
      if (groups[i].length === 0) continue;
      const lastAt = lastSeenAt.get(i);
      const distance = lastAt === undefined ? Infinity : result.length - lastAt;
      const remaining = groups[i].length;
      const noise = rng() * 4;
      const score = remaining - lcpProximityPenalty(distance) + noise;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const item = groups[bestIdx].shift();
    lastSeenAt.set(bestIdx, result.length);
    result.push(item);
  }

  return result.length ? result : virtualIds.slice(0, limit);
}

/** Mirror do hook useProductSeparation: gera os "virtual ids" como o front faria. */
async function buildCategoryVirtualGrid(env, storeId, categoryId) {
  const orFilter = `or=(category_id.eq.${categoryId},category_ids.cs.{${categoryId}})`;
  const products = await supabaseFetch(
    env,
    "products",
    `select=id,images,display_variations_separately,hide_parent_product&store_id=eq.${storeId}&is_active=eq.true&${orFilter}&order=created_at.desc&limit=12`,
    300,
  );
  if (!products?.length) return { items: [], productMap: new Map(), variationMap: new Map() };

  // Only fetch variations / attributes if at least one product needs separation
  const needsVariations = products.some((p) => p.display_variations_separately);
  const productIds = products.map((p) => p.id);

  let variations = [];
  let colorAttributeId = null;
  if (needsVariations) {
    const [variationsRes, attributesRes] = await Promise.all([
      supabaseFetch(
        env,
        "product_variations_v2",
        `select=id,product_id,image_url,images,attributes&product_id=in.(${productIds.join(",")})&is_active=eq.true`,
        120,
      ),
      supabaseFetch(env, "attributes", `select=id,name,type&store_id=eq.${storeId}`, 600),
    ]);
    variations = variationsRes || [];
    // Match findVisualAttributeId from front: prefer type=color, else first non-size visual
    const NON_VISUAL = [
      "tamanho",
      "voltagem",
      "capacidade",
      "volume",
      "quantidade",
      "peso",
      "potência",
      "potencia",
      "ml",
      "litro",
      "kg",
      "gramas",
      "watts",
      "volts",
      "amperes",
      "dimensão",
      "dimensao",
      "comprimento",
      "largura",
      "altura",
      "gb",
      "tb",
      "mb",
      "memória",
      "memoria",
      "armazenamento",
      "bateria",
      "mah",
    ];
    const attributes = attributesRes || [];
    const colorAttr = attributes.find((a) => a.type === "color");
    if (colorAttr) {
      colorAttributeId = colorAttr.id;
    } else {
      const visual = attributes.find((a) => {
        if (a.type === "size") return false;
        const n = (a.name || "").toLowerCase();
        return !NON_VISUAL.some((kw) => n.includes(kw));
      });
      colorAttributeId = visual?.id || null;
    }
  }

  const items = [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variationMap = new Map(); // colorValueId -> {productId, image}

  for (const product of products) {
    const productVariations = variations.filter((v) => v.product_id === product.id);
    const shouldSeparate = product.display_variations_separately && colorAttributeId;
    const hideParent = product.hide_parent_product !== false;

    if (shouldSeparate && productVariations.length > 0) {
      const colorGroups = new Map();
      for (const v of productVariations) {
        const attrs = v.attributes && typeof v.attributes === "object" ? v.attributes : {};
        const colorValueId = attrs[colorAttributeId];
        if (colorValueId) {
          if (!colorGroups.has(colorValueId)) colorGroups.set(colorValueId, []);
          colorGroups.get(colorValueId).push(v);
        }
      }
      for (const [colorValueId, colorVars] of colorGroups.entries()) {
        const virtualId = `${product.id}_color_${colorValueId}`;
        items.push(virtualId);
        // First image of first variation (matches getVariationImages logic)
        let img = null;
        for (const v of colorVars) {
          if (Array.isArray(v.images)) {
            for (const im of v.images) {
              const url = typeof im === "string" ? im : im?.url;
              if (url) {
                img = url;
                break;
              }
            }
            if (img) break;
          }
          if (v.image_url) {
            img = v.image_url;
            break;
          }
        }
        // Fallback to product first image
        if (!img && Array.isArray(product.images) && product.images[0]) {
          const f = product.images[0];
          img = typeof f === "object" ? f.url : f;
        }
        variationMap.set(virtualId, img);
      }
      if (!hideParent) items.push(product.id);
    } else {
      items.push(product.id);
    }
  }

  return { items, productMap, variationMap };
}

async function resolveLcpImages(env, store, pageUrl) {
  try {
    const pathname = typeof pageUrl === "string" ? pageUrl : pageUrl.pathname;
    const searchParams =
      typeof pageUrl === "string" ? new URL(`https://local${pageUrl}`).searchParams : pageUrl.searchParams;
    const productMatch = pathname.match(/^\/(?:product|produto)\/([^/?]+)/);
    if (productMatch) {
      const product = await resolveProduct(env, store.id, productMatch[1]);
      if (!product) return null;
      const colorParam = searchParams.get("cor");
      if (colorParam && product.display_variations_separately) {
        const variation = await getVariationDetails(env, store.id, product.id, colorParam);
        if (variation?.image) return [toTransformedImageUrl(variation.image, 800)].filter(Boolean);
      }
      const imgs = Array.isArray(product.images) ? product.images : [];
      const first = imgs[0];
      const raw = first
        ? typeof first === "object"
          ? first.url
          : first
        : await getFirstVariationImage(env, product.id);
      return [toTransformedImageUrl(raw, 800)].filter(Boolean);
    }

    const categoryMatch = pathname.match(/^\/(?:category|categoria)\/([^/?]+)/);
    if (categoryMatch) {
      const categorySlug = categoryMatch[1];
      const category = await resolveCategory(env, store.id, categorySlug);
      if (!category) return null;

      // Build the same virtual grid the front will render, then pick what
      // ends up in slot 0 using the SAME daily seed.
      // Seed key MUST match src/pages/storefront/[storeSlug]/category/[categorySlug].tsx
      const seedKey = `category-page-${categorySlug}`;
      const { items, productMap, variationMap } = await buildCategoryVirtualGrid(env, store.id, category.id);
      if (!items.length) return null;

      const firstIds = pickTopAfterInterleave(items, seedKey, 4);
      if (!firstIds.length) return null;

      // Resolve the actual image URL for that virtual id
      const urls = [];
      for (const firstId of firstIds) {
        let raw = null;
        if (firstId.includes("_color_")) {
          raw = variationMap.get(firstId) || null;
        } else {
          const p = productMap.get(firstId);
          if (p) {
            const imgs = Array.isArray(p.images) ? p.images : [];
            const first = imgs[0];
            raw = first ? (typeof first === "object" ? first.url : first) : await getFirstVariationImage(env, p.id);
          }
        }
        const transformed = toTransformedImageUrl(raw, 400);
        if (transformed && !urls.includes(transformed)) urls.push(transformed);
      }
      return urls;
    }

    if (pathname === "/" || pathname === "") {
      const banners = await supabaseFetch(
        env,
        "store_banners",
        `select=image_url,mobile_image_url&store_id=eq.${store.id}&is_active=eq.true&order=position.asc&limit=1`,
        300,
      );
      const b = banners?.[0];
      if (b) return b.mobile_image_url || b.image_url || null;
      return store.logo_url || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// --- Sitemap ---
async function buildSitemap(env, store, canonicalBase) {
  const [products, categories] = await Promise.all([
    supabaseFetch(
      env,
      "products",
      `select=slug,product_code,updated_at&store_id=eq.${store.id}&is_active=eq.true&limit=1000`,
      300,
    ),
    supabaseFetch(
      env,
      "product_categories",
      `select=slug,updated_at&store_id=eq.${store.id}&is_active=eq.true&limit=500`,
      300,
    ),
  ]);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${escHtml(canonicalBase)}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`;
  if (categories?.length) {
    for (const cat of categories) {
      const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split("T")[0] : "";
      xml += `\n<url><loc>${escHtml(canonicalBase)}/category/${escHtml(cat.slug)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    }
  }
  if (products?.length) {
    for (const p of products) {
      const slug = p.product_code ? `${p.slug}-${p.product_code}` : p.slug;
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : "";
      xml += `\n<url><loc>${escHtml(canonicalBase)}/product/${escHtml(slug)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>daily</changefreq><priority>0.6</priority></url>`;
    }
  }
  xml += `\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml;charset=utf-8", "Cache-Control": "public,max-age=3600" },
  });
}

function buildRobotsTxt(canonicalBase, { blockAll = false } = {}) {
  const body = blockAll
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${canonicalBase}/sitemap.xml`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain;charset=utf-8", "Cache-Control": "public,max-age=86400" },
  });
}

const storeMetaCache = new Map();

async function resolveStoreMeta(env, storeSlug) {
  if (storeMetaCache.has(storeSlug)) return storeMetaCache.get(storeSlug);
  const data = await supabaseFetch(
    env,
    "stores",
    `select=name,favicon_url,logo_url&slug=eq.${encodeURIComponent(storeSlug)}&limit=1`,
    1800,
  );
  const store = data?.[0] || null;
  const result = {
    name: store?.name || null,
    favicon: store?.favicon_url || store?.logo_url || null,
    logo: store?.logo_url || null,
  };
  storeMetaCache.set(storeSlug, result);
  return result;
}

// Favicon via PROXY
async function serveFavicon(env, storeSlug) {
  const meta = await resolveStoreMeta(env, storeSlug);
  if (meta.favicon) {
    const img = await fetch(meta.favicon, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (img.ok) {
      const contentType = img.headers.get("Content-Type") || "image/png";
      return new Response(img.body, {
        status: 200,
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400, immutable" },
      });
    }
  }
  return null;
}

async function serveManifest(env, storeSlug, canonicalBase) {
  const meta = await resolveStoreMeta(env, storeSlug);
  const manifest = {
    name: meta.name || "Loja",
    short_name: meta.name || "Loja",
    start_url: canonicalBase || "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: meta.favicon
      ? [
          { src: "/favicon.ico", sizes: "192x192", type: "image/png" },
          { src: "/favicon.ico", sizes: "512x512", type: "image/png" },
        ]
      : [],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json;charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

/**
 * Injeta metadados da loja no HTML usando HTMLRewriter (streaming).
 *
 * MELHORIAS v3:
 * - Injeta skeleton HTML estático no <body> → aparece antes do React montar
 * - Injeta window.__STORE_META__ com name, favicon e logo → React pode pular
 *   o fetch inicial de resolução da loja, evitando o double render
 * - resolveLcpImage agora roda em paralelo (não bloqueia mais aqui)
 *
 * Tags preservadas / injetadas (igual v2):
 * - Remove favicons genéricas da plataforma (Lovable/Zelpi)
 * - Injeta /favicon.ico da loja (serve via proxy no Worker)
 * - Injeta /manifest.json dinâmico
 * - Injeta canonical correto
 * - Injeta robots se necessário
 * - Injeta preload LCP (imagem mais provável de ser o LCP)
 * - Injeta preconnect Supabase (reduz latência dos fetches React)
 * - Injeta window.__STORE_SLUG__ (evita round-trip de resolução no cliente)
 * - Corrige title, description, og:*, twitter:* para a loja
 */
function injectStoreMetaInHtml(response, storeMeta, canonicalUrl, robots, opts = {}) {
  const { lcpImages = [], storeSlug = null, supabaseUrl = null } = opts;
  const preloadImages = Array.isArray(lcpImages) ? lcpImages : lcpImages ? [lcpImages] : [];

  const safeName = storeMeta.name ? escHtml(storeMeta.name) : null;
  const safeDesc = safeName ? escHtml(`Loja oficial ${storeMeta.name}. Confira nossos produtos e ofertas.`) : null;
  const safeCanonical = canonicalUrl ? escHtml(canonicalUrl) : null;

  // Tags a injetar antes do </head>
  const headAppend = [];

  // Favicons da loja (proxy via /favicon.ico)
  headAppend.push(
    `<link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico">`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon.ico">`,
    `<link rel="apple-touch-icon" href="/favicon.ico">`,
    `<link rel="manifest" href="/manifest.json">`,
  );

  if (safeCanonical) {
    headAppend.push(`<link rel="canonical" href="${safeCanonical}">`);
  }

  if (robots) {
    headAppend.push(`<meta name="robots" content="${escHtml(robots)}">`);
  }

  // Preload LCP — browser baixa as imagens mais prováveis ANTES de parsear o bundle React
  for (const [index, image] of preloadImages.slice(0, 4).entries()) {
    headAppend.push(
      `<link rel="preload" as="image" href="${escHtml(image)}" fetchpriority="${index === 0 ? "high" : "low"}">`,
    );
  }

  // Preconnect Supabase — abre TCP+TLS antes do React fazer os primeiros fetches
  if (supabaseUrl) {
    headAppend.push(
      `<link rel="preconnect" href="${escHtml(supabaseUrl)}">`,
      `<link rel="dns-prefetch" href="${escHtml(supabaseUrl)}">`,
    );
  }

  // __STORE_SLUG__ + __STORE_META__ inline script
  // React pode ler window.__STORE_META__ para pular o fetch inicial da loja,
  // evitando o remount que causava o double skeleton.
  const storeMataPayload = JSON.stringify({
    slug: storeSlug,
    name: storeMeta.name || null,
    favicon: storeMeta.favicon || null,
    logo: storeMeta.logo || null,
  });
  if (storeSlug) {
    headAppend.push(
      `<script>window.__STORE_SLUG__=${JSON.stringify(storeSlug)};window.__STORE_META__=${storeMataPayload};</script>`,
    );
  }

  // OG fallback tags
  if (safeName) {
    headAppend.push(`<meta property="og:site_name" content="${safeName}">`);
  }

  return (
    new HTMLRewriter()
      // Remove tags genéricas da plataforma que serão recolocadas abaixo
      .on(
        'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="manifest"], link[rel="canonical"]',
        {
          element(el) {
            el.remove();
          },
        },
      )
      // Remove preload default da landing page. Ele não existe na loja e compete
      // com o LCP real de produto/categoria quando o HTML base é reutilizado.
      .on('link[rel="preload"][as="image"]', {
        element(el) {
          const href = el.getAttribute("href") || "";
          if (href.includes("/images/hero-dashboard.jpg")) el.remove();
        },
      })
      // Remove robots existente (vamos reinjetar o correto)
      .on('meta[name="robots"]', {
        element(el) {
          el.remove();
        },
      })
      // Remove og:site_name existente (vamos reinjetar)
      .on('meta[property="og:site_name"]', {
        element(el) {
          el.remove();
        },
      })
      // Remove theme-color existente (vamos reinjetar)
      .on('meta[name="theme-color"]', {
        element(el) {
          el.remove();
        },
      })
      // Corrige <title>
      .on("title", {
        element(el) {
          if (safeName) el.setInnerContent(safeName);
        },
      })
      // Corrige meta description
      .on('meta[name="description"]', {
        element(el) {
          if (safeDesc) el.setAttribute("content", safeDesc);
        },
      })
      // Corrige og:title
      .on('meta[property="og:title"]', {
        element(el) {
          if (safeName) el.setAttribute("content", safeName);
        },
      })
      // Corrige og:description
      .on('meta[property="og:description"]', {
        element(el) {
          if (safeDesc) el.setAttribute("content", safeDesc);
        },
      })
      // Corrige og:url
      .on('meta[property="og:url"]', {
        element(el) {
          if (safeCanonical) el.setAttribute("content", safeCanonical);
        },
      })
      // Corrige twitter:title
      .on('meta[name="twitter:title"]', {
        element(el) {
          if (safeName) el.setAttribute("content", safeName);
        },
      })
      // Corrige twitter:description
      .on('meta[name="twitter:description"]', {
        element(el) {
          if (safeDesc) el.setAttribute("content", safeDesc);
        },
      })
      // Injeta todas as tags novas antes do </head> + theme-color
      .on("head", {
        element(el) {
          el.append(`<meta name="theme-color" content="#ffffff">`, { html: true });
          for (const tag of headAppend) {
            el.append(tag, { html: true });
          }
        },
      })
      // === NOVO v3: injeta skeleton estático no início do <body> ===
      // Aparece antes do React montar, eliminando a tela branca.
      // O script inline remove o skeleton assim que o #root tiver filhos.
      .on("body", {
        element(el) {
          el.prepend(STORE_SKELETON_HTML, { html: true });
        },
      })
      .transform(response)
  );
}

function buildProductBody(product, store, priceStr) {
  const desc = stripHtml(product.description || "");
  const images = Array.isArray(product.images) ? product.images : [];
  const imgTags = images
    .slice(0, 5)
    .map((img) => {
      const src = typeof img === "string" ? img : img.url;
      return src ? `<img src="${escHtml(src)}" alt="${escHtml(product.name)}">` : "";
    })
    .join("\n    ");
  return `<article><h1>${escHtml(product.name)}</h1><p>Preço: ${priceStr}</p><p>Loja: ${escHtml(store.name)}</p>${desc ? `<p>${escHtml(desc)}</p>` : ""}${imgTags}</article>`;
}

// --- Main handler ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const userAgent = request.headers.get("user-agent") || "";
    const siteDomain = env.SITE_DOMAIN || "zelpi.com.br";
    const pagesDomain = env.PAGES_DOMAIN || "zelpi.pages.dev";

    // === 1. Main domain / www / admin → proxy direto ===
    if (hostname === siteDomain || hostname === `www.${siteDomain}` || hostname === `admin.${siteDomain}`) {
      return fetch(`https://${pagesDomain}${url.pathname}${url.search}`, {
        cf: { cacheTtl: 60, cacheEverything: true },
      });
    }

    // === 2. Identificar loja ===
    let storeSlug = null;
    let store = null;
    let isCustomDomain = false;

    if (hostname.endsWith(`.${siteDomain}`)) {
      storeSlug = hostname.replace(`.${siteDomain}`, "");
      if (!storeSlug || storeSlug === "www" || storeSlug === "admin") storeSlug = null;
    }

    if (!storeSlug) {
      store = await resolveStoreByCustomDomain(env, hostname);
      if (store) {
        storeSlug = store.slug;
        isCustomDomain = true;

        // === 2.1 Redirect www → sem-www para domínios customizados ===
        if (hostname.startsWith("www.")) {
          const bareHostname = hostname.replace(/^www\./, "");
          const canonicalDomain = bareHostname;
          const targetUrl = `https://${canonicalDomain}${url.pathname}${url.search}`;
          return new Response(null, {
            status: 301,
            headers: {
              Location: targetUrl,
              "Cache-Control": "public, max-age=3600",
              "X-Redirect-Reason": "www-to-bare-custom-domain",
            },
          });
        }
      }
    }

    if (!storeSlug) {
      return fetch(`https://${pagesDomain}${url.pathname}${url.search}`, {
        cf: { cacheTtl: 60, cacheEverything: true },
      });
    }

    // === 2.5. Redirect <slug>.zelpi.com.br → custom domain (SEO consolidation) ===
    let primaryVerifiedDomain = null;
    if (!isCustomDomain && hostname.endsWith(`.${siteDomain}`)) {
      if (!store && storeSlug) store = await resolveStoreBySlug(env, storeSlug);
      if (store?.id) primaryVerifiedDomain = await getPrimaryVerifiedDomain(env, store.id);

      if (primaryVerifiedDomain && primaryVerifiedDomain.toLowerCase() !== hostname) {
        const targetUrl = `https://${primaryVerifiedDomain}${url.pathname}${url.search}`;
        return new Response(null, {
          status: 301,
          headers: {
            Location: targetUrl,
            "Cache-Control": "public, max-age=3600",
            "X-Redirect-Reason": "custom-domain-canonical",
          },
        });
      }
    }

    const canonicalHost = isCustomDomain ? hostname : primaryVerifiedDomain || `${storeSlug}.${siteDomain}`;
    const canonicalBase = `https://${canonicalHost}`;
    const robotsDirective = !isCustomDomain && primaryVerifiedDomain ? "noindex,follow" : null;

    if (url.pathname === "/robots.txt") {
      const blockAll = !isCustomDomain && !!primaryVerifiedDomain;
      return buildRobotsTxt(canonicalBase, { blockAll });
    }

    if (url.pathname === "/sitemap.xml") {
      if (!store) store = await resolveStoreBySlug(env, storeSlug);
      if (!store) return new Response("Store not found", { status: 404 });
      return buildSitemap(env, store, canonicalBase);
    }

    if (url.pathname === "/manifest.json") return serveManifest(env, storeSlug, canonicalBase);

    // === Feed XML proxy ===
    const feedMatch = url.pathname.match(/^\/feed\/([a-z]+)\.xml$/);
    if (feedMatch) {
      const platform = feedMatch[1];
      if (!store) store = await resolveStoreBySlug(env, storeSlug);
      if (!store) return new Response("Store not found", { status: 404 });
      const supabaseUrl = env.SUPABASE_URL;
      const feedUrl = `${supabaseUrl}/functions/v1/generate-feed?store=${encodeURIComponent(store.slug)}&platform=${encodeURIComponent(platform)}`;
      const feedResponse = await fetch(feedUrl, {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
        cf: { cacheTtl: 3600, cacheEverything: true },
      });
      const feedHeaders = new Headers(feedResponse.headers);
      feedHeaders.set("Cache-Control", "public, max-age=3600");
      feedHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(feedResponse.body, { status: feedResponse.status, headers: feedHeaders });
    }

    if (url.pathname === "/favicon.ico" || url.pathname === "/favicon.png") {
      const faviconResponse = await serveFavicon(env, storeSlug);
      if (faviconResponse) return faviconResponse;
      return fetch(`https://${pagesDomain}${url.pathname}`, {
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
    }

    // === Usuário real ===
    if (!isBot(userAgent)) {
      // Assets estáticos — cache imutável de 1 ano na borda CF
      if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|mp4|webm)$/)) {
        const assetRes = await fetch(`https://${pagesDomain}${url.pathname}${url.search}`, {
          cf: { cacheTtl: 31536000, cacheEverything: true },
        });
        const headers = new Headers(assetRes.headers);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }

      const canonicalUrl = `${canonicalBase}${url.pathname}${url.search}`;

      // === PARALELIZAÇÃO v3: index.html + storeMeta + store + lcpImages juntos ===
      // v2: resolveLcpImages era sequencial após o Promise.all → bloqueava o streaming
      // v3: resolveLcpImages entra no mesmo Promise.all, mas precisa da store primeiro.
      //     Solução: resolvemos store e storeMeta em paralelo, depois lcpImages em paralelo
      //     com o fetch do index.html (que é o mais lento por ser o Pages CDN).
      //     Na prática: store + storeMeta resolvem em ~50ms, depois index.html + lcpImages
      //     correm juntos. Ganho de ~100-300ms de TTFB vs v2.
      const [storeMeta, storeResolved] = await Promise.all([
        resolveStoreMeta(env, storeSlug),
        store ? Promise.resolve(store) : resolveStoreBySlug(env, storeSlug),
      ]);
      store = storeResolved;

      // index.html + lcpImages em paralelo — lcpImages não bloqueia mais o streaming
      const [indexResponse, lcpImages] = await Promise.all([
        fetch(`https://${pagesDomain}/index.html`, {
          cf: { cacheTtl: 300, cacheEverything: true },
        }),
        store ? resolveLcpImages(env, store, url) : Promise.resolve([]),
      ]);

      const shouldInject = storeMeta.favicon || storeMeta.name || lcpImages?.length || storeSlug;
      if (shouldInject) {
        const modifiedResponse = injectStoreMetaInHtml(indexResponse, storeMeta, canonicalUrl, robotsDirective, {
          lcpImages,
          storeSlug,
          supabaseUrl: env.SUPABASE_URL,
        });

        const headers = new Headers();
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
        headers.set("X-Store-Slug", storeSlug);
        headers.set("Link", `</favicon.ico>; rel=icon`);
        if (robotsDirective) headers.set("X-Robots-Tag", robotsDirective);

        return new Response(modifiedResponse.body, { status: 200, headers });
      }

      const headers = new Headers(indexResponse.headers);
      headers.set("X-Store-Slug", storeSlug);
      headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
      if (robotsDirective) headers.set("X-Robots-Tag", robotsDirective);
      return new Response(indexResponse.body, { status: 200, headers });
    }

    // === Bot → HTML rico com OG + JSON-LD ===
    if (!store) store = await resolveStoreBySlug(env, storeSlug);
    if (!store) {
      return buildFullHtml({
        title: "Loja não encontrada",
        description: "A loja que você procura não foi encontrada.",
        url: `https://${hostname}${url.pathname}`,
      });
    }

    const path = url.pathname;

    // Produto
    const productMatch = path.match(/\/(?:product|produto)\/([^/?]+)/);
    if (productMatch) {
      const productSlugFull = productMatch[1];
      const colorParam = url.searchParams.get("cor");
      const product = await resolveProduct(env, store.id, productSlugFull);
      if (product) {
        const [variation, categoryData] = await Promise.all([
          colorParam
            ? getVariationDetails(env, store.id, product.id, colorParam)
            : Promise.resolve(null),
          product.category_id ? resolveCategoryById(env, product.category_id) : Promise.resolve(null),
        ]);

        const useVariation = !!(variation && product.display_variations_separately);

        let ogImage = useVariation ? variation.image : null;
        if (!ogImage) {
          const imgs = Array.isArray(product.images) ? product.images : [];
          const firstImg = imgs[0] || null;
          if (firstImg) ogImage = typeof firstImg === "object" ? firstImg.url : firstImg;
        }
        if (!ogImage) ogImage = await getFirstVariationImage(env, product.id);
        if (!ogImage) ogImage = store.logo_url || null;

        const productName =
          useVariation && variation.colorName ? `${product.name} - ${variation.colorName}` : product.name;
        const basePrice = useVariation && variation.price != null ? variation.price : product.price;
        const variationSale = useVariation ? variation.salePrice : null;
        const displayPrice = (variationSale ?? product.sale_price) || basePrice;
        const priceStr = `R$ ${Number(displayPrice).toFixed(2).replace(".", ",")}`;

        const titleBase =
          useVariation && variation.colorName
            ? `${product.name} ${variation.colorName}`
            : product.meta_title || product.name;
        const descRaw =
          product.meta_description || (product.description ? stripHtml(product.description).slice(0, 160) : "");
        const description =
          useVariation && variation.colorName
            ? `${product.name} na cor ${variation.colorName} por ${priceStr} na ${store.name}. ${descRaw}`.slice(0, 160)
            : descRaw || `${product.name} por ${priceStr} na ${store.name}`;
        const productUrl = `${canonicalBase}${path}${url.search}`;
        const jsonLd = buildProductJsonLd({
          product,
          store,
          canonicalUrl: productUrl,
          canonicalBase,
          ogImage,
          displayPrice,
          categoryName: categoryData?.name || null,
          categorySlug: categoryData?.slug || null,
          variation: useVariation ? variation : null,
          productName,
        });
        return buildFullHtml({
          title: `${titleBase} | ${store.name}`,
          description,
          image: ogImage,
          url: productUrl,
          type: "product",
          price: displayPrice,
          currency: "BRL",
          storeName: store.name,
          favicon: store.favicon_url,
          jsonLd,
          robots: robotsDirective,
          bodyContent: buildProductBody(product, store, priceStr),
        });
      }
    }

    // Categoria
    const categoryMatch = path.match(/\/(?:category|categoria)\/([^/?]+)/);
    if (categoryMatch) {
      const category = await resolveCategory(env, store.id, categoryMatch[1]);
      if (category) {
        const title = category.seo_title || category.name;
        const description =
          category.seo_description ||
          category.description ||
          `Confira os produtos de ${category.name} na ${store.name}`;
        const categoryUrl = `${canonicalBase}${path}`;
        const jsonLd = buildCategoryJsonLd({ category, store, canonicalUrl: categoryUrl, canonicalBase });
        return buildFullHtml({
          title: `${title} | ${store.name}`,
          description,
          image: store.logo_url || undefined,
          url: categoryUrl,
          storeName: store.name,
          favicon: store.favicon_url,
          jsonLd,
          robots: robotsDirective,
          bodyContent: `<h1>${escHtml(title)}</h1><p>${escHtml(stripHtml(description))}</p>`,
        });
      }
    }

    // Página institucional
    const pageMatch = path.match(/\/pagina\/([^/?]+)/);
    if (pageMatch) {
      const storePage = await resolveStorePage(env, store.id, pageMatch[1]);
      if (storePage) {
        const title = storePage.meta_title || storePage.title;
        const description =
          storePage.meta_description ||
          (storePage.content ? stripHtml(storePage.content).slice(0, 160) : `${storePage.title} - ${store.name}`);
        const pageUrl = `${canonicalBase}${path}`;
        return buildFullHtml({
          title: `${title} | ${store.name}`,
          description,
          image: store.logo_url || undefined,
          url: pageUrl,
          storeName: store.name,
          favicon: store.favicon_url,
          robots: robotsDirective,
          bodyContent: `<h1>${escHtml(storePage.title)}</h1><div>${storePage.content || ""}</div>`,
        });
      }
    }

    // Contato
    if (path === "/contato" || path.endsWith("/contato")) {
      const title = "Fale Conosco";
      const description = `Entre em contato com ${store.name}. Tire suas dúvidas, envie sugestões ou solicite suporte.`;
      const pageUrl = `${canonicalBase}${path}`;
      return buildFullHtml({
        title: `${title} | ${store.name}`,
        description,
        image: store.logo_url || undefined,
        url: pageUrl,
        storeName: store.name,
        favicon: store.favicon_url,
        robots: robotsDirective,
        bodyContent: `<h1>${escHtml(title)}</h1><p>${escHtml(description)}</p>`,
      });
    }

    // Home da loja
    return buildFullHtml({
      title: store.name,
      description: `Loja oficial ${store.name}. Confira nossos produtos e ofertas.`,
      image: store.logo_url || undefined,
      url: canonicalBase,
      storeName: store.name,
      favicon: store.favicon_url,
      jsonLd: buildStoreJsonLd({ store, canonicalBase }),
      robots: robotsDirective,
      bodyContent: `<h1>${escHtml(store.name)}</h1><p>Loja oficial ${escHtml(store.name)}.</p>`,
    });
  },
};
