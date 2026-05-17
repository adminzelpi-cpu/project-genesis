export interface Attribute {
  id: string;
  store_id: string;
  name: string;
  type: 'color' | 'size' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  color_hex?: string;
  size_category?: string;
  created_at: string;
}

export interface ProductVariation {
  id?: string;
  product_id?: string;
  sku?: string;
  price: number;
  sale_price?: number;
  stock_quantity: number | null; // null = estoque infinito
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  gtin?: string;
  ean?: string;
  upc?: string;
  mpn?: string;
  image_url?: string;
  images?: Array<{ url: string; is_primary: boolean }>;
  attributes: Record<string, string>; // {attribute_id: value_id}
  is_active: boolean;
  
  // Campos para estrutura hierárquica pai-filho
  parent_id?: string | null;
  is_parent: boolean;
  override_fields?: Record<string, boolean>; // {fieldName: hasOverride}
  
  // Para uso interno em agrupamento e UI
  _index?: number;
  _children?: ProductVariation[]; // Variações filhas (apenas em memória)
  _isExpanded?: boolean; // Estado de expansão na UI
}
