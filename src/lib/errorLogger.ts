import { supabase } from "@/integrations/supabase/client";

export type ErrorCategory = 
  | "frontend"
  | "backend"
  | "database"
  | "ab_testing"
  | "checkout"
  | "payment"
  | "shipping"
  | "email"
  | "recommendations"
  | "upsell"
  | "performance"
  | "security"
  | "other";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

interface LogErrorParams {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  storeId?: string;
}

export const logError = async ({
  category,
  severity,
  message,
  stackTrace,
  context = {},
  storeId,
}: LogErrorParams) => {
  try {
    const { error } = await supabase.from("error_logs").insert({
      category,
      severity,
      message,
      stack_trace: stackTrace,
      context,
      store_id: storeId,
      user_agent: navigator.userAgent,
      url: window.location.href,
    });

    if (error) {
      console.error("Failed to log error:", error);
    }
  } catch (e) {
    console.error("Error logging system failed:", e);
  }
};

export const logPerformanceMetric = async (
  storeId: string,
  metricType: string,
  metricName: string,
  value: number,
  unit: string = "ms",
  tags: Record<string, any> = {}
) => {
  try {
    await supabase.from("performance_metrics").insert({
      store_id: storeId,
      metric_type: metricType,
      metric_name: metricName,
      value,
      unit,
      tags,
    });
  } catch (e) {
    console.error("Failed to log performance metric:", e);
  }
};

export const trackConversionEvent = async (
  experimentId: string,
  variantId: string,
  converted: boolean
) => {
  try {
    const { data: variant } = await supabase
      .from("variants")
      .select("impressions, conversions")
      .eq("id", variantId)
      .single();

    if (!variant) return;

    const updates = converted
      ? { conversions: variant.conversions + 1 }
      : { impressions: variant.impressions + 1 };

    await supabase.from("variants").update(updates).eq("id", variantId);
  } catch (e) {
    console.error("Failed to track conversion:", e);
    logError({
      category: "ab_testing",
      severity: "high",
      message: "Failed to track conversion event",
      context: { experimentId, variantId, converted },
    });
  }
};
