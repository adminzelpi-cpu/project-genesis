CREATE UNIQUE INDEX IF NOT EXISTS customers_store_cpf_unique
  ON public.customers (store_id, cpf)
  WHERE cpf IS NOT NULL;

CREATE OR REPLACE FUNCTION public.upsert_customer_for_checkout(
  p_store_id uuid,
  p_cpf text,
  p_nome text,
  p_email text DEFAULT NULL::text,
  p_telefone text DEFAULT NULL::text,
  p_data_nascimento date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
BEGIN
  IF length(p_nome) < 2 OR length(p_nome) > 100 THEN
    RAISE EXCEPTION 'Nome deve ter entre 2 e 100 caracteres';
  END IF;

  IF p_email IS NOT NULL AND NOT p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  INSERT INTO customers (store_id, cpf, nome, email, telefone, data_nascimento)
  VALUES (p_store_id, p_cpf, p_nome, p_email, p_telefone, p_data_nascimento)
  ON CONFLICT (store_id, cpf) WHERE cpf IS NOT NULL
  DO UPDATE SET
    nome = EXCLUDED.nome,
    email = COALESCE(EXCLUDED.email, customers.email),
    telefone = COALESCE(EXCLUDED.telefone, customers.telefone),
    data_nascimento = COALESCE(EXCLUDED.data_nascimento, customers.data_nascimento),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$function$;