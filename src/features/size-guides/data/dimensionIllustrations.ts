// Biblioteca de ilustrações para guias de medidas organizada por categoria de produto

// === Imports: Polo ===
import poloComprimento from '@/assets/size-guide/polo-comprimento.png';
import poloLarguraPeito from '@/assets/size-guide/polo-largura-peito.png';
import poloComprimentoManga from '@/assets/size-guide/polo-comprimento-manga.png';

// === Imports: Camiseta ===
import camisetaComprimento from '@/assets/size-guide/camiseta-comprimento.png';
import camisetaLarguraPeito from '@/assets/size-guide/camiseta-largura-peito.png';
import camisetaComprimentoManga from '@/assets/size-guide/camiseta-comprimento-manga.png';
import camisetaLarguraOmbros from '@/assets/size-guide/camiseta-largura-ombros.png';

// === Imports: Camisa Social ===
import camisaSocialComprimento from '@/assets/size-guide/camisa-social-comprimento.png';
import camisaSocialLarguraPeito from '@/assets/size-guide/camisa-social-largura-peito.png';
import camisaSocialComprimentoManga from '@/assets/size-guide/camisa-social-comprimento-manga.png';

// === Imports: Bermuda ===
import bermudaEntrepernas from '@/assets/size-guide/bermuda-entrepernas.png';
import bermudaLarguraCintura from '@/assets/size-guide/bermuda-largura-cintura.png';
import bermudaLarguraQuadril from '@/assets/size-guide/bermuda-largura-quadril.png';

// === Imports: Cueca ===
import cuecaLarguraCintura from '@/assets/size-guide/cueca-largura-cintura.png';
import cuecaLarguraCoxa from '@/assets/size-guide/cueca-largura-coxa.png';
import cuecaLarguraQuadril from '@/assets/size-guide/cueca-largura-quadril.png';

// === Imports: Corpo ===
import bodyPeito from '@/assets/size-guide/body-peito-novo.png';
import bodyCintura from '@/assets/size-guide/body-cintura-novo.png';
import bodyQuadril from '@/assets/size-guide/body-quadril-novo.png';
import bodyCoxa from '@/assets/size-guide/body-coxa.png';

export type ProductCategory = 
  | 'polo' 
  | 'camiseta' 
  | 'camisa-social' 
  | 'bermuda' 
  | 'cueca' 
  | 'calca'
  | 'vestido'
  | 'calcado'
  | 'infantil'
  | 'custom';

