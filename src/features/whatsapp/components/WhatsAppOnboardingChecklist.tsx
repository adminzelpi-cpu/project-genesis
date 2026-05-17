import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Step {
  title: string;
  description: string;
  done: boolean;
  comingSoon?: boolean;
}

interface Props {
  hasPhones: boolean;
}

export function WhatsAppOnboardingChecklist({ hasPhones }: Props) {
  const steps: Step[] = [
    {
      title: "Conta WhatsApp conectada",
      description: "BM, WABA e número verificados com a Meta.",
      done: true,
    },
    {
      title: "Número de telefone ativo",
      description: "Pronto para enviar e receber mensagens.",
      done: hasPhones,
    },
    {
      title: "Vendedor IA configurado",
      description: "Personalize tom, regras e produtos que a IA pode recomendar.",
      done: false,
      comingSoon: true,
    },
    {
      title: "Templates de marketing aprovados",
      description: "Crie mensagens de campanha, recuperação e pós-venda.",
      done: false,
      comingSoon: true,
    },
    {
      title: "Automações ativadas",
      description: "Carrinho abandonado, PIX expirado, status de pedido e upsell.",
      done: false,
      comingSoon: true,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Próximos passos</h3>
          <p className="text-xs text-muted-foreground">
            {completed} de {steps.length} concluídos
          </p>
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          {Math.round((completed / steps.length) * 100)}%
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-[#25D366] transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-2 pt-1">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-3 items-start">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-[#25D366] mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${step.done ? "" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
                {step.comingSoon && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    Em breve
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
