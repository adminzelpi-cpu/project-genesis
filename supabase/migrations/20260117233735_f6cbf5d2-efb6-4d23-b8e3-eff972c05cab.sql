-- Create partial unique index for system_alerts ON CONFLICT clause
-- This index is required by the check_low_stock_after_decrement trigger
CREATE UNIQUE INDEX IF NOT EXISTS system_alerts_store_category_title_active_idx 
ON public.system_alerts (store_id, category, title) 
WHERE status != 'resolved';