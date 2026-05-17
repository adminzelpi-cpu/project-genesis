// Helper compartilhado para chamadas à Graph API da Meta com auto-retry
// em falhas transitórias (5xx, network/timeout).
//
// Uso:
//   const { res, json } = await metaFetchWithRetry(url, { method, headers, body });

export interface MetaFetchResult {
  res: Response;
  json: any;
  attempts: number;
}

export async function metaFetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; retryDelayMs?: number; timeoutMs?: number } = {},
): Promise<MetaFetchResult> {
  const retries = opts.retries ?? 1;
  const baseDelay = opts.retryDelayMs ?? 800;
  const timeoutMs = opts.timeoutMs ?? 15000;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      let json: any = null;
      try { json = await res.json(); } catch { /* ignore non-JSON */ }

      // Retry only on 5xx (server-side / transient)
      if (res.status >= 500 && attempt < retries) {
        await sleep(baseDelay * (attempt + 1));
        continue;
      }
      return { res, json, attempts: attempt + 1 };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await sleep(baseDelay * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  // Should never reach
  throw lastErr ?? new Error("metaFetchWithRetry: unknown failure");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Verifica quality_rating do número e do template (anti-bloqueio Meta).
 * Retorna { ok: true } se RED não detectado.
 */
export async function checkSendingQuality(
  phoneNumberId: string,
  wabaId: string,
  templateName: string,
  templateLanguage: string,
  accessToken: string,
  apiVersion = "v25.0",
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const [phoneRes, tplRes] = await Promise.all([
      fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=quality_rating,name_status&access_token=${accessToken}`),
      fetch(`https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&language=${encodeURIComponent(templateLanguage)}&fields=name,language,status,quality_score&access_token=${accessToken}`),
    ]);
    const phoneJson = await phoneRes.json().catch(() => ({}));
    const tplJson = await tplRes.json().catch(() => ({}));

    const phoneQuality = String(phoneJson?.quality_rating ?? "").toUpperCase();
    if (phoneQuality === "RED") {
      return { ok: false, reason: "Qualidade do número está RED — Meta bloqueia envios em massa de marketing. Aguarde melhora ou reduza volume." };
    }

    const tpl = (tplJson?.data ?? []).find((t: any) => t.name === templateName && t.language === templateLanguage);
    if (tpl && tpl.status !== "APPROVED") {
      return { ok: false, reason: `Template "${templateName}" (${templateLanguage}) não está APROVADO na Meta no momento (status: ${tpl.status}).` };
    }
    const tplQuality = String(tpl?.quality_score?.score ?? "").toUpperCase();
    if (tplQuality === "RED") {
      return { ok: false, reason: `Template "${templateName}" tem qualidade RED — Meta vai bloquear/limitar entregas.` };
    }
    return { ok: true };
  } catch (e) {
    // Verificação é best-effort; se a Meta não respondeu, deixa seguir.
    console.warn("checkSendingQuality skipped:", (e as Error).message);
    return { ok: true };
  }
}
