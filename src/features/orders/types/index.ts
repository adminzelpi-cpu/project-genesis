export type StatusPagamento = 'pendente' | 'pago' | 'falhou' | 'reembolsado' | 'expirado' | 'recusado' | 'rejeitado' | 'aprovado';
export type StatusPedido = 'novo' | 'em_preparo' | 'enviado' | 'entregue' | 'cancelado' | 'devolvido';

export interface OrderProduct {
  id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  subtotal?: number;
  total_price?: number;
  variant?: string;
  variation_id?: string;
  image?: string;
}

/** Safely get the unit price from an order product (handles both field names) */
export function getProductPrice(product: OrderProduct): number {
  return product.price ?? product.unit_price ?? 0;
}

/** Safely get the subtotal from an order product (handles both field names) */
export function getProductSubtotal(product: OrderProduct): number {
  return product.subtotal ?? product.total_price ?? (getProductPrice(product) * (product.quantity || 1));
}

export interface EnderecoEntrega {
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
}

export interface Order {
  id: string;
  store_id: string;
  customer_id?: string;
  customers?: { nome: string; email?: string } | null;
  order_number?: number;
  products: OrderProduct[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  forma_pagamento?: string;
  status_pagamento: StatusPagamento;
  status_pedido: StatusPedido;
  endereco_entrega?: EnderecoEntrega;
  observacao_cliente?: string;
  tracking_code?: string;
  tracking_carrier?: string;
  tracking_url?: string;
  tracking_code_sent_at?: string;
  created_at: string;
  updated_at: string;
}

/** Format order number for display: #1001, #1002, etc. Falls back to UUID slice */
export function formatOrderNumber(order: { order_number?: number | null; id: string }): string {
  if (order.order_number) {
    return `#${order.order_number}`;
  }
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  novo: 'Novo',
  em_preparo: 'Em Preparo',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  devolvido: 'Devolvido',
};

export const STATUS_PAGAMENTO_LABELS: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  aprovado: 'Aprovado',
  falhou: 'Falhou',
  reembolsado: 'Reembolsado',
  expirado: 'Expirado',
  recusado: 'Recusado',
  rejeitado: 'Recusado',
};

export const STATUS_PEDIDO_COLORS: Record<StatusPedido, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-yellow-100 text-yellow-800',
  enviado: 'bg-purple-100 text-purple-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  devolvido: 'bg-orange-100 text-orange-800',
};

export const STATUS_PAGAMENTO_COLORS: Record<StatusPagamento, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  aprovado: 'bg-green-100 text-green-800',
  falhou: 'bg-red-100 text-red-800',
  reembolsado: 'bg-gray-100 text-gray-800',
  expirado: 'bg-orange-100 text-orange-800',
  recusado: 'bg-red-100 text-red-800',
  rejeitado: 'bg-red-100 text-red-800',
};
