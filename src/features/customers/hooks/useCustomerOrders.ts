import { useQuery } from "@tanstack/react-query";
import { invokeCustomerFn, hasCustomerToken } from "@/features/customers/lib/customerApi";

export interface CustomerOrder {
  id: string;
  order_number: number | null;
  store_id: string;
  created_at: string;
  updated_at: string;
  total: number;
  subtotal: number;
  frete: number;
  desconto: number;
  status_pedido: string;
  status_pagamento: string;
  forma_pagamento: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  tracking_carrier: string | null;
  products: Array<{
    product_id: string;
    variation_id?: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
    variant?: string;
    variation?: string;
    variation_name?: string;
    color?: string;
    size?: string;
  }>;
  product_snapshots?: Array<{
    name: string;
    image_url?: string;
    variation_name?: string;
    color?: string;
    size?: string;
  }>;
  endereco_entrega?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    metodo_envio?: string | null;
    transportadora?: string | null;
    prazo_entrega_dias?: number | null;
  };
  store?: {
    slug: string;
    name: string;
    order_prefix: string | null;
  };
}

function normalizeOrder(order: any): CustomerOrder {
  const rawProducts = order.products;
  const rawArray = Array.isArray(rawProducts)
    ? (rawProducts as any[])
    : (typeof rawProducts === 'object' && rawProducts !== null ? [rawProducts] as any[] : []);

  const products: CustomerOrder['products'] = rawArray.map((p: any) => ({
    product_id: p.product_id || '',
    variation_id: p.variation_id,
    name: p.name || '',
    quantity: p.quantity || 1,
    price: p.unit_price ?? p.price ?? 0,
    image_url: p.image || p.image_url,
    variant: p.variant,
    variation: p.variation,
    variation_name: p.variation_name,
    color: p.color,
    size: p.size,
  }));

  const storeData = Array.isArray(order.store) ? order.store[0] : order.store;

  return {
    id: order.id,
    order_number: order.order_number ?? null,
    store_id: order.store_id,
    created_at: order.created_at,
    updated_at: order.updated_at,
    total: order.total,
    subtotal: order.subtotal,
    frete: order.frete,
    desconto: order.desconto,
    status_pedido: order.status_pedido,
    status_pagamento: order.status_pagamento,
    forma_pagamento: order.forma_pagamento,
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    tracking_carrier: order.tracking_carrier,
    products,
    product_snapshots: order.product_snapshots as CustomerOrder['product_snapshots'],
    endereco_entrega: order.endereco_entrega as CustomerOrder['endereco_entrega'],
    store: storeData,
  };
}

export function useCustomerOrders() {
  return useQuery({
    queryKey: ["customer-orders"],
    queryFn: async () => {
      if (!hasCustomerToken()) return [];
      const res = await invokeCustomerFn<{ orders: any[] }>("customer-orders", {
        body: {},
      });
      return (res.orders || []).map(normalizeOrder);
    },
    // Garante que mudanças de status feitas pelo lojista (status_pedido, tracking_code,
    // status_pagamento via webhook) reflitam rapidamente no portal do cliente:
    // refresca quando a aba volta ao foco e considera dados velhos após 30s.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCustomerOrderStats() {
  const { data: orders, isLoading } = useCustomerOrders();
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status_pedido === 'novo' || o.status_pedido === 'em_preparo').length || 0,
    shipped: orders?.filter(o => o.status_pedido === 'enviado').length || 0,
    delivered: orders?.filter(o => o.status_pedido === 'entregue').length || 0,
    cancelled: orders?.filter(o => o.status_pedido === 'cancelado').length || 0,
    paymentPending: orders?.filter(o =>
      o.status_pagamento === 'pendente' ||
      o.status_pagamento === 'expirado' ||
      o.status_pagamento === 'recusado' ||
      o.status_pagamento === 'rejeitado' ||
      o.status_pagamento === 'falhou'
    ).length || 0,
  };
  return { stats, isLoading };
}

export function useOrdersWithPaymentIssues() {
  const { data: orders, isLoading } = useCustomerOrders();
  const ordersWithIssues = (orders || []).filter(order =>
    order.status_pagamento === 'pendente' ||
    order.status_pagamento === 'expirado' ||
    order.status_pagamento === 'recusado' ||
    order.status_pagamento === 'rejeitado' ||
    order.status_pagamento === 'falhou'
  );
  return { orders: ordersWithIssues, isLoading };
}
