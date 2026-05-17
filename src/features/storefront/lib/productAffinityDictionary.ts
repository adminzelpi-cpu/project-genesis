/**
 * Dicionário PT-BR de afinidade entre produtos.
 *
 * Usado pelo algoritmo de recomendação do mini carrinho para:
 *  1. PENALIZAR produtos competidores (mesma necessidade) → evita canibalização
 *  2. BONIFICAR pares clássicos (combinam naturalmente) → aumenta ticket médio
 *
 * Cobertura: Moda, Beleza, Casa, Pet, Eletrônicos básicos.
 *
 * Como detecta: lê o NOME do produto (lowercase, sem acentos) e procura por
 * qualquer palavra-chave do grupo. 90% dos produtos brasileiros têm o tipo
 * no nome (norma do mercado).
 */

// ───────────────────────────────────────────────────────────
// COMPETIDORES — produtos do mesmo grupo canibalizam entre si
// ───────────────────────────────────────────────────────────
export const COMPETITOR_GROUPS: string[][] = [
  // ─── MODA ───
  ['bermuda', 'short', 'shorts'],
  ['camiseta', 'camisetas', 't-shirt', 'tshirt', 'baby look'],
  ['polo', 'polos'],
  ['regata', 'regatas'],
  ['camisa social', 'camisa manga longa', 'camisa slim'],
  ['blusa', 'blusas', 'blusinha'],
  ['calca', 'calcas', 'calça', 'calças', 'jeans', 'legging', 'leggings'],
  ['saia', 'saias'],
  ['vestido', 'vestidos', 'macacao', 'macacão'],
  ['casaco', 'casacos', 'jaqueta', 'jaquetas', 'blazer', 'blazers', 'sobretudo'],
  ['moletom', 'moletons', 'hoodie'],
  ['tenis', 'tênis'],
  ['sapato', 'sapatos', 'sapatenis', 'sapatênis', 'mocassim'],
  ['sandalia', 'sandália', 'sandalias', 'sandálias', 'rasteirinha', 'rasteirinhas'],
  ['chinelo', 'chinelos'],
  ['bota', 'botas', 'coturno'],
  ['sutia', 'sutiã', 'sutias', 'sutiãs', 'top'],
  ['calcinha', 'calcinhas'],
  ['cueca', 'cuecas'],
  ['biquini', 'biquíni', 'biquinis', 'biquínis', 'mai', 'maiô', 'maio'],
  ['bone', 'boné', 'bones', 'bonés', 'chapeu', 'chapéu', 'touca'],
  ['oculos', 'óculos'],
  ['relogio', 'relógio', 'relogios', 'relógios'],
  ['bolsa', 'bolsas', 'mochila', 'mochilas'],
  ['carteira', 'carteiras'],
  ['cinto', 'cintos'],
  ['pijama', 'pijamas', 'camisola'],

  // ─── BELEZA ───
  ['shampoo', 'shampoos'],
  ['condicionador', 'condicionadores'],
  ['mascara capilar', 'máscara capilar', 'tratamento capilar'],
  ['sabonete', 'sabonetes', 'sabonete liquido'],
  ['hidratante', 'hidratantes', 'creme hidratante', 'locao hidratante', 'loção hidratante'],
  ['perfume', 'perfumes', 'colonia', 'colônia', 'eau de'],
  ['desodorante', 'desodorantes', 'antitranspirante'],
  ['protetor solar', 'protetores solares', 'fps'],
  ['batom', 'batons', 'gloss'],
  ['base', 'bases', 'foundation'],
  ['rimel', 'rímel', 'mascara de cilios', 'máscara de cílios'],
  ['delineador', 'delineadores', 'lapis de olho', 'lápis de olho'],
  ['paleta de sombras', 'paleta de olhos', 'sombra'],
  ['blush', 'blushes', 'rouge'],
  ['esmalte', 'esmaltes'],
  ['escova de cabelo', 'pente'],
  ['secador', 'secadores'],
  ['chapinha', 'prancha', 'pranchas'],

  // ─── CASA ───
  ['sofa', 'sofá', 'sofas', 'sofás', 'poltrona'],
  ['mesa de jantar', 'mesa de centro', 'mesa lateral'],
  ['cadeira', 'cadeiras', 'banqueta'],
  ['cama', 'camas'],
  ['colchao', 'colchão', 'colchoes', 'colchões'],
  ['travesseiro', 'travesseiros', 'fronha'],
  ['edredom', 'edredons', 'cobertor', 'cobertores', 'manta', 'mantas'],
  ['jogo de cama', 'lencol', 'lençol', 'lencois', 'lençóis'],
  ['toalha de banho', 'toalhas de banho'],
  ['toalha de mesa', 'toalhas de mesa'],
  ['cortina', 'cortinas', 'persiana', 'persianas'],
  ['tapete', 'tapetes', 'capacho'],
  ['luminaria', 'luminária', 'luminarias', 'luminárias', 'abajur', 'abajures'],
  ['quadro', 'quadros', 'poster', 'pôster'],
  ['vaso', 'vasos', 'cachepot'],
  ['panela', 'panelas', 'caçarola'],
  ['frigideira', 'frigideiras'],
  ['prato', 'pratos'],
  ['copo', 'copos', 'taca', 'taça', 'tacas', 'taças'],
  ['talher', 'talheres'],

  // ─── PET ───
  ['racao', 'ração', 'racoes', 'rações'],
  ['petisco', 'petiscos', 'snack pet', 'biscoito pet'],
  ['areia para gato', 'areia higienica', 'areia higiênica'],
  ['caixa de transporte', 'caixa transportadora'],
  ['cama pet', 'caminha pet'],
  ['coleira', 'coleiras', 'peitoral'],
  ['guia', 'guias pet'],
  ['comedouro', 'bebedouro', 'comedouros', 'bebedouros'],
  ['shampoo pet', 'banho pet'],

  // ─── ELETRÔNICOS ───
  ['celular', 'celulares', 'smartphone', 'smartphones', 'iphone'],
  ['notebook', 'notebooks', 'laptop'],
  ['tablet', 'tablets', 'ipad'],
  ['fone de ouvido', 'fones de ouvido', 'headphone', 'earbuds', 'airpods'],
  ['caixa de som', 'speaker', 'soundbar'],
  ['smartwatch', 'smartwatches', 'relogio inteligente', 'relógio inteligente'],
  ['carregador', 'carregadores'],
  ['cabo usb', 'cabo lightning', 'cabo tipo c', 'cabo tipo-c'],
  ['mouse', 'mouses'],
  ['teclado', 'teclados'],
  ['monitor', 'monitores'],
  ['tv', 'televisao', 'televisão', 'smart tv'],
];

