CREATE OR REPLACE FUNCTION public.get_gateway_checkout_config(store_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
      'gateway_type', g.gateway_type,
      'is_active', g.is_active,
      'pix_discount', COALESCE((g.credentials->>'pix_discount')::numeric, 0),
      'boleto_discount', COALESCE((g.credentials->>'boleto_discount')::numeric, 0),
      'installment_config', COALESCE(
        g.credentials->'installment_config',
        jsonb_build_object(
          'maxInstallments', 12,
          'interestRate', 2.99,
          'freeInstallments', 1,
          'minInstallmentValue', 5
        )
      )
    )
    INTO result
  FROM public.store_payment_gateways g
  WHERE g.store_id = store_id_param
    AND g.is_active = true
  ORDER BY
    CASE WHEN g.gateway_type = 'pagarme' THEN 0 ELSE 1 END,
    g.updated_at DESC
  LIMIT 1;

  RETURN result;
END;
$function$;