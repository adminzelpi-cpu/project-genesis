import { ShieldCheck } from "lucide-react";
import { Pix, BoletoTransparent } from "react-pay-icons";

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
  discover: discoverIcon,
  aura: auraIcon,
};

interface CheckoutFooterProps {
  acceptedBrands?: string[];
  showPix?: boolean;
  showBoleto?: boolean;
}

export function CheckoutFooter({ 
  acceptedBrands = ["visa", "mastercard", "elo", "amex", "diners", "hiper", "discover", "aura"],
  showPix = true,
  showBoleto = true,
}: CheckoutFooterProps) {
  return (
    <footer className="mt-5 pb-6">
      <div className="container mx-auto px-4 max-w-[700px] lg:max-w-[1200px]">
        <div className="border-t border-border pt-6" />
        <div className="flex flex-col items-center gap-3">
          {/* Payment icons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {acceptedBrands.map((brand) => {
              const icon = brandIcons[brand];
              if (!icon) return null;
              return (
                <img
                  key={brand}
                  src={icon}
                  alt={brand}
                  className="h-5 w-auto sm:h-6 md:h-7"
                />
              );
            })}
            {showPix && (
              <div className="flex items-center">
                <Pix style={{ width: 24, height: 24 }} className="sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px]" />
              </div>
            )}
            {showBoleto && (
              <div className="flex items-center">
                <BoletoTransparent style={{ width: 24, height: 24 }} className="sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px]" />
              </div>
            )}
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ambiente seguro</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
