/**
 * Shared utility to determine if an attribute is "visual" — meaning it should
 * trigger image swapping, be used for product separation, and appear as the
 * primary selector on the product page.
 *
 * "color" type is always visual.
 * "custom" type is visual UNLESS its name contains a non-visual keyword.
 * "size" type is never visual.
 */

const NON_VISUAL_KEYWORDS = [
  'tamanho', 'voltagem', 'capacidade', 'volume', 'quantidade',
  'peso', 'potência', 'potencia', 'ml', 'litro', 'kg', 'gramas',
  'watts', 'volts', 'amperes', 'dimensão', 'dimensao', 'comprimento',
  'largura', 'altura', 'gb', 'tb', 'mb', 'memória', 'memoria',
  'armazenamento', 'bateria', 'mah',
];

export function isVisualAttribute(attr: { type: string; name: string }): boolean {
  if (attr.type === 'color') return true;
  if (attr.type === 'size') return false;
  // custom type: visual unless name matches non-visual keywords
  const nameLower = attr.name.toLowerCase();
  return !NON_VISUAL_KEYWORDS.some(kw => nameLower.includes(kw));
}

/**
 * Given a list of store attributes, find the first "visual" attribute ID.
 * Prioritizes 'color' type over visual custom types.
 */
export function findVisualAttributeId(
  attributes: Array<{ id: string; type: string; name: string }>
): string | undefined {
  // Prefer color first
  const colorAttr = attributes.find(a => a.type === 'color');
  if (colorAttr) return colorAttr.id;
  // Then any visual custom attribute
  const visualCustom = attributes.find(a => isVisualAttribute(a) && a.type === 'custom');
  return visualCustom?.id;
}
