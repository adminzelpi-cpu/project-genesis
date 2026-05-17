CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alert_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_status AS ENUM (
    'new',
    'acknowledged',
    'resolved',
    'ignored'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'sellify_admin',
    'merchant',
    'customer'
);


--
-- Name: error_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.error_category AS ENUM (
    'frontend',
    'backend',
    'database',
    'ab_testing',
    'checkout',
    'payment',
    'shipping',
    'email',
    'recommendations',
    'upsell',
    'performance',
    'security',
    'other'
);


--
-- Name: error_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.error_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: create_alert_from_errors(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_alert_from_errors() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  error_count INTEGER;
  existing_alert UUID;
BEGIN
  -- Check if similar errors occurred in the last hour
  SELECT COUNT(*), MAX(id) INTO error_count, existing_alert
  FROM public.error_logs
  WHERE category = NEW.category
    AND severity = NEW.severity
    AND message = NEW.message
    AND store_id = NEW.store_id
    AND created_at > now() - interval '1 hour';

  -- If we have multiple similar errors, create or update an alert
  IF error_count >= 3 THEN
    INSERT INTO public.system_alerts (
      store_id,
      category,
      severity,
      title,
      description,
      error_count,
      metadata
    )
    VALUES (
      NEW.store_id,
      NEW.category,
      NEW.severity,
      'Erro recorrente detectado: ' || NEW.category::text,
      NEW.message,
      error_count,
      jsonb_build_object('last_error_id', NEW.id)
    )
    ON CONFLICT (store_id, category, title) 
    WHERE status != 'resolved'
    DO UPDATE SET
      error_count = system_alerts.error_count + 1,
      last_occurrence = now(),
      updated_at = now(),
      metadata = jsonb_set(system_alerts.metadata, '{last_error_id}', to_jsonb(NEW.id));
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_default_attributes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_attributes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  color_attr_id UUID;
  tamanho_attr_id UUID;
BEGIN
  -- Criar atributo Cor (se não existir)
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (NEW.id, 'Cor', 'color')
  ON CONFLICT (store_id, name) DO NOTHING
  RETURNING id INTO color_attr_id;

  -- Se foi criado, inserir valores de cor padrão
  IF color_attr_id IS NOT NULL THEN
    INSERT INTO public.attribute_values (attribute_id, value, color_hex) VALUES
      (color_attr_id, 'Preto', '#000000'),
      (color_attr_id, 'Branco', '#FFFFFF'),
      (color_attr_id, 'Cinza', '#808080'),
      (color_attr_id, 'Azul', '#0000FF'),
      (color_attr_id, 'Azul Marinho', '#000080'),
      (color_attr_id, 'Azul Claro', '#87CEEB'),
      (color_attr_id, 'Vermelho', '#FF0000'),
      (color_attr_id, 'Verde', '#008000'),
      (color_attr_id, 'Amarelo', '#FFFF00'),
      (color_attr_id, 'Rosa', '#FFC0CB'),
      (color_attr_id, 'Pink', '#FF1493'),
      (color_attr_id, 'Roxo', '#800080'),
      (color_attr_id, 'Laranja', '#FFA500'),
      (color_attr_id, 'Bege', '#F5F5DC'),
      (color_attr_id, 'Marrom', '#8B4513'),
      (color_attr_id, 'Vinho', '#722F37'),
      (color_attr_id, 'Prata', '#C0C0C0');
  END IF;

  -- Criar atributo Tamanho unificado (se não existir)
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (NEW.id, 'Tamanho', 'size')
  ON CONFLICT (store_id, name) DO NOTHING
  RETURNING id INTO tamanho_attr_id;

  -- Se foi criado, inserir valores de tamanho padrão
  IF tamanho_attr_id IS NOT NULL THEN
    -- Valores categoria Adulto (P, M, G, GG, XG)
    INSERT INTO public.attribute_values (attribute_id, value, size_category) VALUES
      (tamanho_attr_id, 'P', 'adulto'),
      (tamanho_attr_id, 'M', 'adulto'),
      (tamanho_attr_id, 'G', 'adulto'),
      (tamanho_attr_id, 'GG', 'adulto'),
      (tamanho_attr_id, 'XG', 'adulto');

    -- Valores categoria Calça (36-46)
    INSERT INTO public.attribute_values (attribute_id, value, size_category) VALUES
      (tamanho_attr_id, '36', 'calca'),
      (tamanho_attr_id, '38', 'calca'),
      (tamanho_attr_id, '40', 'calca'),
      (tamanho_attr_id, '42', 'calca'),
      (tamanho_attr_id, '44', 'calca'),
      (tamanho_attr_id, '46', 'calca');

    -- Valores categoria Infantil (2-14)
    INSERT INTO public.attribute_values (attribute_id, value, size_category) VALUES
      (tamanho_attr_id, '2', 'infantil'),
      (tamanho_attr_id, '4', 'infantil'),
      (tamanho_attr_id, '6', 'infantil'),
      (tamanho_attr_id, '8', 'infantil'),
      (tamanho_attr_id, '10', 'infantil'),
      (tamanho_attr_id, '12', 'infantil'),
      (tamanho_attr_id, '14', 'infantil');
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_default_attributes_for_store(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_attributes_for_store(store_id_param uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  color_attr_id UUID;
  size_shirt_attr_id UUID;
  size_pants_attr_id UUID;
  size_kids_attr_id UUID;
BEGIN
  -- Criar atributo Cor
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (store_id_param, 'Cor', 'color')
  RETURNING id INTO color_attr_id;

  -- Criar valores de cor padrão
  INSERT INTO public.attribute_values (attribute_id, value, color_hex) VALUES
    (color_attr_id, 'Preto', '#000000'),
    (color_attr_id, 'Branco', '#FFFFFF'),
    (color_attr_id, 'Cinza', '#808080'),
    (color_attr_id, 'Azul', '#0000FF'),
    (color_attr_id, 'Azul Marinho', '#000080'),
    (color_attr_id, 'Azul Claro', '#87CEEB'),
    (color_attr_id, 'Vermelho', '#FF0000'),
    (color_attr_id, 'Verde', '#008000'),
    (color_attr_id, 'Amarelo', '#FFFF00'),
    (color_attr_id, 'Rosa', '#FFC0CB'),
    (color_attr_id, 'Pink', '#FF1493'),
    (color_attr_id, 'Roxo', '#800080'),
    (color_attr_id, 'Laranja', '#FFA500'),
    (color_attr_id, 'Bege', '#F5F5DC'),
    (color_attr_id, 'Marrom', '#8B4513'),
    (color_attr_id, 'Vinho', '#722F37'),
    (color_attr_id, 'Prata', '#C0C0C0');

  -- Criar atributo Tamanho - Camisetas/Polos
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (store_id_param, 'Tamanho - Camisetas/Polos', 'size')
  RETURNING id INTO size_shirt_attr_id;

  INSERT INTO public.attribute_values (attribute_id, value) VALUES
    (size_shirt_attr_id, 'P'),
    (size_shirt_attr_id, 'M'),
    (size_shirt_attr_id, 'G'),
    (size_shirt_attr_id, 'GG'),
    (size_shirt_attr_id, 'XG');

  -- Criar atributo Tamanho - Calças
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (store_id_param, 'Tamanho - Calças', 'size')
  RETURNING id INTO size_pants_attr_id;

  INSERT INTO public.attribute_values (attribute_id, value) VALUES
    (size_pants_attr_id, '36'),
    (size_pants_attr_id, '38'),
    (size_pants_attr_id, '40'),
    (size_pants_attr_id, '42'),
    (size_pants_attr_id, '44'),
    (size_pants_attr_id, '46');

  -- Criar atributo Tamanho - Infantil
  INSERT INTO public.attributes (store_id, name, type)
  VALUES (store_id_param, 'Tamanho - Infantil', 'size')
  RETURNING id INTO size_kids_attr_id;

  INSERT INTO public.attribute_values (attribute_id, value) VALUES
    (size_kids_attr_id, '2'),
    (size_kids_attr_id, '4'),
    (size_kids_attr_id, '6'),
    (size_kids_attr_id, '8'),
    (size_kids_attr_id, '10'),
    (size_kids_attr_id, '12'),
    (size_kids_attr_id, '14');
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    recipient_name text NOT NULL,
    street text NOT NULL,
    number text NOT NULL,
    complement text,
    neighborhood text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attribute_id uuid NOT NULL,
    value text NOT NULL,
    color_hex text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    size_category text
);


--
-- Name: attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    tipo text DEFAULT 'principal'::text NOT NULL,
    rua text NOT NULL,
    numero text NOT NULL,
    complemento text,
    bairro text NOT NULL,
    cidade text NOT NULL,
    estado text NOT NULL,
    cep text NOT NULL,
    is_default boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    cpf text,
    data_nascimento date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    category public.error_category NOT NULL,
    severity public.error_severity NOT NULL,
    message text NOT NULL,
    stack_trace text,
    context jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    url text,
    resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


--
-- Name: experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    experiment_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    algorithm text DEFAULT 'multi_armed_bandit'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    check_type text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    customer_id uuid,
    products jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    frete numeric(10,2) DEFAULT 0 NOT NULL,
    desconto numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    forma_pagamento text,
    status_pagamento text DEFAULT 'pendente'::text NOT NULL,
    status_pedido text DEFAULT 'novo'::text NOT NULL,
    endereco_entrega jsonb,
    observacao_cliente text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_snapshots jsonb DEFAULT '[]'::jsonb,
    stock_updated boolean DEFAULT false,
    CONSTRAINT check_status_pagamento CHECK ((status_pagamento = ANY (ARRAY['pendente'::text, 'pago'::text, 'falhou'::text, 'reembolsado'::text]))),
    CONSTRAINT check_status_pedido CHECK ((status_pedido = ANY (ARRAY['novo'::text, 'em_preparo'::text, 'enviado'::text, 'entregue'::text, 'cancelado'::text])))
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_brand text NOT NULL,
    card_last4 text NOT NULL,
    holder_name text NOT NULL,
    expiry_month text NOT NULL,
    expiry_year text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    metric_type text NOT NULL,
    metric_name text NOT NULL,
    value numeric NOT NULL,
    unit text,
    tags jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    parent_id uuid,
    seo_title text,
    seo_description text,
    google_category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    value text NOT NULL,
    image_url text,
    price_adjustment numeric(10,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_variants_type_check CHECK ((type = ANY (ARRAY['color'::text, 'size'::text, 'style'::text])))
);


--
-- Name: product_variations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text,
    price numeric DEFAULT 0 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    image_url text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variations_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variations_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text,
    price numeric DEFAULT 0 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    image_url text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sale_price numeric,
    weight numeric,
    height numeric,
    width numeric,
    length numeric,
    gtin text,
    ean text,
    upc text,
    mpn text,
    images jsonb DEFAULT '[]'::jsonb,
    parent_id uuid,
    is_parent boolean DEFAULT false NOT NULL,
    override_fields jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    images jsonb DEFAULT '[]'::jsonb,
    keywords text[] DEFAULT ARRAY[]::text[],
    ai_generated_description boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    stock_quantity integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gallery_layout text DEFAULT 'thumbnails'::text,
    variant_selector_layout text DEFAULT 'grid'::text,
    meta_title text,
    meta_description text,
    structured_data jsonb,
    image_alt_tags jsonb DEFAULT '[]'::jsonb,
    sale_price numeric,
    weight numeric,
    length numeric,
    width numeric,
    height numeric,
    category text,
    brand text,
    tags text[] DEFAULT ARRAY[]::text[],
    category_id uuid,
    category_ids uuid[] DEFAULT ARRAY[]::uuid[],
    display_variations_separately boolean DEFAULT false NOT NULL,
    CONSTRAINT products_gallery_layout_check CHECK ((gallery_layout = ANY (ARRAY['thumbnails'::text, 'carousel'::text]))),
    CONSTRAINT products_variant_selector_layout_check CHECK ((variant_selector_layout = ANY (ARRAY['grid'::text, 'carousel'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo_url text,
    theme_primary_color text DEFAULT '#000000'::text,
    theme_secondary_color text DEFAULT '#ffffff'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    category public.error_category NOT NULL,
    severity public.error_severity NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    suggested_fix text,
    status public.alert_status DEFAULT 'new'::public.alert_status,
    error_count integer DEFAULT 1,
    first_occurrence timestamp with time zone DEFAULT now(),
    last_occurrence timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    experiment_id uuid NOT NULL,
    name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    conversion_rate numeric(5,4) DEFAULT 0,
    is_winner boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: attribute_values attribute_values_attribute_id_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_attribute_id_value_key UNIQUE (attribute_id, value);


--
-- Name: attribute_values attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_pkey PRIMARY KEY (id);


--
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (id);


--
-- Name: attributes attributes_store_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_store_id_name_key UNIQUE (store_id, name);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: health_checks health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checks
    ADD CONSTRAINT health_checks_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: performance_metrics performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_store_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_store_id_slug_key UNIQUE (store_id, slug);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variations product_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations
    ADD CONSTRAINT product_variations_pkey PRIMARY KEY (id);


--
-- Name: product_variations_v2 product_variations_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations_v2
    ADD CONSTRAINT product_variations_v2_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_store_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_slug_key UNIQUE (store_id, slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_key UNIQUE (slug);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: idx_attribute_values_attribute_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attribute_values_attribute_id ON public.attribute_values USING btree (attribute_id);


--
-- Name: idx_attributes_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attributes_store_id ON public.attributes USING btree (store_id);


--
-- Name: idx_customer_addresses_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses USING btree (customer_id);


--
-- Name: idx_customers_cpf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_cpf ON public.customers USING btree (cpf);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_customers_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_store_id ON public.customers USING btree (store_id);


--
-- Name: idx_error_logs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_category ON public.error_logs USING btree (category);


--
-- Name: idx_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_created_at ON public.error_logs USING btree (created_at DESC);


--
-- Name: idx_error_logs_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_resolved ON public.error_logs USING btree (resolved);


--
-- Name: idx_error_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_severity ON public.error_logs USING btree (severity);


--
-- Name: idx_error_logs_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_store_id ON public.error_logs USING btree (store_id);


--
-- Name: idx_health_checks_check_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_checks_check_type ON public.health_checks USING btree (check_type);


--
-- Name: idx_health_checks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_checks_created_at ON public.health_checks USING btree (created_at DESC);


--
-- Name: idx_health_checks_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_checks_store_id ON public.health_checks USING btree (store_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_status_pedido; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_pedido ON public.orders USING btree (status_pedido);


--
-- Name: idx_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_store_id ON public.orders USING btree (store_id);


--
-- Name: idx_performance_metrics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_metrics_created_at ON public.performance_metrics USING btree (created_at DESC);


--
-- Name: idx_performance_metrics_metric_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_metrics_metric_type ON public.performance_metrics USING btree (metric_type);


--
-- Name: idx_performance_metrics_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_metrics_store_id ON public.performance_metrics USING btree (store_id);


--
-- Name: idx_product_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_categories_parent_id ON public.product_categories USING btree (parent_id);


--
-- Name: idx_product_categories_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_categories_store_id ON public.product_categories USING btree (store_id);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variations_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variations_product_id ON public.product_variations USING btree (product_id);


--
-- Name: idx_product_variations_v2_is_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variations_v2_is_parent ON public.product_variations_v2 USING btree (is_parent);


--
-- Name: idx_product_variations_v2_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variations_v2_parent_id ON public.product_variations_v2 USING btree (parent_id);


--
-- Name: idx_product_variations_v2_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variations_v2_product_id ON public.product_variations_v2 USING btree (product_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_system_alerts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_category ON public.system_alerts USING btree (category);


--
-- Name: idx_system_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_created_at ON public.system_alerts USING btree (created_at DESC);


--
-- Name: idx_system_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);


--
-- Name: idx_system_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_status ON public.system_alerts USING btree (status);


--
-- Name: idx_system_alerts_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_store_id ON public.system_alerts USING btree (store_id);


--
-- Name: error_logs create_alert_from_error_pattern; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_alert_from_error_pattern AFTER INSERT ON public.error_logs FOR EACH ROW EXECUTE FUNCTION public.create_alert_from_errors();


--
-- Name: stores create_default_attributes_on_store_creation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_default_attributes_on_store_creation AFTER INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.create_default_attributes();


--
-- Name: stores create_default_attributes_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_default_attributes_trigger AFTER INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.create_default_attributes();


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attributes update_attributes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attributes_updated_at BEFORE UPDATE ON public.attributes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: experiments update_experiments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_methods update_payment_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_categories update_product_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variations update_product_variations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variations_updated_at BEFORE UPDATE ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variations_v2 update_product_variations_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variations_v2_updated_at BEFORE UPDATE ON public.product_variations_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stores update_stores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_alerts update_system_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_alerts_updated_at BEFORE UPDATE ON public.system_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: variants update_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: attribute_values attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- Name: attributes attributes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customers customers_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: error_logs error_logs_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: error_logs error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: experiments experiments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: health_checks health_checks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checks
    ADD CONSTRAINT health_checks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: payment_methods payment_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: performance_metrics performance_metrics_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: product_categories product_categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variations product_variations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations
    ADD CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variations_v2 product_variations_v2_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations_v2
    ADD CONSTRAINT product_variations_v2_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_variations_v2(id) ON DELETE CASCADE;


--
-- Name: product_variations_v2 product_variations_v2_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations_v2
    ADD CONSTRAINT product_variations_v2_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stores stores_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: system_alerts system_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_alerts system_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: system_alerts system_alerts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: variants variants_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: error_logs Admins can manage all error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all error logs" ON public.error_logs USING (public.has_role(auth.uid(), 'sellify_admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'sellify_admin'::public.app_role));


--
-- Name: product_categories Anyone can view active categories from active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active categories from active stores" ON public.product_categories FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = product_categories.store_id) AND (stores.is_active = true))))));


--
-- Name: product_variations Anyone can view active product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active product variations" ON public.product_variations FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM (public.products
     JOIN public.stores ON ((stores.id = products.store_id)))
  WHERE ((products.id = product_variations.product_id) AND (products.is_active = true) AND (stores.is_active = true))))));


--
-- Name: product_variations_v2 Anyone can view active product variations v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active product variations v2" ON public.product_variations_v2 FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM (public.products
     JOIN public.stores ON ((stores.id = products.store_id)))
  WHERE ((products.id = product_variations_v2.product_id) AND (products.is_active = true) AND (stores.is_active = true))))));


