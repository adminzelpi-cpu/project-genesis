import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPix } from "@fortawesome/free-brands-svg-icons";
import { faBarcode } from "@fortawesome/free-solid-svg-icons";

interface AcceptedPaymentMethodsProps {
  acceptCreditCard: boolean;
  acceptPix: boolean;
  acceptBoleto: boolean;
  onChangeCreditCard: (value: boolean) => void;
  onChangePix: (value: boolean) => void;
  onChangeBoleto: (value: boolean) => void;
}

export function AcceptedPaymentMethods({
  acceptCreditCard,
  acceptPix,
  acceptBoleto,
  onChangeCreditCard,
  onChangePix,
  onChangeBoleto,
}: AcceptedPaymentMethodsProps) {
  // Prevent disabling all methods
  const activeCount = [acceptCreditCard, acceptPix, acceptBoleto].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-1">Formas de pagamento aceitas</h4>
        <p className="text-xs text-muted-foreground">
          Selecione quais métodos estarão disponíveis no checkout
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="accept-credit" className="cursor-pointer font-medium">
              Cartão de Crédito
            </Label>
          </div>
          <Switch
            id="accept-credit"
            checked={acceptCreditCard}
            onCheckedChange={onChangeCreditCard}
            disabled={acceptCreditCard && activeCount <= 1}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faPix} className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="accept-pix" className="cursor-pointer font-medium">
              PIX
            </Label>
          </div>
          <Switch
            id="accept-pix"
            checked={acceptPix}
            onCheckedChange={onChangePix}
            disabled={acceptPix && activeCount <= 1}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faBarcode} className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="accept-boleto" className="cursor-pointer font-medium">
              Boleto Bancário
            </Label>
          </div>
          <Switch
            id="accept-boleto"
            checked={acceptBoleto}
            onCheckedChange={onChangeBoleto}
            disabled={acceptBoleto && activeCount <= 1}
          />
        </div>
      </div>

      {activeCount <= 1 && (
        <p className="text-xs text-amber-600">
          Pelo menos um método de pagamento deve estar ativo.
        </p>
      )}
    </div>
  );
}
