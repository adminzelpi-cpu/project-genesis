import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { useCart } from "@/contexts/CartContext";
import { recoverCartByToken } from "@/features/abandoned-carts";
import { storeKey } from "@/lib/storeStorageKeys";
import { setReachedPayment } from "@/features/checkout/components/CheckoutContext";
import { Loader2, ShoppingCart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";

export default function RecoverCartPage() {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem, clearCart } = useCart();
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [itemCount, setItemCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      return;
    }

    const recoverCart = async () => {
      try {
        const result = await recoverCartByToken(token);
        
        if (!result || !result.cart_items || result.cart_items.length === 0) {
          setStatus("expired");
          return;
        }

        const { cart_items, customer_email, customer_name, customer_id, abandoned_at } = result;

        // Clear current cart and add recovered items
        clearCart();

        // Resolve productCode/colorCode/sizeCode for each item so the cart carries the
        // codes needed to build the feed-format retailer_id (P{code}-C{x}-S{y}) on
        // InitiateCheckout / AddPaymentInfo. Without this, recovered carts would emit
        // P{shortHash(uuid)} — totally outside the catalog.
        const productIds = Array.from(new Set(cart_items.map(i => i.product_id).filter(Boolean)));
        const variationIds = Array.from(new Set(cart_items.map(i => i.variation_id).filter(Boolean)));

        const [productsRes, variationsRes] = await Promise.all([
          productIds.length
            ? supabase.from("products").select("id, product_code").in("id", productIds)
            : Promise.resolve({ data: [] as any[] }),
          variationIds.length
            ? supabase.from("product_variations_v2").select("id, attributes").in("id", variationIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const productCodeMap = new Map<string, number>();
        (productsRes.data || []).forEach((p: any) => {
          if (p.product_code != null) productCodeMap.set(p.id, p.product_code);
        });

        // Resolve attribute defs/values once for code lookup
        const allValueIds = Array.from(new Set(
          (variationsRes.data || []).flatMap((v: any) =>
            v.attributes ? Object.values(v.attributes as Record<string, string>) : []
          )
        ));
        const allAttrIds = Array.from(new Set(
          (variationsRes.data || []).flatMap((v: any) =>
            v.attributes ? Object.keys(v.attributes as Record<string, string>) : []
          )
        ));
        const [defsRes, valsRes] = await Promise.all([
          allAttrIds.length
            ? supabase.from("attributes").select("id, type").in("id", allAttrIds)
            : Promise.resolve({ data: [] as any[] }),
          allValueIds.length
            ? supabase.from("attribute_values").select("id, attribute_id, value_code").in("id", allValueIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const defTypeMap = new Map<string, string>();
        (defsRes.data || []).forEach((d: any) => defTypeMap.set(d.id, d.type));
        const valCodeMap = new Map<string, number>();
        (valsRes.data || []).forEach((v: any) => { if (v.value_code != null) valCodeMap.set(v.id, v.value_code); });

        const variationCodeMap = new Map<string, { colorCode?: number; sizeCode?: number }>();
        (variationsRes.data || []).forEach((v: any) => {
          const codes: { colorCode?: number; sizeCode?: number } = {};
          if (v.attributes) {
            for (const [attrId, valueId] of Object.entries(v.attributes as Record<string, string>)) {
              const t = defTypeMap.get(attrId);
              const c = valCodeMap.get(valueId);
              if (t === 'color' && c != null) codes.colorCode = c;
              else if (t === 'size' && c != null) codes.sizeCode = c;
            }
          }
          variationCodeMap.set(v.id, codes);
        });

        for (const item of cart_items) {
          const productCode = productCodeMap.get(item.product_id);
          const variationCodes = item.variation_id ? variationCodeMap.get(item.variation_id) : undefined;
          for (let i = 0; i < item.quantity; i++) {
            addItem({
              id: item.product_id,
              name: item.name,
              price: item.price,
              image: item.image_url || "",
              variant: item.variation,
              variationId: item.variation_id,
              productCode,
              colorCode: variationCodes?.colorCode,
              sizeCode: variationCodes?.sizeCode,
            }, { skipCartOpen: true });
          }
        }

        setItemCount(cart_items.reduce((acc, item) => acc + item.quantity, 0));

        // Pre-fill checkout data with customer info
        await prefillCheckoutData(customer_email, customer_name, customer_id, abandoned_at);

        setStatus("success");

        // Redirect to checkout after a short delay
        setTimeout(() => {
          navigate(buildPath(`/checkout`));
        }, 2000);
      } catch (error) {
        console.error("[RecoverCartPage] Error recovering cart:", error);
        setStatus("error");
      }
    };

    recoverCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Pre-fill checkout data in localStorage so the checkout page
   * can skip to the most advanced step possible.
   */
  async function prefillCheckoutData(
    email: string,
    name: string | null,
    customerId: string | null,
    abandonedAt: string
  ) {
    // Start with existing checkout data or defaults
    const existingRaw = localStorage.getItem(storeKey("checkout_data_v2"));
    let existingData: any = null;
    
    if (existingRaw) {
      try {
        existingData = JSON.parse(existingRaw);
      } catch {}
    }

    const personalData = existingData?.data?.personalData || {
      email: "",
      fullName: "",
      phone: "",
      cpf: "",
    };

    // Always set email and name from the abandoned cart
    personalData.email = email;
    if (name) personalData.fullName = name;

    // If we have a customer_id, try to load more data (phone, cpf, addresses)
    // PRIVACY GUARD: only auto-fill phone/CPF when the customer's email matches
    // the recovery email. Otherwise the customer_id may have been incorrectly
    // attached (e.g. another customer was logged in on this device when the cart
    // was saved) and filling CPF would leak personal data of a third party.
    if (customerId) {
      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("telefone, cpf, nome, email")
          .eq("id", customerId)
          .maybeSingle();

        if (customer) {
          const emailMatches =
            customer.email &&
            customer.email.trim().toLowerCase() === email.trim().toLowerCase();

          if (customer.nome && !personalData.fullName) personalData.fullName = customer.nome;

          if (emailMatches) {
            if (customer.telefone && !personalData.phone) personalData.phone = customer.telefone;
            if (customer.cpf && !personalData.cpf) personalData.cpf = customer.cpf;
          } else {
            console.warn(
              "[RecoverCart] customer_id email mismatch — skipping phone/CPF auto-fill"
            );
          }
        }
      } catch (err) {
        console.warn("[RecoverCart] Could not load customer data:", err);
      }
    }

    // Build the checkout data
    const deliveryAddress = existingData?.data?.deliveryAddress || {
      zipCode: "", street: "", number: "", complement: "",
      neighborhood: "", city: "", state: "", recipient: "",
      shippingMethod: "", shippingPrice: undefined, shippingQuote: null,
      observations: "", orderNotes: "", noNumber: false,
    };

    const paymentMethod = existingData?.data?.paymentMethod || { type: "pix" };

    const checkoutData = {
      data: { personalData, deliveryAddress, paymentMethod },
      savedAt: Date.now(),
      lastCompletedStep: 0,
    };

    // Determine what step to skip to
    const isPersonalComplete = !!(
      personalData.email &&
      personalData.fullName?.trim().split(" ").length >= 2 &&
      personalData.phone?.replace(/\D/g, "").length >= 10 &&
      personalData.cpf?.replace(/\D/g, "").length === 11
    );

    const isAddressComplete = !!(
      deliveryAddress.zipCode?.replace(/\D/g, "").length === 8 &&
      deliveryAddress.street &&
      (deliveryAddress.number || deliveryAddress.noNumber) &&
      deliveryAddress.neighborhood &&
      deliveryAddress.city &&
      deliveryAddress.state &&
      deliveryAddress.shippingMethod
    );

    if (isPersonalComplete) checkoutData.lastCompletedStep = 1;
    if (isPersonalComplete && isAddressComplete) checkoutData.lastCompletedStep = 2;

    // If abandonment was recent (<24h) and address was complete,
    // set session flag so checkout skips directly to payment
    const hoursAgo = (Date.now() - new Date(abandonedAt).getTime()) / (1000 * 60 * 60);
    if (isPersonalComplete && isAddressComplete && hoursAgo < 24) {
      setReachedPayment();
    }

    localStorage.setItem(storeKey("checkout_data_v2"), JSON.stringify(checkoutData));
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet><title>Recuperar Carrinho</title></Helmet>
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Recuperando seu carrinho...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Por favor, aguarde um momento.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-center">Carrinho recuperado!</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {itemCount} {itemCount === 1 ? "item foi adicionado" : "itens foram adicionados"} ao seu carrinho.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Redirecionando para o checkout...
              </p>
              <Loader2 className="h-5 w-5 text-primary animate-spin mt-4" />
            </>
          )}

          {status === "expired" && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-lg font-medium text-center">Carrinho expirado</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Este link de recuperação não está mais disponível ou o carrinho já foi recuperado.
              </p>
              <Button 
                className="mt-6"
                onClick={() => navigate(buildPath(`/`))}
              >
                Ver produtos
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-lg font-medium text-center">Erro ao recuperar carrinho</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Não foi possível recuperar seu carrinho. Por favor, tente novamente.
              </p>
              <Button 
                className="mt-6"
                onClick={() => navigate(buildPath(`/`))}
              >
                Ver produtos
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
