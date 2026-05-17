import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_GRAPH_VERSION = "v25.0";
const FALLBACK_REDIRECT = "https://admin.zelpi.com.br/dashboard/channels/facebook-instagram";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  let baseRedirect = FALLBACK_REDIRECT;
  let storeId = "";
  let userId = "";

  if (stateParam) {
    try {
      const state = JSON.parse(atob(stateParam));
      storeId = state.storeId || "";
      userId = state.userId || "";
      baseRedirect = state.redirectUrl || FALLBACK_REDIRECT;
    } catch (e) {
      console.error("Failed to parse state:", e);
    }
  }

  if (error) {
    console.error("Meta OAuth error:", error, url.searchParams.get("error_description"));
    return Response.redirect(`${baseRedirect}?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !storeId || !userId) {
    return Response.redirect(`${baseRedirect}?error=missing_params`, 302);
  }

  try {
    const appSecret = Deno.env.get("META_APP_SECRET");
    const metaAppId = Deno.env.get("META_APP_ID");
    if (!appSecret || !metaAppId) {
      console.error("META_APP_ID or META_APP_SECRET not configured");
      return Response.redirect(`${baseRedirect}?error=server_config`, 302);
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-oauth-callback`;

    // 1. Exchange code for access token
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", JSON.stringify(tokenData.error));
      return Response.redirect(`${baseRedirect}?error=token_exchange`, 302);
    }

    const shortToken = tokenData.access_token;

    // 2. Exchange for long-lived token
    const longTokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", metaAppId);
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", shortToken);

    const longTokenRes = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenRes.json();

    const accessToken = longTokenData.access_token || shortToken;
    const expiresIn = longTokenData.expires_in || 5184000;

    // 3. Get user info
    const meRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json();
    console.log("User:", meData.name, meData.id);

    // 4. Fetch pages
    let pages: any[] = [];
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,category,access_token,picture{url}&limit=100&access_token=${accessToken}`);
      const pagesData = await pagesRes.json();
      pages = pagesData.data || [];
      console.log(`Pages: ${pages.length}`);
    } catch (e) {
      console.warn("Pages fetch failed:", e);
    }

    // 5. Instagram accounts (from pages)
    let instagramAccounts: any[] = [];
    for (const page of pages) {
      try {
        const igRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${page.id}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count}&access_token=${page.access_token || accessToken}`);
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          instagramAccounts.push({
            ...igData.instagram_business_account,
            linked_page_id: page.id,
            linked_page_name: page.name,
          });
        }
      } catch (e) {
        console.warn(`IG fetch failed for page ${page.id}`, e);
      }
    }
    console.log(`Instagram: ${instagramAccounts.length}`);

    // 6. Business managers
    let businessManagers: any[] = [];
    try {
      const bmRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses?fields=id,name,profile_picture_uri,verification_status&limit=100&access_token=${accessToken}`);
      const bmData = await bmRes.json();
      businessManagers = bmData.data || [];
      console.log(`BMs: ${businessManagers.length}`);
    } catch (e) {
      console.warn("BM fetch failed:", e);
    }

    // 7. Ad accounts
    let adAccounts: any[] = [];
    try {
      const adRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,currency,business{id,name}&limit=100&access_token=${accessToken}`);
      const adData = await adRes.json();
      adAccounts = adData.data || [];
      console.log(`Ad Accounts: ${adAccounts.length}`);
    } catch (e) {
      console.warn("Ad accounts fetch failed:", e);
    }

    // 8. Catalogs (from BMs)
    let catalogs: any[] = [];
    for (const bm of businessManagers) {
      try {
        const catRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${bm.id}/owned_product_catalogs?fields=id,name,product_count&access_token=${accessToken}`);
        const catData = await catRes.json();
        if (catData.data) {
          catalogs.push(...catData.data.map((c: any) => ({ ...c, business_id: bm.id, business_name: bm.name })));
        }
      } catch (e) {
        console.warn(`Catalogs fetch failed for BM ${bm.id}`, e);
      }
    }
    console.log(`Catalogs: ${catalogs.length}`);

    // 9. Pixels (from ad accounts, max 5)
    let pixels: any[] = [];
    for (const account of adAccounts.slice(0, 5)) {
      try {
        const pixelRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${account.id}/adspixels?fields=id,name,last_fired_time&access_token=${accessToken}`);
        const pixelData = await pixelRes.json();
        if (pixelData.data) {
          pixels.push(...pixelData.data.map((p: any) => ({ ...p, ad_account_id: account.id, ad_account_name: account.name })));
        }
      } catch (e) {
        console.warn(`Pixels fetch failed for ${account.id}`, e);
      }
    }
    // Deduplicate
    const uniquePixels = Object.values(
      pixels.reduce((acc: Record<string, any>, p: any) => { acc[p.id] = p; return acc; }, {})
    );
    console.log(`Pixels: ${uniquePixels.length}`);

    // Save to DB
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pagesForStorage = pages.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture_url: p.picture?.data?.url || null,
    }));

    const { error: upsertError } = await supabase
      .from("meta_connections")
      .upsert({
        store_id: storeId,
        user_id: userId,
        meta_user_id: meData.id,
        meta_user_name: meData.name,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        scopes: [],
        available_pages: pagesForStorage,
        available_ad_accounts: adAccounts,
        available_catalogs: catalogs,
        available_pixels: uniquePixels,
        available_instagram_accounts: instagramAccounts,
        available_business_managers: businessManagers,
        selected_page: null,
        selected_ad_account: null,
        selected_pixel: null,
        selected_catalog: null,
        selected_instagram_account: null,
        selected_business_manager: null,
        selected_pages: null,
        selected_ad_accounts: null,
        selected_catalogs: null,
        selected_pixels: null,
        configuration_status: "pending_selection",
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: "store_id" });

    if (upsertError) {
      console.error("DB error:", JSON.stringify(upsertError));
      return Response.redirect(`${baseRedirect}?error=db_error`, 302);
    }

    console.log(`Connected: pages=${pages.length}, ig=${instagramAccounts.length}, bm=${businessManagers.length}, ads=${adAccounts.length}, pixels=${uniquePixels.length}, catalogs=${catalogs.length}`);

    return Response.redirect(`${baseRedirect}?success=true`, 302);
  } catch (err) {
    console.error("Callback error:", err);
    return Response.redirect(`${baseRedirect}?error=unknown`, 302);
  }
});
