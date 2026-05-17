/**
 * Maps each gateway type to the card brands it accepts.
 * This avoids showing brands that won't work with the active gateway.
 */

const MERCADO_PAGO_BRANDS = [
  "visa",
  "mastercard",
  "elo",
  "amex",
  "diners",
  "hiper",
];

const PAGARME_BRANDS = [
  "visa",
  "mastercard",
  "elo",
  "amex",
  "diners",
  "hiper",
  "discover",
  "aura",
];

// Fallback when no gateway is configured
const ALL_BRANDS = [
  "visa",
  "mastercard",
  "elo",
  "amex",
  "diners",
  "hiper",
  "discover",
  "aura",
];

const brandMap: Record<string, string[]> = {
  mercado_pago: MERCADO_PAGO_BRANDS,
  mercadopago: MERCADO_PAGO_BRANDS,
  pagarme: PAGARME_BRANDS,
};

/**
 * Returns the accepted card brands for a given gateway type.
 * Falls back to all brands if no gateway is specified.
 */
export function getAcceptedBrands(
  gatewayType: string | null | undefined
): string[] {
  if (!gatewayType) return ALL_BRANDS;
  return brandMap[gatewayType] ?? ALL_BRANDS;
}