// ───────────────────────────────────────────────────────────
// PARES CLÁSSICOS — produtos do grupo A combinam com grupo B
// ───────────────────────────────────────────────────────────
export interface ClassicPair {
  a: string[];
  b: string[];
}

export const CLASSIC_PAIRS: ClassicPair[] = [
  // ─── MODA — partes de cima + partes de baixo ───
  { a: ['bermuda', 'short', 'shorts'],                         b: ['camiseta', 'polo', 'regata', 'blusa', 'baby look', 't-shirt'] },
  { a: ['calca', 'calça', 'jeans', 'legging'],                 b: ['camisa', 'blusa', 'camiseta', 'polo', 'regata', 'baby look'] },
  { a: ['saia'],                                               b: ['camisa', 'blusa', 'camiseta', 'polo', 'regata'] },

  // ─── MODA — outfits clássicos ───
  { a: ['vestido', 'macacao', 'macacão'],                      b: ['bolsa', 'sandalia', 'sandália', 'rasteirinha', 'cinto', 'colar'] },
  { a: ['terno', 'blazer'],                                    b: ['camisa social', 'gravata', 'sapato', 'sapatos'] },
  { a: ['camisa social'],                                      b: ['gravata', 'cinto', 'sapato'] },
  { a: ['biquini', 'biquíni', 'mai', 'maiô', 'maio'],          b: ['saida de praia', 'saída de praia', 'kanga', 'chapeu', 'chapéu', 'oculos', 'óculos'] },

  // ─── MODA — calçados + acessórios ───
  { a: ['tenis', 'tênis'],                                     b: ['meia', 'meias'] },
  { a: ['sapato', 'sapatos', 'mocassim'],                      b: ['meia social', 'cinto'] },
  { a: ['bota', 'botas', 'coturno'],                           b: ['meia', 'meias'] },

  // ─── MODA — íntima ───
  { a: ['sutia', 'sutiã', 'top'],                              b: ['calcinha', 'calcinhas'] },
  { a: ['cueca'],                                              b: ['camiseta basica', 'camiseta básica', 'meia'] },
  { a: ['pijama'],                                             b: ['chinelo', 'pantufa'] },

  // ─── MODA — frio ───
  { a: ['casaco', 'jaqueta', 'sobretudo', 'moletom'],          b: ['cachecol', 'gorro', 'luva', 'touca'] },

  // ─── BELEZA — combos clássicos ───
  { a: ['shampoo'],                                            b: ['condicionador', 'mascara capilar', 'máscara capilar', 'leave-in', 'oleo capilar', 'óleo capilar'] },
  { a: ['condicionador'],                                      b: ['shampoo', 'mascara capilar', 'máscara capilar', 'leave-in'] },
  { a: ['base', 'foundation'],                                 b: ['primer', 'po', 'pó compacto', 'corretivo', 'pincel'] },
  { a: ['batom', 'gloss'],                                     b: ['lapis de boca', 'lápis de boca', 'delineador labial'] },
  { a: ['paleta de sombras', 'sombra'],                        b: ['rimel', 'rímel', 'delineador', 'pincel'] },
  { a: ['esmalte'],                                            b: ['base para unha', 'extra brilho', 'lixa', 'removedor'] },
  { a: ['perfume', 'colonia', 'colônia'],                      b: ['hidratante', 'desodorante'] },
  { a: ['protetor solar'],                                     b: ['hidratante', 'pos sol', 'pós sol'] },
  { a: ['sabonete', 'sabonete liquido'],                       b: ['hidratante', 'esfoliante'] },

  // ─── CASA — combinações naturais ───
  { a: ['cama', 'colchao', 'colchão'],                         b: ['travesseiro', 'jogo de cama', 'lencol', 'lençol', 'edredom', 'cobertor'] },
  { a: ['travesseiro'],                                        b: ['fronha', 'jogo de cama'] },
  { a: ['jogo de cama', 'lencol', 'lençol'],                   b: ['edredom', 'cobertor', 'manta', 'travesseiro'] },
  { a: ['sofa', 'sofá'],                                       b: ['manta', 'almofada', 'almofadas', 'tapete'] },
  { a: ['mesa de jantar'],                                     b: ['cadeira', 'cadeiras', 'jogo americano', 'toalha de mesa'] },
  { a: ['toalha de banho'],                                    b: ['toalha de rosto', 'tapete de banheiro'] },
  { a: ['cortina'],                                            b: ['varao', 'varão', 'suporte de cortina'] },
  { a: ['panela', 'frigideira'],                               b: ['colher de pau', 'pegador', 'tampa', 'descanso de panela'] },
  { a: ['prato'],                                              b: ['talher', 'talheres', 'copo', 'taca', 'taça', 'guardanapo'] },
  { a: ['vaso'],                                               b: ['planta', 'terra', 'cachepot'] },

  // ─── PET — combos naturais ───
  { a: ['racao', 'ração'],                                     b: ['petisco', 'petiscos', 'comedouro', 'bebedouro', 'brinquedo pet'] },
  { a: ['areia para gato', 'areia higienica', 'areia higiênica'], b: ['caixa de areia', 'pa para areia', 'pá para areia'] },
  { a: ['coleira', 'peitoral'],                                b: ['guia', 'placa de identificacao', 'placa de identificação'] },
  { a: ['shampoo pet'],                                        b: ['condicionador pet', 'colonia pet', 'colônia pet', 'escova pet'] },
  { a: ['caixa de transporte'],                                b: ['cama pet', 'caminha pet', 'manta pet'] },

  // ─── ELETRÔNICOS — acessórios essenciais ───
  { a: ['celular', 'smartphone', 'iphone'],                    b: ['capa', 'capinha', 'pelicula', 'película', 'carregador', 'fone de ouvido', 'cabo'] },
  { a: ['notebook', 'laptop'],                                 b: ['mouse', 'mochila', 'capa para notebook', 'suporte para notebook', 'cooler'] },
  { a: ['tablet', 'ipad'],                                     b: ['capa', 'pelicula', 'película', 'caneta', 'suporte'] },
  { a: ['fone de ouvido', 'headphone', 'earbuds'],             b: ['capa', 'cabo', 'estojo'] },
  { a: ['monitor'],                                            b: ['suporte de monitor', 'cabo hdmi'] },
  { a: ['teclado'],                                            b: ['mouse', 'mousepad', 'apoio de pulso'] },
  { a: ['tv', 'smart tv'],                                     b: ['suporte de tv', 'controle', 'cabo hdmi'] },
  { a: ['smartwatch', 'relogio inteligente', 'relógio inteligente'], b: ['pulseira', 'carregador', 'pelicula', 'película'] },
];

