import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  url?: string;
}

export async function logErrorToDb(params: LogErrorParams): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("error_logs").insert({
      category: params.category,
      severity: params.severity,
      message: params.message,
      stack_trace: params.stackTrace,
      context: params.context || {},
      store_id: params.storeId,
      url: params.url,
      user_agent: "edge-function",
    });

    if (error) {
      console.error("[errorLogger] Failed to log error:", error);
    }
  } catch (e) {
    console.error("[errorLogger] Exception while logging:", e);
  }
}

// Helper para criar erro com log automático
export async function logAndThrow(
  category: ErrorCategory,
  severity: ErrorSeverity,
  message: string,
  context?: Record<string, any>,
  storeId?: string
): Promise<never> {
  await logErrorToDb({
    category,
    severity,
    message,
    context,
    storeId,
  });
  throw new Error(message);
}
