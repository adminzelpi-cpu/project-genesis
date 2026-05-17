export * from "./components/CheckoutForm";
export * from "./hooks/useCheckout";
export * from "./hooks/useCreateOrder";
export * from "./hooks/useCustomerLookup";
export * from "./hooks/useCheckoutStockValidation";
export * from "./hooks/useCartStockValidation";
export * from "./hooks/useValidateStock";
export * from "./hooks/useCheckoutScroll";
export * from "./utils/paymentErrorMapping";
export * from "./utils/gatewayBrands";

// Re-export payment types from payments module for backward compatibility
export { usePaymentProcessor, type PaymentResult } from "@/features/payments";
export { useGatewayConfig } from "@/features/payments";
export { useRetryPayment } from "@/features/payments";
