import { Check, Clock, CreditCard, XCircle } from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "payment_pending" | "payment_failed" | "returned";

interface OrderProgressBarProps {
  status: OrderStatus;
}

const steps = [
  { key: "confirmed", label: "Confirmado", icon: null },
  { key: "preparing", label: "Preparando", icon: null },
  { key: "shipped", label: "Enviado", icon: null },
  { key: "delivered", label: "Entregue", icon: null },
];

const statusOrder: Record<OrderStatus, number> = {
  pending: 0,
  payment_pending: 0,
  payment_failed: 0,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
  returned: -2,
};

export function OrderProgressBar({ status }: OrderProgressBarProps) {
  if (status === "cancelled" || status === "returned") {
    return (
      <div className="flex flex-col items-center py-4 gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status === "cancelled" ? "bg-destructive/10" : "bg-orange-500/10"}`}>
          <XCircle className={`h-5 w-5 ${status === "cancelled" ? "text-destructive" : "text-orange-600"}`} />
        </div>
        <p className={`text-sm font-medium ${status === "cancelled" ? "text-destructive" : "text-orange-600"}`}>
          {status === "cancelled" ? "Pedido Cancelado" : "Pedido Devolvido"}
        </p>
      </div>
    );
  }

  const currentStep = statusOrder[status];
  const isPaymentIssue = status === "payment_pending" || status === "payment_failed";
  const progressPercent = currentStep <= 0 ? 0 : ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-4">
      {/* Payment message */}
      {isPaymentIssue && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
          {status === "payment_pending" ? (
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <CreditCard className="h-4 w-4 text-destructive shrink-0" />
          )}
          <p className="text-xs text-muted-foreground">
            {status === "payment_pending"
              ? "Aguardando pagamento para iniciar o processamento"
              : "Pagamento não aprovado — tente novamente"}
          </p>
        </div>
      )}

      {/* Progress steps */}
      <div className="flex items-start justify-between relative px-2">
        {/* Background line */}
        <div className="absolute top-[14px] sm:top-4 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 sm:h-1 bg-border">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-in-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-sm font-semibold transition-all duration-300 ${
                  isCompleted || isCurrent
                    ? "bg-foreground text-background shadow-sm"
                    : "border-2 border-border bg-background text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3]" />
                ) : (
                  stepNumber
                )}
              </div>
              <p
                className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 text-center leading-tight font-medium transition-colors ${
                  isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
