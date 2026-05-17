-- Add email tracking columns to email_logs
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS abandoned_cart_id UUID REFERENCES public.abandoned_carts(id);

-- Create index for faster tracking lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_id ON public.email_logs(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_abandoned_cart_id ON public.email_logs(abandoned_cart_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);

-- Create a function to get abandoned cart analytics
CREATE OR REPLACE FUNCTION public.get_abandoned_cart_analytics(store_id_param UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_abandoned_carts', (
      SELECT COUNT(*) FROM abandoned_carts 
      WHERE store_id = store_id_param 
      AND abandoned_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_emails_sent', (
      SELECT COUNT(*) FROM email_logs 
      WHERE store_id = store_id_param 
      AND email_type LIKE 'abandoned_cart%'
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_opened', (
      SELECT COUNT(*) FROM email_logs 
      WHERE store_id = store_id_param 
      AND email_type LIKE 'abandoned_cart%'
      AND opened_at IS NOT NULL
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_clicked', (
      SELECT COUNT(*) FROM email_logs 
      WHERE store_id = store_id_param 
      AND email_type LIKE 'abandoned_cart%'
      AND clicked_at IS NOT NULL
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_recovered', (
      SELECT COUNT(*) FROM abandoned_carts 
      WHERE store_id = store_id_param 
      AND recovered_at IS NOT NULL
      AND abandoned_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'revenue_recovered', (
      SELECT COALESCE(SUM(o.total), 0) FROM abandoned_carts ac
      JOIN orders o ON o.id = ac.order_id
      WHERE ac.store_id = store_id_param 
      AND ac.recovered_at IS NOT NULL
      AND ac.abandoned_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'revenue_abandoned', (
      SELECT COALESCE(SUM(cart_total), 0) FROM abandoned_carts 
      WHERE store_id = store_id_param 
      AND recovered_at IS NULL
      AND abandoned_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    'daily_stats', (
      SELECT COALESCE(json_agg(daily ORDER BY daily.date), '[]'::json) FROM (
        SELECT 
          DATE(abandoned_at) as date,
          COUNT(*) as abandoned,
          COUNT(*) FILTER (WHERE recovered_at IS NOT NULL) as recovered
        FROM abandoned_carts
        WHERE store_id = store_id_param 
        AND abandoned_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(abandoned_at)
      ) daily
    ),
    'by_email_sequence', (
      SELECT COALESCE(json_agg(seq), '[]'::json) FROM (
        SELECT 
          email_type,
          COUNT(*) as sent,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
          COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked
        FROM email_logs
        WHERE store_id = store_id_param 
        AND email_type LIKE 'abandoned_cart%'
        AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY email_type
        ORDER BY email_type
      ) seq
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Update insert_email_log function to include tracking_id and abandoned_cart_id
CREATE OR REPLACE FUNCTION public.insert_email_log(
  p_email_type TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_resend_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_store_id TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_abandoned_cart_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  new_tracking_id UUID;
BEGIN
  new_tracking_id := gen_random_uuid();
  
  INSERT INTO email_logs (
    email_type,
    error_message,
    order_id,
    recipient_email,
    recipient_name,
    resend_id,
    status,
    store_id,
    subject,
    tracking_id,
    abandoned_cart_id,
    sent_at
  ) VALUES (
    p_email_type,
    p_error_message,
    CASE WHEN p_order_id IS NOT NULL AND p_order_id != '' THEN p_order_id::UUID ELSE NULL END,
    p_recipient_email,
    p_recipient_name,
    p_resend_id,
    p_status,
    p_store_id::UUID,
    p_subject,
    new_tracking_id,
    CASE WHEN p_abandoned_cart_id IS NOT NULL AND p_abandoned_cart_id != '' THEN p_abandoned_cart_id::UUID ELSE NULL END,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;