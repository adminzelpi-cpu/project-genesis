ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_id text,
  ADD COLUMN IF NOT EXISTS cloudflare_www_hostname_id text;

CREATE INDEX IF NOT EXISTS idx_custom_domains_cf_hostname
  ON public.custom_domains(cloudflare_hostname_id)
  WHERE cloudflare_hostname_id IS NOT NULL;