/**
 * Maps gateway error codes/messages to user-friendly messages with contextual suggestions.
 * Works for both Mercado Pago and Pagar.me.
 * Payment-method-aware: avoids showing card-specific errors for Pix/Boleto payments.
 */

export interface PaymentErrorInfo {
  title: string;
  message: string;
  suggestion?: string;
  suggestedMethod?: "pix" | "boleto" | "credit_card";
  canRetry: boolean;
}

// Mercado Pago status_detail codes
const mercadoPagoErrors: Record<string, PaymentErrorInfo> = {
  cc_rejected_insufficient_amount: {
    title: "Saldo insuficiente",
    message: "Seu cartão não tem saldo suficiente para esta compra.",
    suggestion: "Tente com menos parcelas ou use outro método de pagamento.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_bad_filled_security_code: {
    title: "CVV incorreto",
    message: "O código de segurança do cartão está incorreto.",
    suggestion: "Verifique o CVV no verso do cartão e tente novamente.",
    canRetry: true,
  },
  cc_rejected_bad_filled_card_number: {
    title: "Número do cartão incorreto",
    message: "O número do cartão informado está incorreto.",
    suggestion: "Verifique o número e tente novamente.",
    canRetry: true,
  },
  cc_rejected_bad_filled_date: {
    title: "Data de validade incorreta",
    message: "A data de validade do cartão está incorreta.",
    suggestion: "Verifique a data no cartão e tente novamente.",
    canRetry: true,
  },
  cc_rejected_bad_filled_other: {
    title: "Dados do cartão incorretos",
    message: "Verifique os dados do cartão e tente novamente.",
    canRetry: true,
  },
  cc_rejected_high_risk: {
    title: "Pagamento não aprovado",
    message: "O pagamento foi recusado por motivos de segurança.",
    suggestion: "Tente pagar com Pix para aprovação imediata.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_call_for_authorize: {
    title: "Autorização necessária",
    message: "Seu banco precisa autorizar esta compra.",
    suggestion: "Ligue para o banco e autorize, ou use Pix.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_blacklist: {
    title: "Cartão não aceito",
    message: "Este cartão não pode ser usado para esta compra.",
    suggestion: "Use outro cartão ou pague com Pix.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_card_disabled: {
    title: "Cartão desabilitado",
    message: "Seu cartão está desabilitado para compras online.",
    suggestion: "Habilite compras online pelo app do banco ou use Pix.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_max_attempts: {
    title: "Limite de tentativas",
    message: "Muitas tentativas com este cartão. Tente mais tarde.",
    suggestion: "Use outro método de pagamento.",
    suggestedMethod: "pix",
    canRetry: false,
  },
  cc_rejected_duplicated_payment: {
    title: "Pagamento duplicado",
    message: "Já existe um pagamento recente com estes dados.",
    suggestion: "Verifique se o pagamento já foi realizado.",
    canRetry: false,
  },
  cc_rejected_card_type_not_allowed: {
    title: "Tipo de cartão não aceito",
    message: "Este tipo de cartão não é aceito.",
    suggestion: "Use outro cartão ou pague com Pix.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_other_reason: {
    title: "Pagamento recusado",
    message: "O pagamento foi recusado pelo seu banco.",
    suggestion: "Tente com outro cartão ou use Pix para aprovação imediata.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_card_error: {
    title: "Erro no cartão",
    message: "Houve um erro ao processar seu cartão.",
    suggestion: "Aguarde alguns minutos e tente novamente, ou use outro método.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  cc_rejected_invalid_installments: {
    title: "Parcelamento inválido",
    message: "O número de parcelas escolhido não é aceito por este cartão.",
    suggestion: "Tente com menos parcelas ou outra forma de pagamento.",
    canRetry: true,
  },
  pending_waiting_payment: {
    title: "Aguardando pagamento",
    message: "Seu pagamento está pendente de confirmação.",
    canRetry: false,
  },
  expired: {
    title: "Pagamento expirado",
    message: "O prazo para pagamento expirou.",
    suggestion: "Gere um novo pagamento para continuar.",
    canRetry: true,
  },
};

