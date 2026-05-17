export interface ProductCategory {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  seo_title?: string;
  seo_description?: string;
  google_category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
