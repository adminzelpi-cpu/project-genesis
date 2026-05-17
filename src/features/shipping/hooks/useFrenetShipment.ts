import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFrenetShipment() {
  const [isCreating, setIsCreating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);

  const createShipment = async (storeId: string, orderId: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("frenet-create-shipment", {
        body: { storeId, orderId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar pedido");

      toast.success("Pedido enviado para a Frenet!");
      return data;
    } catch (err: any) {
      console.error("Error creating shipment:", err);
      toast.error(err.message || "Erro ao enviar pedido para a Frenet");
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const getTracking = async (storeId: string, trackingNumber: string, shippingServiceCode?: string, orderNumber?: string) => {
    setIsTracking(true);
    setTrackingInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke("frenet-tracking", {
        body: { storeId, trackingNumber, shippingServiceCode, orderNumber },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao consultar rastreio");

      setTrackingInfo(data.tracking);
      return data.tracking;
    } catch (err: any) {
      console.error("Error getting tracking:", err);
      toast.error(err.message || "Erro ao consultar rastreio");
      return null;
    } finally {
      setIsTracking(false);
    }
  };

  const clearTracking = () => setTrackingInfo(null);

  return {
    createShipment,
    getTracking,
    clearTracking,
    isCreating,
    isTracking,
    trackingInfo,
  };
}
