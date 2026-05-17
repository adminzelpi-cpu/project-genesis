
-- Admin dashboard KPIs function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.admin_get_platform_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'sellify_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_stores', (SELECT count(*) FROM stores),
    'active_stores', (SELECT count(*) FROM stores WHERE is_active = true),
    'total_orders', (SELECT count(*) FROM orders),
    'total_gmv', (SELECT coalesce(sum(total), 0) FROM orders WHERE status_pagamento = 'pago'),
    'total_customers', (SELECT count(*) FROM customers),
    'stores_last_7d', (SELECT count(*) FROM stores WHERE created_at >= now() - interval '7 days'),
    'orders_last_7d', (SELECT count(*) FROM orders WHERE created_at >= now() - interval '7 days'),
    'gmv_last_7d', (SELECT coalesce(sum(total), 0) FROM orders WHERE status_pagamento = 'pago' AND created_at >= now() - interval '7 days'),
    'unresolved_errors', (SELECT count(*) FROM error_logs WHERE resolved = false)
  ) INTO result;

  RETURN result;
END;
$$;

-- Admin get all stores with details
CREATE OR REPLACE FUNCTION public.admin_get_stores(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'sellify_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'stores', coalesce((
      SELECT jsonb_agg(row_to_json(s.*) ORDER BY s.created_at DESC)
      FROM (
        SELECT 
          st.id, st.name, st.slug, st.is_active, st.created_at, st.updated_at,
          st.merchant_id, st.logo_url, st.favicon_url,
          p.email as merchant_email, p.full_name as merchant_name,
          (SELECT count(*) FROM products pr WHERE pr.store_id = st.id) as product_count,
          (SELECT count(*) FROM orders o WHERE o.store_id = st.id) as order_count,
          (SELECT coalesce(sum(o.total), 0) FROM orders o WHERE o.store_id = st.id AND o.status_pagamento = 'pago') as total_revenue
        FROM stores st
        LEFT JOIN profiles p ON p.id = st.merchant_id
        WHERE 
          (p_search = '' OR st.name ILIKE '%' || p_search || '%' OR st.slug ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
          AND (p_status = 'all' OR (p_status = 'active' AND st.is_active = true) OR (p_status = 'inactive' AND st.is_active = false))
        ORDER BY st.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) s
    ), '[]'::jsonb),
    'total', (
      SELECT count(*)
      FROM stores st
      LEFT JOIN profiles p ON p.id = st.merchant_id
      WHERE 
        (p_search = '' OR st.name ILIKE '%' || p_search || '%' OR st.slug ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
        AND (p_status = 'all' OR (p_status = 'active' AND st.is_active = true) OR (p_status = 'inactive' AND st.is_active = false))
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Admin toggle store active status
CREATE OR REPLACE FUNCTION public.admin_toggle_store_status(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status boolean;
BEGIN
  IF NOT has_role(auth.uid(), 'sellify_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE stores SET is_active = NOT is_active, updated_at = now()
  WHERE id = p_store_id
  RETURNING is_active INTO new_status;

  RETURN new_status;
END;
$$;

-- Admin update store basic info
CREATE OR REPLACE FUNCTION public.admin_update_store(
  p_store_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'sellify_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE stores SET
    name = coalesce(p_name, name),
    slug = coalesce(p_slug, slug),
    updated_at = now()
  WHERE id = p_store_id;

  RETURN true;
END;
$$;
