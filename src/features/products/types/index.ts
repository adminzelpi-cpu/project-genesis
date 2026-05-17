export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  sale_price?: number | null;
  stock_quantity?: number;
  images?: any;
  keywords?: string[];
  is_active: boolean;
  ai_generated_description?: boolean;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  gender?: string | null;
  age_group?: string | null;
  material?: string | null;
  size_guide_id?: string | null;
  created_at: string;
  updated_at: string;
}
