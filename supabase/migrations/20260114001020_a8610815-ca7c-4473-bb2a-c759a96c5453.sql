-- Drop the overly restrictive SELECT policy for merchants on store_menu_items
DROP POLICY IF EXISTS "Merchants can view their menu items" ON public.store_menu_items;

-- Create a better policy that allows merchants to view all items in their menus
CREATE POLICY "Merchants can view their menu items"
  ON public.store_menu_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_menus sm
      JOIN public.stores s ON s.id = sm.store_id
      WHERE sm.id = store_menu_items.menu_id
      AND s.merchant_id = auth.uid()
    )
  );