export interface DimensionIllustration {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  type: 'piece' | 'body';
  category: ProductCategory;
  keywords: string[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  'polo': 'Polo',
  'camiseta': 'Camiseta',
  'camisa-social': 'Camisa Social',
  'bermuda': 'Bermuda',
  'cueca': 'Cueca',
  'calca': 'Calça',
  'vestido': 'Vestido',
  'calcado': 'Calçado',
  'infantil': 'Infantil',
  'custom': 'Personalizado',
};

export const DIMENSION_ILLUSTRATIONS: DimensionIllustration[] = [
  // ===== POLO =====
  {
    id: 'polo-comprimento',
    name: 'Comprimento da Peça',
    description: 'Medir da base do colarinho até a barra inferior da peça',
    imageUrl: poloComprimento,
    type: 'piece',
    category: 'polo',
    keywords: ['comprimento', 'altura', 'length'],
  },
  {
    id: 'polo-largura-peito',
    name: 'Largura do Peito',
    description: 'Medir horizontalmente de axila a axila, com a peça esticada',
    imageUrl: poloLarguraPeito,
    type: 'piece',
    category: 'polo',
    keywords: ['largura', 'peito', 'tórax', 'busto', 'chest', 'width'],
  },
  {
    id: 'polo-comprimento-manga',
    name: 'Comprimento da Manga',
    description: 'Medir da costura do ombro até o final da manga',
    imageUrl: poloComprimentoManga,
    type: 'piece',
    category: 'polo',
    keywords: ['manga', 'sleeve', 'braço'],
  },

  // ===== CAMISETA =====
  {
    id: 'camiseta-comprimento',
    name: 'Comprimento da Peça',
    description: 'Medir da base da gola até a barra inferior da camiseta',
    imageUrl: camisetaComprimento,
    type: 'piece',
    category: 'camiseta',
    keywords: ['comprimento', 'altura', 'length'],
  },
  {
    id: 'camiseta-largura-peito',
    name: 'Largura do Peito',
    description: 'Medir horizontalmente de axila a axila, com a peça esticada',
    imageUrl: camisetaLarguraPeito,
    type: 'piece',
    category: 'camiseta',
    keywords: ['largura', 'peito', 'tórax', 'busto', 'chest', 'width'],
  },
  {
    id: 'camiseta-comprimento-manga',
    name: 'Comprimento da Manga',
    description: 'Medir da costura do ombro até o final da manga',
    imageUrl: camisetaComprimentoManga,
    type: 'piece',
    category: 'camiseta',
    keywords: ['manga', 'sleeve', 'braço'],
  },
  {
    id: 'camiseta-largura-ombros',
    name: 'Largura dos Ombros',
    description: 'Medir de ombro a ombro, seguindo a linha da costura',
    imageUrl: camisetaLarguraOmbros,
    type: 'piece',
    category: 'camiseta',
    keywords: ['ombro', 'ombros', 'shoulder'],
  },

  // ===== CAMISA SOCIAL =====
  {
    id: 'camisa-social-comprimento',
    name: 'Comprimento da Peça',
    description: 'Medir da base do colarinho até a barra inferior da camisa',
    imageUrl: camisaSocialComprimento,
    type: 'piece',
    category: 'camisa-social',
    keywords: ['comprimento', 'altura', 'length'],
  },
  {
    id: 'camisa-social-largura-peito',
    name: 'Largura do Peito',
    description: 'Medir horizontalmente na altura do peito, com a camisa abotoada',
    imageUrl: camisaSocialLarguraPeito,
    type: 'piece',
    category: 'camisa-social',
    keywords: ['largura', 'peito', 'tórax', 'busto', 'chest', 'width'],
  },
  {
    id: 'camisa-social-comprimento-manga',
    name: 'Comprimento da Manga',
    description: 'Medir da costura do ombro até o punho',
    imageUrl: camisaSocialComprimentoManga,
    type: 'piece',
    category: 'camisa-social',
    keywords: ['manga', 'sleeve', 'braço'],
  },

  // ===== BERMUDA =====
  {
    id: 'bermuda-largura-cintura',
    name: 'Largura da Cintura',
    description: 'Medir a largura do cós de ponta a ponta',
    imageUrl: bermudaLarguraCintura,
    type: 'piece',
    category: 'bermuda',
    keywords: ['cintura', 'cós', 'waist'],
  },
  {
    id: 'bermuda-largura-quadril',
    name: 'Largura do Quadril',
    description: 'Medir na parte mais larga da bermuda, abaixo do cós',
    imageUrl: bermudaLarguraQuadril,
    type: 'piece',
    category: 'bermuda',
    keywords: ['quadril', 'hip', 'largura'],
  },
  {
    id: 'bermuda-entrepernas',
    name: 'Comprimento Entrepernas',
    description: 'Medir da costura interna do gancho até a barra',
    imageUrl: bermudaEntrepernas,
    type: 'piece',
    category: 'bermuda',
    keywords: ['entrepernas', 'gancho', 'inseam', 'comprimento'],
  },

  // ===== CUECA =====
  {
    id: 'cueca-largura-cintura',
    name: 'Largura da Cintura',
    description: 'Medir a largura do elástico de ponta a ponta',
    imageUrl: cuecaLarguraCintura,
    type: 'piece',
    category: 'cueca',
    keywords: ['cintura', 'elástico', 'waist'],
  },
  {
    id: 'cueca-largura-quadril',
    name: 'Largura do Quadril',
    description: 'Medir na parte mais larga da cueca',
    imageUrl: cuecaLarguraQuadril,
    type: 'piece',
    category: 'cueca',
    keywords: ['quadril', 'hip', 'largura'],
  },
  {
    id: 'cueca-largura-coxa',
    name: 'Largura da Coxa',
    description: 'Medir a abertura da perna na barra',
    imageUrl: cuecaLarguraCoxa,
    type: 'piece',
    category: 'cueca',
    keywords: ['coxa', 'perna', 'thigh'],
  },

  // ===== CORPO (compartilhado) =====
  {
    id: 'body-peito',
    name: 'Contorno do Peito',
    description: 'Medir ao redor do tórax na altura dos mamilos, mantendo a fita nivelada',
    imageUrl: bodyPeito,
    type: 'body',
    category: 'custom',
    keywords: ['peito', 'tórax', 'busto', 'chest', 'circunferência', 'contorno'],
  },
  {
    id: 'body-cintura',
    name: 'Circunferência da Cintura',
    description: 'Medir ao redor da parte mais estreita do tronco, geralmente 2-3 cm acima do umbigo',
    imageUrl: bodyCintura,
    type: 'body',
    category: 'custom',
    keywords: ['cintura', 'waist'],
  },
  {
    id: 'body-quadril',
    name: 'Circunferência do Quadril',
    description: 'Medir ao redor da parte mais larga dos quadris, mantendo a fita horizontal',
    imageUrl: bodyQuadril,
    type: 'body',
    category: 'custom',
    keywords: ['quadril', 'hip', 'hips'],
  },
  {
    id: 'body-coxa',
    name: 'Contorno da Coxa',
    description: 'Medir ao redor da parte mais larga da coxa, próximo à virilha',
    imageUrl: bodyCoxa,
    type: 'body',
    category: 'custom',
    keywords: ['coxa', 'thigh', 'perna'],
  },
];

export function mapTemplateToCategoryList(templateType: string | null): ProductCategory[] {
  switch (templateType) {
    case 'polo': return ['polo'];
    case 'camiseta': return ['camiseta'];
    case 'camisa-social': return ['camisa-social'];
    case 'bermuda': return ['bermuda'];
    case 'cueca': return ['cueca'];
    case 'calca': return ['calca'];
    default: return ['polo', 'camiseta', 'camisa-social', 'bermuda', 'cueca', 'calca'];
  }
}

export function getIllustrationsByType(
  type: 'piece' | 'body', 
  categories?: ProductCategory[]
): DimensionIllustration[] {
  return DIMENSION_ILLUSTRATIONS.filter(ill => {
    if (ill.type !== type) return false;
    if (type === 'body') return true;
    if (!categories || categories.length === 0) return true;
    return categories.includes(ill.category);
  });
}

export function findMatchingIllustration(
  dimensionName: string, 
  type: 'piece' | 'body',
  categories?: ProductCategory[]
): DimensionIllustration | null {
  const normalizedName = dimensionName.toLowerCase().trim();
  const filtered = getIllustrationsByType(type, categories);
  return filtered.find(
    ill => ill.keywords.some(kw => normalizedName.includes(kw))
  ) || null;
}
