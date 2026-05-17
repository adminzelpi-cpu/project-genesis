import { logError, ErrorCategory, ErrorSeverity } from "./errorLogger";

interface GlobalErrorEvent {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

// Map de categorias baseado no contexto do erro
const categorizeError = (message: string, url?: string): { category: ErrorCategory; severity: ErrorSeverity } => {
  const lowerMessage = message.toLowerCase();
  const lowerUrl = (url || window.location.href).toLowerCase();

  // Checkout crítico
  if (lowerUrl.includes('/checkout') || lowerMessage.includes('checkout')) {
    return { category: 'checkout', severity: 'critical' };
  }

  // Pagamento crítico
  if (lowerMessage.includes('payment') || lowerMessage.includes('pagamento') || lowerMessage.includes('pix') || lowerMessage.includes('boleto')) {
    return { category: 'payment', severity: 'critical' };
  }

  // Email
  if (lowerMessage.includes('email') || lowerMessage.includes('resend')) {
    return { category: 'email', severity: 'high' };
  }

  // Database
  if (lowerMessage.includes('supabase') || lowerMessage.includes('database') || lowerMessage.includes('rls') || lowerMessage.includes('row-level')) {
    return { category: 'database', severity: 'high' };
  }

  // Security
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden') || lowerMessage.includes('cors')) {
    return { category: 'security', severity: 'high' };
  }

  // Performance
  if (lowerMessage.includes('timeout') || lowerMessage.includes('slow') || lowerMessage.includes('memory')) {
    return { category: 'performance', severity: 'medium' };
  }

  // Default frontend error
  return { category: 'frontend', severity: 'medium' };
};

// Handler para erros JavaScript não capturados
const handleGlobalError = (event: ErrorEvent) => {
  const { category, severity } = categorizeError(event.message, event.filename);

  logError({
    category,
    severity,
    message: event.message || 'Erro JavaScript não capturado',
    stackTrace: event.error?.stack,
    context: {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });

  // Log para debug local
  console.error('[GlobalErrorHandler] Uncaught error:', event.message);
};

// Handler para promises rejeitadas não tratadas
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  const { category, severity } = categorizeError(message);

  logError({
    category,
    severity,
    message: `Unhandled Promise Rejection: ${message}`,
    stackTrace: stack,
    context: {
      type: 'unhandled_rejection',
      reason: String(reason),
    },
  });

  console.error('[GlobalErrorHandler] Unhandled rejection:', reason);
};

// Inicializa os handlers globais
export const initGlobalErrorHandler = () => {
  // Evita inicialização duplicada
  if ((window as any).__globalErrorHandlerInitialized) {
    return;
  }

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  (window as any).__globalErrorHandlerInitialized = true;

  console.log('[GlobalErrorHandler] Initialized - capturing all uncaught errors');
};

// Remove os handlers (útil para cleanup)
export const removeGlobalErrorHandler = () => {
  window.removeEventListener('error', handleGlobalError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  (window as any).__globalErrorHandlerInitialized = false;
};

// Função para logar erro manualmente com contexto específico
export const logCriticalError = (
  message: string,
  category: ErrorCategory,
  context?: Record<string, any>,
  error?: Error
) => {
  logError({
    category,
    severity: 'critical',
    message,
    stackTrace: error?.stack,
    context: {
      ...context,
      type: 'manual_critical',
    },
  });
};
