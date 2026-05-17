export interface CategoryProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images: string[];
  stock_quantity?: number | null;
  is_active?: boolean;
  category_id?: string | null;
  // For color-separated variations
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}