--
-- Name: products Anyone can view active products from active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active products from active stores" ON public.products FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = products.store_id) AND (stores.is_active = true))))));


--
-- Name: attributes Anyone can view active store attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active store attributes" ON public.attributes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = attributes.store_id) AND (stores.is_active = true)))));


--
-- Name: stores Anyone can view active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT USING ((is_active = true));


--
-- Name: attribute_values Anyone can view attribute values from active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view attribute values from active stores" ON public.attribute_values FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.attributes
     JOIN public.stores ON ((stores.id = attributes.store_id)))
  WHERE ((attributes.id = attribute_values.attribute_id) AND (stores.is_active = true)))));


--
-- Name: variants Anyone can view variants for active experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view variants for active experiments" ON public.variants FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.experiments
  WHERE ((experiments.id = variants.experiment_id) AND (experiments.status = 'active'::text)))));


--
-- Name: system_alerts Merchants can acknowledge their store alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can acknowledge their store alerts" ON public.system_alerts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = system_alerts.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customer_addresses Merchants can create addresses for their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can create addresses for their store customers" ON public.customer_addresses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.customers
     JOIN public.stores ON ((stores.id = customers.store_id)))
  WHERE ((customers.id = customer_addresses.customer_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customers Merchants can create customers for their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can create customers for their stores" ON public.customers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = customers.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: orders Merchants can create orders for their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can create orders for their stores" ON public.orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = orders.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: stores Merchants can create stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can create stores" ON public.stores FOR INSERT WITH CHECK (((auth.uid() = merchant_id) AND public.has_role(auth.uid(), 'merchant'::public.app_role)));


--
-- Name: customer_addresses Merchants can delete addresses of their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can delete addresses of their store customers" ON public.customer_addresses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.customers
     JOIN public.stores ON ((stores.id = customers.store_id)))
  WHERE ((customers.id = customer_addresses.customer_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customers Merchants can delete their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can delete their store customers" ON public.customers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = customers.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: orders Merchants can delete their store orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can delete their store orders" ON public.orders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = orders.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: stores Merchants can manage their own stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their own stores" ON public.stores USING (((auth.uid() = merchant_id) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role)));


--
-- Name: attribute_values Merchants can manage their store attribute values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store attribute values" ON public.attribute_values USING ((EXISTS ( SELECT 1
   FROM (public.attributes
     JOIN public.stores ON ((stores.id = attributes.store_id)))
  WHERE ((attributes.id = attribute_values.attribute_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: attributes Merchants can manage their store attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store attributes" ON public.attributes USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = attributes.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: product_categories Merchants can manage their store categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store categories" ON public.product_categories USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = product_categories.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: product_variations Merchants can manage their store product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store product variations" ON public.product_variations USING ((EXISTS ( SELECT 1
   FROM (public.products
     JOIN public.stores ON ((stores.id = products.store_id)))
  WHERE ((products.id = product_variations.product_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: product_variations_v2 Merchants can manage their store product variations v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store product variations v2" ON public.product_variations_v2 USING ((EXISTS ( SELECT 1
   FROM (public.products
     JOIN public.stores ON ((stores.id = products.store_id)))
  WHERE ((products.id = product_variations_v2.product_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: products Merchants can manage their store products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store products" ON public.products USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = products.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: product_variants Merchants can manage their store's product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can manage their store's product variants" ON public.product_variants USING ((EXISTS ( SELECT 1
   FROM (public.products
     JOIN public.stores ON ((stores.id = products.store_id)))
  WHERE ((products.id = product_variants.product_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customer_addresses Merchants can update addresses of their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can update addresses of their store customers" ON public.customer_addresses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.customers
     JOIN public.stores ON ((stores.id = customers.store_id)))
  WHERE ((customers.id = customer_addresses.customer_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customers Merchants can update their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can update their store customers" ON public.customers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = customers.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: orders Merchants can update their store orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can update their store orders" ON public.orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = orders.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customer_addresses Merchants can view addresses of their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view addresses of their store customers" ON public.customer_addresses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.customers
     JOIN public.stores ON ((stores.id = customers.store_id)))
  WHERE ((customers.id = customer_addresses.customer_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: system_alerts Merchants can view their store alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store alerts" ON public.system_alerts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = system_alerts.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: customers Merchants can view their store customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store customers" ON public.customers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = customers.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: error_logs Merchants can view their store error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store error logs" ON public.error_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = error_logs.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: experiments Merchants can view their store experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store experiments" ON public.experiments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = experiments.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: health_checks Merchants can view their store health checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store health checks" ON public.health_checks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = health_checks.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: performance_metrics Merchants can view their store metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store metrics" ON public.performance_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = performance_metrics.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: orders Merchants can view their store orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchants can view their store orders" ON public.orders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = orders.store_id) AND ((stores.merchant_id = auth.uid()) OR public.has_role(auth.uid(), 'sellify_admin'::public.app_role))))));


--
-- Name: product_variants Product variants are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product variants are viewable by everyone" ON public.product_variants FOR SELECT USING ((is_active = true));


--
-- Name: error_logs System can insert error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert error logs" ON public.error_logs FOR INSERT WITH CHECK (true);


--
-- Name: health_checks System can insert health checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert health checks" ON public.health_checks FOR INSERT WITH CHECK (true);


--
-- Name: performance_metrics System can insert metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert metrics" ON public.performance_metrics FOR INSERT WITH CHECK (true);


--
-- Name: system_alerts System can manage alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage alerts" ON public.system_alerts USING (public.has_role(auth.uid(), 'sellify_admin'::public.app_role));


--
-- Name: experiments System can manage experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage experiments" ON public.experiments USING (public.has_role(auth.uid(), 'sellify_admin'::public.app_role));


--
-- Name: variants System can manage variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage variants" ON public.variants USING (public.has_role(auth.uid(), 'sellify_admin'::public.app_role));


--
-- Name: addresses Users can delete their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: payment_methods Users can delete their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own payment methods" ON public.payment_methods FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: addresses Users can insert their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payment_methods Users can insert their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own payment methods" ON public.payment_methods FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: addresses Users can update their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: payment_methods Users can update their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own payment methods" ON public.payment_methods FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: addresses Users can view their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payment_methods Users can view their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payment methods" ON public.payment_methods FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: attribute_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;

--
-- Name: attributes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: experiments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

--
-- Name: health_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: product_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variations_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variations_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: system_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


