import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendTransactionalEmail, buildOrderDataFromOrder } from "@/features/emails";
import { markCartAsRecovered } from "@/features/abandoned-carts";
import { getStoredCustomerSession, persistCustomerSessionToStorage, useCustomerAuth } from "@/features/auth/hooks/useCustomerAuth";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  variationId?: string;
  productCode?: number;
  colorCode?: number;
  sizeCode?: number;
  displaySeparately?: boolean;
}

interface PersonalData {
  email: string;
  fullName: string;
  phone: string;
  cpf: string;
}

interface DeliveryAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  recipient?: string;
  shippingPrice?: number;
  shippingDeliveryDays?: number;
  shippingCarrier?: string;
  shippingMethodName?: string;
}

interface CreateOrderParams {
  storeId: string;
  items: CartItem[];
  personalData: PersonalData;
  deliveryAddress: DeliveryAddress;
  paymentMethod: "pix" | "boleto" | "credit_card";
  subtotal: number;
  shipping: number;
  discount?: number;
  observations?: string;
  couponId?: string | null;
  recognizedCustomerId?: string | null; // Pre-recognized customer by CPF
}

export interface OrderResult {
  orderId: string;
  orderNumber: number;
  customerId: string;
}

export function useCreateOrder() {
  const { toast } = useToast();
  const { setSession } = useCustomerAuth();

  return useMutation({
    mutationFn: async (params: CreateOrderParams): Promise<OrderResult> => {
      const {
        storeId,
        items,
        personalData,
        deliveryAddress,
        paymentMethod,
        subtotal,
        shipping,
        discount = 0,
        observations,
        couponId,
        recognizedCustomerId,
      } = params;

      const cleanCpf = personalData.cpf.replace(/\D/g, "");
      let customerId: string;
      let isNewCustomer = false;

      // Customer logged into THIS store via the custom JWT (store-isolated auth)
      const customerSession = getStoredCustomerSession();
      const loggedInCustomerId =
        customerSession && customerSession.store_id === storeId
          ? customerSession.customer_id
          : null;

      // Priority order for identifying the customer:
      // 1) Logged-in customer (JWT) — strongest signal, store-isolated
      // 2) Pre-recognized via CPF lookup at checkout
      // 3) Search by CPF (legacy fallback)
      // 4) Create new
      const resolvedExistingId = loggedInCustomerId || recognizedCustomerId || null;

      if (resolvedExistingId) {
        customerId = resolvedExistingId;

        // Refresh latest contact data on the customer record
        await supabase
          .from("customers")
          .update({
            nome: personalData.fullName,
            email: personalData.email,
            telefone: personalData.phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);

        console.log("[useCreateOrder] Using existing customer:", customerId, loggedInCustomerId ? "(JWT)" : "(CPF)");
      } else {
        // Search by CPF in this store
        const { data: existingByCpf } = await supabase
          .from("customers")
          .select("id")
          .eq("store_id", storeId)
          .eq("cpf", cleanCpf)
          .maybeSingle();

        if (existingByCpf) {
          customerId = existingByCpf.id;
          await supabase
            .from("customers")
            .update({
              nome: personalData.fullName,
              email: personalData.email,
              telefone: personalData.phone,
              updated_at: new Date().toISOString(),
            })
            .eq("id", customerId);
        } else {
          // Fallback: search by email in this store (e.g. customer created an account
          // earlier via favorites/login but is not currently logged in). Prevents
          // duplicate-key violation on customers_store_id_email_unique.
          let existingByEmailId: string | null = null;
          let existingByEmailCpf: string | null = null;
          if (personalData.email) {
            const { data: existingByEmail } = await supabase
              .from("customers")
              .select("id, cpf")
              .eq("store_id", storeId)
              .eq("email", personalData.email)
              .maybeSingle();
            existingByEmailId = existingByEmail?.id ?? null;
            existingByEmailCpf = existingByEmail?.cpf ?? null;
          }

          if (existingByEmailId) {
            customerId = existingByEmailId;

            // Audit: if the existing customer had a different CPF, log it.
            // This is a rare but possible case (shared email, typo, recycled email)
            // that we want visibility on without blocking the checkout.
            const cpfChanged = existingByEmailCpf && existingByEmailCpf !== cleanCpf;
            if (cpfChanged) {
              console.warn(
                "[useCreateOrder] CPF divergence detected on email match",
                {
                  customer_id: customerId,
                  email: personalData.email,
                  previous_cpf_last4: existingByEmailCpf?.slice(-4),
                  new_cpf_last4: cleanCpf.slice(-4),
                }
              );
              // Best-effort audit log; never block checkout if it fails.
              try {
                await supabase.from("customer_activity_log").insert({
                  store_id: storeId,
                  customer_id: customerId,
                  activity_type: "cpf_divergence_on_email_match",
                  activity_data: {
                    email: personalData.email,
                    previous_cpf_last4: existingByEmailCpf?.slice(-4),
                    new_cpf_last4: cleanCpf.slice(-4),
                    source: "checkout",
                  },
                });
              } catch (logErr) {
                console.warn("[useCreateOrder] Failed to write divergence audit log:", logErr);
              }
            }

            await supabase
              .from("customers")
              .update({
                nome: personalData.fullName,
                telefone: personalData.phone,
                cpf: cleanCpf,
                updated_at: new Date().toISOString(),
              })
              .eq("id", customerId);
            console.log("[useCreateOrder] Matched existing customer by email:", customerId);
          } else {
            // Create new customer (guest checkout)
            const { data: newCustomer, error: customerError } = await supabase
              .from("customers")
              .insert({
                store_id: storeId,
                nome: personalData.fullName,
                email: personalData.email,
                telefone: personalData.phone,
                cpf: cleanCpf,
              })
              .select("id")
              .single();

            if (customerError) throw customerError;
            customerId = newCustomer.id;
            isNewCustomer = true;
          }
        }
      }

      // 1.5 Create auth account for new customers and send welcome email
      if (isNewCustomer) {
        try {
          // Get store slug for redirect URL
          const { data: storeData } = await supabase
            .from("stores")
            .select("slug")
            .eq("id", storeId)
            .single();

          // Create Supabase Auth account for the customer
          const { data: authResult, error: authError } = await supabase.functions.invoke(
            "create-customer-auth",
            {
              body: {
                email: personalData.email,
                full_name: personalData.fullName,
                customer_id: customerId,
                store_slug: storeData?.slug || "",
              },
            }
          );

          if (authError) {
            console.error("[useCreateOrder] Failed to create auth account:", authError);
          } else {
            console.log("[useCreateOrder] Auth account created:", authResult);
          }

          // For credit card: send welcome email immediately (payment is instant)
          // For PIX/boleto: schedule welcome email with delay to avoid distracting during payment
          const setupToken = authResult?.setup_token;
          const welcomeEmailData = {
            store_id: storeId,
            email_type: "welcome" as const,
            recipient_email: personalData.email,
            recipient_name: personalData.fullName,
            order_data: setupToken ? { setup_token: setupToken, store_slug: storeData?.slug || "" } as any : undefined,
          };

          if (paymentMethod === "credit_card") {
            // Credit card: send immediately
            await sendTransactionalEmail(welcomeEmailData);
            console.log("[useCreateOrder] Welcome email sent immediately (credit card)");
          } else {
            // PIX/boleto: schedule with 10min delay, cancel if payment confirmed
            const sendAfter = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            // We'll insert into scheduled_emails after order is created (need order_id)
            // Store the welcome email data to schedule after order creation
            (params as any)._welcomeEmailToSchedule = {
              ...welcomeEmailData,
              sendAfter,
            };
            console.log("[useCreateOrder] Welcome email will be scheduled after order creation (PIX/boleto)");
          }
        } catch (emailError) {
          console.error("[useCreateOrder] Failed to handle welcome email:", emailError);
        }
      }

      // 2. Create or update customer address (check if address already exists)
      const cleanCep = deliveryAddress.zipCode.replace(/\D/g, "");
      
      // Check if this exact address already exists for this customer
      const { data: existingAddress } = await supabase
        .from("customer_addresses")
        .select("id")
        .eq("customer_id", customerId)
        .eq("cep", cleanCep)
        .eq("rua", deliveryAddress.street)
        .eq("numero", deliveryAddress.number)
        .maybeSingle();

      if (!existingAddress) {
        // Check if customer already has any addresses
        const { count } = await supabase
          .from("customer_addresses")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId);
        
        const isFirstAddress = !count || count === 0;
        
        // Address doesn't exist, create it
        await supabase.from("customer_addresses").insert({
          customer_id: customerId,
          tipo: "entrega",
          cep: cleanCep,
          rua: deliveryAddress.street,
          numero: deliveryAddress.number,
          complemento: deliveryAddress.complement || null,
          bairro: deliveryAddress.neighborhood,
          cidade: deliveryAddress.city,
          estado: deliveryAddress.state,
          is_default: isFirstAddress,
        });
        console.log("[useCreateOrder] New address created for customer (is_default:", isFirstAddress, ")");
      } else {
        // Address exists, optionally update complement if it changed
        console.log("[useCreateOrder] Address already exists, skipping creation");
      }

      // 3. Build products array for order
      // retailer_id matches the catalog feed format (P{code}-C{x}-S{y}) so
      // Meta/Google Pixel + CAPI Purchase events match the catalog (Advantage+).
      const { buildRetailerIdFromCodes, getContentGroupId } = await import("@/features/tracking/lib/retailerId");
      const products = items.map((item) => {
        const retailerId = buildRetailerIdFromCodes({
          productCode: item.productCode,
          productId: item.id,
          colorCode: item.colorCode,
          sizeCode: item.sizeCode,
          variationId: item.variationId,
        });
        return {
          product_id: item.id,
          variation_id: item.variationId || null,
          name: item.name,
          variant: item.variant,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          image: item.image,
          retailer_id: retailerId,
          // Hybrid Meta grouping (matches feed item_group_id) — used by Purchase
          // CAPI/Pixel so funnel events stay consistent with AddToCart.
          content_group_id: getContentGroupId(retailerId, item.displaySeparately),
        };
      });

      // 3.5 Strict stock validation right before creating order (protects against race
      // conditions when multiple shoppers buy limited-stock items simultaneously)
      const stockCheckPayload = items.map((item) => ({
        product_id: item.id,
        variation_id: item.variationId || null,
        quantity: item.quantity,
      }));
      const { data: stockCheck, error: stockCheckError } = await supabase.rpc(
        "validate_stock_for_checkout_strict",
        { items: stockCheckPayload as any }
      );
      if (stockCheckError) {
        console.error("[useCreateOrder] Stock validation error:", stockCheckError);
      } else if (stockCheck && (stockCheck as any).valid === false) {
        const firstError = (stockCheck as any).errors?.[0];
        const msg = firstError
          ? `Estoque insuficiente para "${firstError.product_name}": disponível ${firstError.available}, solicitado ${firstError.requested}`
          : "Estoque insuficiente para um ou mais itens do carrinho";
        throw new Error(msg);
      }

      // 4. Create order
      const total = subtotal + shipping - discount;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: storeId,
          customer_id: customerId,
          products: products,
          subtotal: subtotal,
          frete: shipping,
          desconto: discount,
          total: total,
          status_pedido: "novo",
          status_pagamento: "pendente",
          forma_pagamento: paymentMethod === "credit_card" ? "cartao" : paymentMethod,
          endereco_entrega: {
            cep: deliveryAddress.zipCode,
            rua: deliveryAddress.street,
            numero: deliveryAddress.number,
            complemento: deliveryAddress.complement,
            bairro: deliveryAddress.neighborhood,
            cidade: deliveryAddress.city,
            estado: deliveryAddress.state,
            destinatario: deliveryAddress.recipient || personalData.fullName,
            prazo_entrega_dias: deliveryAddress.shippingDeliveryDays || null,
            transportadora: deliveryAddress.shippingCarrier || null,
            metodo_envio: deliveryAddress.shippingMethodName || null,
          },
          observacao_cliente: observations,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // 5. Increment coupon usage if a coupon was used
      if (couponId) {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('usage_count')
          .eq('id', couponId)
          .single();
        
        if (coupon) {
          await supabase
            .from('coupons')
            .update({ usage_count: (coupon.usage_count || 0) + 1 })
            .eq('id', couponId);
        }
      }

      // 6. Email is now sent from checkout.tsx AFTER payment processing succeeds
      // This prevents sending "pedido recebido" email when payment fails
      console.log("[useCreateOrder] Order created, email will be sent after payment processing");

      // 6.5. Schedule delayed welcome email for PIX/boleto (now that we have order_id)
      const welcomeData = (params as any)._welcomeEmailToSchedule;
      if (welcomeData) {
        try {
          await supabase.from("scheduled_emails").insert({
            store_id: storeId,
            order_id: order.id,
            email_type: "welcome",
            recipient_email: welcomeData.recipient_email,
            recipient_name: welcomeData.recipient_name,
            email_payload: {
              order_data: welcomeData.order_data,
            },
            send_after: welcomeData.sendAfter,
            cancel_if_payment_confirmed: false, // Always send welcome, just delay it
            status: "pending",
          });
          console.log("[useCreateOrder] Welcome email scheduled with 10min delay");
        } catch (scheduleError) {
          console.error("[useCreateOrder] Failed to schedule welcome email:", scheduleError);
          // Fallback: send immediately
          await sendTransactionalEmail(welcomeData);
        }
      }

      // 7. Mark abandoned cart as recovered (fire-and-forget)
      markCartAsRecovered(storeId, personalData.email, order.id).catch(() => {});

      // 8. Issue a 24h "guest_post_checkout" session so the customer leaves
      // the checkout already logged in. This is skipped if they were already
      // signed in with a full session — we never downgrade a full session.
      const existingSession = getStoredCustomerSession();
      const alreadyFullySignedIn =
        existingSession &&
        existingSession.store_id === storeId &&
        (existingSession.scope ?? "full") === "full";

      if (!alreadyFullySignedIn) {
        try {
          const { data: guestData, error: guestError } = await supabase.functions.invoke(
            "customer-create-guest-session",
            {
              body: {
                store_id: storeId,
                customer_id: customerId,
                order_id: order.id,
              },
            }
          );
          if (guestError || !guestData?.token) {
            console.warn("[useCreateOrder] Failed to mint guest session:", guestError);
          } else {
            const guestSession = {
              customer_id: customerId,
              store_id: storeId,
              email: personalData.email,
              nome: personalData.fullName,
              scope: "guest_post_checkout" as const,
              order_ids: [order.id],
            };
            // setSession persists AND triggers React state update so SaveAccountCard
            // appears on the thank-you page without requiring a refresh.
            setSession(guestData.token, guestSession);
            console.log("[useCreateOrder] Guest post-checkout session persisted + state synced (24h)");
          }
        } catch (sessionError) {
          console.warn("[useCreateOrder] Guest session error (non-blocking):", sessionError);
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        customerId: customerId,
      };
    },
    onError: (error) => {
      console.error("Error creating order:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar pedido",
        description: error.message,
      });
    },
  });
}
