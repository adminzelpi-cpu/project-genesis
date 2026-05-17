export interface Store {
  id: string;
  merchant_id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
