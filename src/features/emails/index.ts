export { useEmailSettings, type EmailSettings } from "./hooks/useEmailSettings";
export { 
  sendTransactionalEmail, 
  buildOrderDataFromOrder,
  type EmailType,
  type OrderData,
  type PaymentData,
  type ProductItem,
  type DeliveryAddress,
  type SendEmailParams
} from "./hooks/useSendEmail";
export { 
  useEmailTemplates, 
  type EmailTemplate, 
  type EmailType as TemplateEmailType, 
  defaultTemplates, 
  emailTypesMeta, 
  emailVariables 
} from "./hooks/useEmailTemplates";
export * from "./components";
