import { supabase } from "@/integrations/supabase/client";

export type EmailType =
  | "order_confirmed"
  | "order_preparing"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_confirmed"
  | "payment_failed"
  | "boleto_generated"
  | "pix_generated"
  | "pix_expired"
  | "welcome"
  | "tracking_code"
  | "refund_processed"
  | "invoice_generated";

export interface ProductItem {
  name: string;
  quantity: number;
  price: number;
  image_url?: string;
  variation?: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface OrderData {
  order_number: string;
  products: ProductItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  delivery_address?: DeliveryAddress;
  tracking_code?: string;
  tracking_carrier?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  refund_amount?: number;
  refund_reason?: string;
  invoice_number?: string;
  invoice_url?: string;
}

export interface PaymentData {
  method: "pix" | "boleto" | "credit_card";
  qr_code?: string;
  qr_code_base64?: string;
  barcode?: string;
  barcode_url?: string;
  expiration_date?: string;
  amount: number;
}

export interface SendEmailParams {
  store_id: string;
  order_id?: string;
  email_type: EmailType;
  recipient_email: string;
  recipient_name: string;
  order_data?: OrderData;
  payment_data?: PaymentData;
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<{
  success: boolean;
  email_id?: string;
  error?: string;
}> {
  try {
    console.log("[sendTransactionalEmail] Sending email:", params.email_type);

    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: params,
    });

    if (error) {
      console.error("[sendTransactionalEmail] Function error:", error);
      return { success: false, error: error.message };
    }

    console.log("[sendTransactionalEmail] Response:", data);
    return data;
  } catch (error: any) {
    console.error("[sendTransactionalEmail] Error:", error);
    return { success: false, error: error.message };
  }
}

// Helper to build order data from order record
export function buildOrderDataFromOrder(
  order: any
): OrderData {
  const products: ProductItem[] = (order.products || []).map((p: any) => ({
    name: p.name || p.product_name || "Produto",
    quantity: p.quantity || 1,
    price: p.price || p.unit_price || p.total_price || 0,
    image_url: p.image_url || p.image || p.images?.[0],
    variation: p.variation_name || p.variation || p.variant,
  }));

  const deliveryAddress = order.endereco_entrega
    ? {
        street: order.endereco_entrega.rua || order.endereco_entrega.street || "",
        number: order.endereco_entrega.numero || order.endereco_entrega.number || "",
        complement: order.endereco_entrega.complemento || order.endereco_entrega.complement,
        neighborhood: order.endereco_entrega.bairro || order.endereco_entrega.neighborhood || "",
        city: order.endereco_entrega.cidade || order.endereco_entrega.city || "",
        state: order.endereco_entrega.estado || order.endereco_entrega.state || "",
        zip_code: order.endereco_entrega.cep || order.endereco_entrega.zip_code || "",
      }
    : undefined;

  // Always use #order_number format
  const orderNumber = order.order_number
    ? `#${order.order_number}`
    : `#${order.id.substring(0, 8).toUpperCase()}`;

  return {
    order_number: orderNumber,
    products,
    subtotal: order.subtotal || 0,
    shipping: order.frete || 0,
    discount: order.desconto || 0,
    total: order.total || 0,
    delivery_address: deliveryAddress,
  };
}
