import { MousePointerClick, LogIn, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: MousePointerClick,
    title: "Clique em Conectar",
    description: "Abre o popup oficial da Meta",
  },
  {
    icon: LogIn,
    title: "Faça login na Meta",
    description: "Selecione sua conta e número",
  },
  {
    icon: CheckCircle2,
    title: "Pronto!",
    description: "Vendedor IA ativado no seu WhatsApp",
  },
];

export function WhatsAppHowItWorks() {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Como funciona
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="relative rounded-lg border bg-card p-4 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="h-7 w-7 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                <step.icon className="h-3.5 w-3.5 text-[#25D366]" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold">{step.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
