import { useCallback } from "react";
import { logError, ErrorCategory, ErrorSeverity } from "@/lib/errorLogger";
import { toast } from "@/hooks/use-toast";

export const useErrorHandler = () => {
  const handleError = useCallback(
    (
      error: Error | unknown,
      category: ErrorCategory = "frontend",
      severity: ErrorSeverity = "medium",
      showToast: boolean = true
    ) => {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const stackTrace = error instanceof Error ? error.stack : undefined;

      logError({
        category,
        severity,
        message: errorMessage,
        stackTrace,
      });

      if (showToast) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: errorMessage,
        });
      }

      console.error(`[${category}] ${errorMessage}`, error);
    },
    []
  );

  return { handleError };
};