// Pagar.me error patterns
const pagarmeErrors: Record<string, PaymentErrorInfo> = {
  refused: {
    title: "Pagamento recusado",
    message: "O pagamento foi recusado pela operadora do cartão.",
    suggestion: "Tente com outro cartão ou use Pix.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  antifraud: {
    title: "Pagamento não aprovado",
    message: "O pagamento foi recusado por motivos de segurança.",
    suggestion: "Tente pagar com Pix para aprovação imediata.",
    suggestedMethod: "pix",
    canRetry: true,
  },
  acquirer: {
    title: "Erro na operadora",
    message: "Erro de comunicação com a operadora do cartão.",
    suggestion: "Aguarde alguns minutos e tente novamente.",
    canRetry: true,
  },
  invalid_card: {
    title: "Cartão inválido",
    message: "Os dados do cartão estão incorretos.",
    suggestion: "Verifique os dados e tente novamente.",
    canRetry: true,
  },
};

// Generic / gateway-level errors (not payment-method-specific)
const genericErrors: Record<string, PaymentErrorInfo> = {
  NO_GATEWAY: {
    title: "Gateway não configurado",
    message: "O pagamento não pode ser processado no momento.",
    suggestion: "Entre em contato com a loja.",
    canRetry: false,
  },
  GATEWAY_NOT_CONFIGURED: {
    title: "Gateway não configurado",
    message: "O pagamento não pode ser processado no momento.",
    suggestion: "Entre em contato com a loja.",
    canRetry: false,
  },
  UNSUPPORTED_GATEWAY: {
    title: "Gateway não suportado",
    message: "O método de pagamento não é suportado.",
    canRetry: false,
  },
  TOKEN_EXPIRED: {
    title: "Erro de configuração",
    message: "O gateway de pagamento precisa ser reconectado.",
    suggestion: "Entre em contato com a loja para resolver este problema.",
    canRetry: false,
  },
  API_KEY_MISSING: {
    title: "Erro de configuração",
    message: "O gateway de pagamento não está configurado corretamente.",
    suggestion: "Entre em contato com a loja.",
    canRetry: false,
  },
  PAYMENT_FAILED: {
    title: "Pagamento recusado",
    message: "O pagamento não foi aprovado.",
    suggestion: "Tente novamente ou use outro método de pagamento.",
    canRetry: true,
  },
};

/**
 * Checks if an error message is about gateway/token/config issues (not card-specific).
 */
function isGatewayConfigError(searchStr: string): PaymentErrorInfo | null {
  // Token expired / invalid token (gateway config issue, NOT card issue)
  if (
    searchStr.includes("token expirado") ||
    searchStr.includes("token expired") ||
    searchStr.includes("reconecte sua conta") ||
    searchStr.includes("re-authorize")
  ) {
    return genericErrors.TOKEN_EXPIRED;
  }

  // API key issues
  if (
    searchStr.includes("chave de api") ||
    searchStr.includes("api key") ||
    searchStr.includes("api_key_missing")
  ) {
    return genericErrors.API_KEY_MISSING;
  }

  // Gateway not configured
  if (
    searchStr.includes("não configurado") ||
    searchStr.includes("not configured")
  ) {
    return genericErrors.GATEWAY_NOT_CONFIGURED;
  }

  // Unexpected response (HTML instead of JSON, etc.)
  if (
    searchStr.includes("resposta inesperada") ||
    searchStr.includes("unexpected response") ||
    searchStr.includes("resposta inválida do") ||
    searchStr.includes("invalid response from")
  ) {
    return {
      title: "Erro temporário",
      message: "Erro de comunicação com o gateway de pagamento.",
      suggestion: "Aguarde alguns minutos e tente novamente.",
      canRetry: true,
    };
  }

  return null;
}

/**
 * Maps a payment error to a user-friendly message.
 * Checks error codes, status details, and error messages.
 * Payment-method-aware: avoids showing card errors for Pix/Boleto.
 */
