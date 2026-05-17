import { loadMercadoPago } from "@mercadopago/sdk-js";
import { supabase } from "@/integrations/supabase/client";

interface MPInstance {
  fields?: unknown;
  createCardToken: (params: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType?: string;
    identificationNumber?: string;
  }) => Promise<{ id: string; first_six_digits?: string; last_four_digits?: string }>;
}

interface MercadoPagoPublicKeyResponse {
  publicKey?: string;
  error?: string;
  code?: string;
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MPInstance;
  }
}

let cachedInstance: { storeId: string; mp: MPInstance } | null = null;
let cachedPublicKey: { storeId: string; key: string } | null = null;

async function getPublicKey(storeId: string): Promise<string> {
  if (cachedPublicKey && cachedPublicKey.storeId === storeId) {
    return cachedPublicKey.key;
  }
  const { data, error } = await supabase.functions.invoke("mercadopago-get-public-key", {
    body: { storeId },
  });
  if (error) {
    let message = "Não foi possível obter a chave pública do Mercado Pago";
    try {
      const response = (error as any)?.context?.response ?? (error as any)?.context;
      if (response && typeof response.json === "function") {
        const parsed = (await response.json()) as MercadoPagoPublicKeyResponse;
        message = parsed?.error || message;
      } else if (error.message && !error.message.includes("non-2xx")) {
        message = error.message;
      }
    } catch {
      if (error.message && !error.message.includes("non-2xx")) {
        message = error.message;
      }
    }
    throw new Error(message);
  }
  const publicKey = (data as MercadoPagoPublicKeyResponse)?.publicKey;
  if (!publicKey) {
    throw new Error("Chave pública do Mercado Pago não disponível");
  }
  cachedPublicKey = { storeId, key: publicKey };
  return publicKey;
}

async function getMpInstance(storeId: string): Promise<MPInstance> {
  if (cachedInstance && cachedInstance.storeId === storeId) {
    return cachedInstance.mp;
  }
  const publicKey = await getPublicKey(storeId);
  await loadMercadoPago();
  if (!window.MercadoPago) {
    throw new Error("SDK do Mercado Pago não carregou");
  }
  const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
  cachedInstance = { storeId, mp };
  return mp;
}

export interface CreateMpCardTokenInput {
  storeId: string;
  cardNumber: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  /** Customer CPF (digits only) — required by MP for credit card tokenization in Brazil */
  document?: string;
}

/**
 * Tokenizes a card in the browser using Mercado Pago's public key.
 * The raw card data NEVER leaves the user's browser — only the resulting token does.
 */
export async function createMercadoPagoCardToken(
  input: CreateMpCardTokenInput
): Promise<string> {
  const mp = await getMpInstance(input.storeId);
  const cleanedDoc = input.document?.replace(/\D/g, "") || "";
  const tokenResp = await mp.createCardToken({
    cardNumber: input.cardNumber.replace(/\D/g, ""),
    cardholderName: input.holderName.trim(),
    cardExpirationMonth: String(input.expMonth).padStart(2, "0"),
    cardExpirationYear: String(input.expYear).slice(-2),
    securityCode: input.cvv,
    identificationType: cleanedDoc.length === 11 ? "CPF" : cleanedDoc.length === 14 ? "CNPJ" : undefined,
    identificationNumber: cleanedDoc || undefined,
  });
  if (!tokenResp?.id) {
    throw new Error("Falha ao gerar token do cartão");
  }
  return tokenResp.id;
}
