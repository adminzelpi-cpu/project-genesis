import { AttributeValue } from "@/features/attributes/types";

// Abbreviation map for common Portuguese color names
const COLOR_ABBREV: Record<string, string> = {
  'preto': 'PT', 'branco': 'BR', 'cinza': 'CZ', 'azul': 'AZ',
  'azul marinho': 'AM', 'azul claro': 'AC', 'vermelho': 'VM',
  'verde': 'VD', 'amarelo': 'AL', 'rosa': 'RS', 'pink': 'PK',
  'roxo': 'RX', 'laranja': 'LR', 'bege': 'BG', 'marrom': 'MR',
  'vinho': 'VN', 'prata': 'PR', 'dourado': 'DR', 'nude': 'ND',
  'caramelo': 'CR', 'coral': 'CL', 'turquesa': 'TQ', 'lilás': 'LL',
  'creme': 'CM', 'grafite': 'GF', 'areia': 'AR', 'bordo': 'BD',
  'mostarda': 'MS', 'terracota': 'TC', 'off white': 'OW',
};

export function abbreviateValue(value: string): string {
  const lower = value.toLowerCase().trim();
  if (COLOR_ABBREV[lower]) return COLOR_ABBREV[lower];
  if (/^[A-Z]{1,3}$/.test(value.trim()) || /^\d{1,3}$/.test(value.trim())) return value.trim().toUpperCase();
  return value.trim().substring(0, 2).toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function generateSKU(
  attributes: Record<string, string>,
  allAttributeValues: AttributeValue[],
  productCode?: number | null,
): string {
  const code = productCode ? String(productCode).padStart(3, '0') : '000';
  
  const parts = Object.values(attributes).map(valueId => {
    const av = allAttributeValues.find(v => v.id === valueId);
    return av ? abbreviateValue(av.value) : valueId.substring(0, 2).toUpperCase();
  });
  
  return `${code}-${parts.join('-')}`;
}