// ───────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────

/**
 * Normaliza string para matching: lowercase + sem acentos + sem pontuação.
 */
export function normalizeProductText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta se o texto contém alguma palavra-chave do grupo.
 * Usa word-boundary para evitar falsos positivos (ex: "polo" ≠ "polonês").
 */
export function textMatchesGroup(normalizedText: string, group: string[]): boolean {
  return group.some((keyword) => {
    const normalizedKeyword = normalizeProductText(keyword);
    // word-boundary: keyword precedido e seguido por início/fim/espaço/hífen
    const regex = new RegExp(`(^|[\\s-])${normalizedKeyword}([\\s-]|$)`);
    return regex.test(normalizedText);
  });
}

/**
 * Retorna todos os grupos competidores (índices) que matcham o texto.
 */
export function findCompetitorGroupIndices(productName: string): number[] {
  const normalized = normalizeProductText(productName);
  const matches: number[] = [];
  COMPETITOR_GROUPS.forEach((group, idx) => {
    if (textMatchesGroup(normalized, group)) matches.push(idx);
  });
  return matches;
}

/**
 * Retorna os "lados B" dos pares clássicos cujo "lado A" matcha o texto
 * (e vice-versa — pares são bidirecionais).
 */
export function findClassicPairTargets(productName: string): string[][] {
  const normalized = normalizeProductText(productName);
  const targets: string[][] = [];
  CLASSIC_PAIRS.forEach((pair) => {
    if (textMatchesGroup(normalized, pair.a)) targets.push(pair.b);
    if (textMatchesGroup(normalized, pair.b)) targets.push(pair.a);
  });
  return targets;
}

/**
 * Avalia se um produto candidato é competidor de algum item do carrinho.
 */
export function isCompetitorOfCart(
  candidateName: string,
  cartCompetitorIndices: Set<number>
): boolean {
  if (cartCompetitorIndices.size === 0) return false;
  const candidateIndices = findCompetitorGroupIndices(candidateName);
  return candidateIndices.some((idx) => cartCompetitorIndices.has(idx));
}

/**
 * Avalia se um produto candidato é par clássico de algum item do carrinho.
 */
export function isClassicPairOfCart(
  candidateName: string,
  cartPairTargets: string[][]
): boolean {
  if (cartPairTargets.length === 0) return false;
  const normalized = normalizeProductText(candidateName);
  return cartPairTargets.some((targetGroup) => textMatchesGroup(normalized, targetGroup));
}