export function getPaymentErrorInfo(
  errorCode?: string,
  statusDetail?: string,
  errorMessage?: string,
  paymentMethod?: "credit_card" | "pix" | "boleto"
): PaymentErrorInfo {
  // 1. Check by errorCode against generic errors first
  if (errorCode && genericErrors[errorCode]) {
    return genericErrors[errorCode];
  }

  // 2. Check Mercado Pago status_detail (these are always card-specific, cc_rejected_*)
  if (statusDetail && mercadoPagoErrors[statusDetail]) {
    // Only return card-specific errors if payment method IS credit_card or unknown
    if (!paymentMethod || paymentMethod === "credit_card") {
      return mercadoPagoErrors[statusDetail];
    }
    // For Pix/Boleto with cc_rejected status, return a generic rejection
    return {
      title: "Pagamento não processado",
      message: "Não foi possível processar o pagamento.",
      suggestion: "Tente novamente ou escolha outro método de pagamento.",
      canRetry: true,
    };
  }

  // 3. Check errorCode against Mercado Pago patterns
  if (errorCode && mercadoPagoErrors[errorCode]) {
    if (!paymentMethod || paymentMethod === "credit_card") {
      return mercadoPagoErrors[errorCode];
    }
    return {
      title: "Pagamento não processado",
      message: "Não foi possível processar o pagamento.",
      suggestion: "Tente novamente ou escolha outro método de pagamento.",
      canRetry: true,
    };
  }

  // 4. Check error messages for patterns
  if (errorCode || errorMessage) {
    const searchStr = `${errorCode || ""} ${errorMessage || ""}`.toLowerCase();

    // 4a. ALWAYS check gateway/config errors first (applies to ALL payment methods)
    const configError = isGatewayConfigError(searchStr);
    if (configError) {
      return configError;
    }

    // 4b. Card-specific pattern matching (ONLY for credit_card or unknown method)
    if (!paymentMethod || paymentMethod === "credit_card") {
      if (searchStr.includes("antifraud") || searchStr.includes("antifraude")) {
        return pagarmeErrors.antifraud;
      }
      if (searchStr.includes("refused") || searchStr.includes("recusad")) {
        return pagarmeErrors.refused;
      }
      if (searchStr.includes("acquirer") || searchStr.includes("adquirente")) {
        return pagarmeErrors.acquirer;
      }
      // "invalid" for cards only — NOT for generic gateway errors
      if (
        searchStr.includes("invalid card") ||
        searchStr.includes("cartão inválid") ||
        searchStr.includes("dados do cartão") ||
        (searchStr.includes("invalid") && !searchStr.includes("token") && !searchStr.includes("api") && !searchStr.includes("resposta")) ||
        (searchStr.includes("inválid") && !searchStr.includes("token") && !searchStr.includes("api") && !searchStr.includes("resposta"))
      ) {
        return pagarmeErrors.invalid_card;
      }
      if (searchStr.includes("insufficient") || searchStr.includes("insuficiente") || searchStr.includes("saldo")) {
        return mercadoPagoErrors.cc_rejected_insufficient_amount;
      }
      if (searchStr.includes("cvv") || searchStr.includes("security_code") || searchStr.includes("código de segurança")) {
        return mercadoPagoErrors.cc_rejected_bad_filled_security_code;
      }
      if (searchStr.includes("duplicat")) {
        return mercadoPagoErrors.cc_rejected_duplicated_payment;
      }
    }

    // 4c. Non-card-specific patterns that apply to all methods
    if (searchStr.includes("duplicat")) {
      return {
        title: "Pagamento duplicado",
        message: "Já existe um pagamento recente com estes dados.",
        suggestion: "Verifique se o pagamento já foi realizado.",
        canRetry: false,
      };
    }
  }

  // 5. Payment-method-aware fallback
  if (paymentMethod === "boleto") {
    return {
      title: "Erro ao gerar boleto",
      message: errorMessage || "Não foi possível gerar o boleto no momento.",
      suggestion: "Verifique seus dados e tente novamente, ou pague com Pix para aprovação imediata.",
      suggestedMethod: "pix",
      canRetry: true,
    };
  }

  if (paymentMethod === "pix") {
    return {
      title: "Erro ao gerar Pix",
      message: errorMessage || "Não foi possível gerar o Pix no momento.",
      suggestion: "Tente novamente ou escolha outro método de pagamento.",
      suggestedMethod: "boleto",
      canRetry: true,
    };
  }

  // 6. Generic fallback (credit card or unknown)
  return {
    title: "Pagamento não aprovado",
    message: errorMessage || "Não foi possível processar o pagamento.",
    suggestion: "Verifique os dados e tente novamente, ou use outro método de pagamento.",
    suggestedMethod: "pix",
    canRetry: true,
  };
}
