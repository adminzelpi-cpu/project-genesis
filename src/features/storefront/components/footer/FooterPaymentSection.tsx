import { useState } from "react";
import { Barcode, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixIcon } from "@/components/icons/PixIcon";
import { useGatewayConfig } from "@/features/payments/hooks/useGatewayConfig";
import { getAcceptedBrands } from "@/features/checkout/utils/gatewayBrands";

// Card brand icons
import visaIcon from "@/assets/card-visa.svg";
import mastercardIcon from "@/assets/card-mastercard.svg";
import eloIcon from "@/assets/card-elo.svg";
import amexIcon from "@/assets/card-amex.svg";
import dinersIcon from "@/assets/card-diners.svg";
import hiperIcon from "@/assets/card-hiper.svg";
import discoverIcon from "@/assets/card-discover.svg";
import auraIcon from "@/assets/card-aura.svg";

const brandIcons: Record<string, string> = {
  visa: visaIcon,
  mastercard: mastercardIcon,
  elo: eloIcon,
  amex: amexIcon,
  diners: dinersIcon,
  hiper: hiperIcon,
  hipercard: hiperIcon,
  discover: discoverIcon,
  aura: auraIcon,
};

interface FooterPaymentSectionProps {
  textColor: string;
  textMutedColor: string;
  collapsible?: boolean;
  storeId?: string;
}

export function FooterPaymentSection({ 
  textColor, 
  textMutedColor,
  collapsible = true,
  storeId,
}: FooterPaymentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { config, isLoading } = useGatewayConfig(storeId);

  const acceptedBrands = config.isActive
    ? getAcceptedBrands(config.gatewayType)
    : getAcceptedBrands(null);

  const showCreditCard = config.acceptCreditCard;
  const showPix = config.acceptPix;
  const showBoleto = config.acceptBoleto;
  const maxInstallments = config.installmentConfig.freeInstallments;
  const pixDiscount = config.pixDiscount;
  const boletoDiscount = config.boletoDiscount;

  // Build installment text
  const installmentText = showCreditCard && maxInstallments > 1
    ? `Até ${maxInstallments}x sem juros`
    : showCreditCard
    ? `Até ${config.installmentConfig.maxInstallments}x`
    : null;

  return (
    <div className={cn(collapsible && "border-b border-white/10 sm:border-0")}>
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between py-4 sm:py-0",
          !collapsible && "cursor-default",
          collapsible && "sm:pointer-events-none"
        )}
        style={{ color: textColor }}
      >
        <span className="font-semibold text-sm uppercase tracking-wider">Formas de Pagamento</span>
        {collapsible && (
          <span className="sm:hidden">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>
      <div className={cn(
        collapsible && "overflow-hidden transition-all duration-300 sm:overflow-visible sm:max-h-none sm:mt-4",
        collapsible && (isOpen ? "max-h-[500px] pb-4" : "max-h-0"),
        !collapsible && "mt-4"
      )}>
        {isLoading ? (
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 w-8 rounded bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Card brands + Pix + Boleto — all inline, no white boxes */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {showCreditCard && acceptedBrands.map((brand) => {
                const icon = brandIcons[brand];
                if (!icon) return null;
                return (
                  <img
                    key={brand}
                    src={icon}
                    alt={brand}
                    className="h-5 w-auto sm:h-6 lg:h-7"
                  />
                );
              })}
              {showPix && (
                <PixIcon className="text-[#32BCAD] h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
              )}
              {showBoleto && (
                <Barcode className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
              )}
            </div>

            {/* Payment info text */}
            <div className="space-y-1 text-xs sm:text-sm" style={{ color: textMutedColor }}>
              {installmentText && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>{installmentText}</span>
                </div>
              )}
              {showPix && pixDiscount > 0 && (
                <p>PIX com {(pixDiscount * 100) % 1 === 0 ? `${pixDiscount * 100}%` : `${String(pixDiscount * 100).replace('.', ',')}%`} de desconto</p>
              )}
              {showPix && pixDiscount === 0 && (
                <p>PIX</p>
              )}
              {showBoleto && boletoDiscount > 0 && (
                <p>Boleto com {(boletoDiscount * 100) % 1 === 0 ? `${boletoDiscount * 100}%` : `${String(boletoDiscount * 100).replace('.', ',')}%`} de desconto</p>
              )}
              {showBoleto && boletoDiscount === 0 && (
                <p>Boleto Bancário</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
