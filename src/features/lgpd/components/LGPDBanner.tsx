import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicLGPDSettings, LGPDSettings } from "../hooks/useLGPDSettings";

interface LGPDBannerProps {
  storeId: string | undefined;
  storeSlug?: string;
}

const LGPD_CONSENT_KEY = (storeSlug: string) => `lgpd_consent_${storeSlug}`;

export const LGPDBanner = ({ storeId, storeSlug }: LGPDBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { data: settings, isLoading } = usePublicLGPDSettings(storeId);

  useEffect(() => {
    if (!storeSlug || isLoading) return;
    
    // Don't show if LGPD is disabled
    if (settings && !settings.is_enabled) {
      setIsVisible(false);
      return;
    }

    // Check if user already responded
    const consent = localStorage.getItem(LGPD_CONSENT_KEY(storeSlug));
    if (!consent) {
      // Show banner after a small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storeSlug, isLoading, settings]);

  const handleAccept = () => {
    if (storeSlug) {
      localStorage.setItem(LGPD_CONSENT_KEY(storeSlug), 'accepted');
    }
    setIsVisible(false);
  };

  const handleClose = () => {
    if (storeSlug) {
      localStorage.setItem(LGPD_CONSENT_KEY(storeSlug), 'accepted');
    }
    setIsVisible(false);
  };

  // Don't render while loading, if disabled, or if not visible
  if (isLoading || !isVisible) {
    return null;
  }

  // Default settings if none configured
  const displaySettings: Partial<LGPDSettings> = settings || {
    style_variant: 'dark_transparent',
    title: 'Política de Privacidade',
    description: 'Utilizamos cookies para melhorar sua experiência de navegação. Ao continuar, você concorda com nossa política de privacidade.',
    accept_button_text: 'Continuar e fechar',
    reject_button_text: 'Recusar',
  };

  const getStyleClasses = () => {
    switch (displaySettings.style_variant) {
      case 'light':
        return {
          overlay: 'bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl',
          title: 'text-gray-900',
          description: 'text-gray-600',
          acceptBtn: 'bg-gray-900 text-white hover:bg-gray-800',
          rejectBtn: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
          closeBtn: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          icon: 'text-gray-700',
        };
      case 'minimal':
        return {
          overlay: 'bg-gray-50/98 backdrop-blur-md border border-gray-100 shadow-lg',
          title: 'text-gray-800',
          description: 'text-gray-500',
          acceptBtn: 'bg-black text-white hover:bg-gray-900',
          rejectBtn: 'bg-transparent text-gray-600 hover:text-gray-900 underline underline-offset-2',
          closeBtn: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
          icon: 'text-gray-500',
        };
      case 'dark_transparent':
      default:
        return {
          overlay: 'bg-black/85 backdrop-blur-md border border-white/10 shadow-2xl',
          title: 'text-white',
          description: 'text-gray-300',
          acceptBtn: 'bg-white text-black hover:bg-gray-100',
          rejectBtn: 'bg-white/10 text-white hover:bg-white/20 border border-white/20',
          closeBtn: 'text-gray-400 hover:text-white hover:bg-white/10',
          icon: 'text-white/80',
        };
    }
  };

  const styles = getStyleClasses();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-4 sm:p-6 pointer-events-none">
      {/* Banner Container - Floating with margins */}
      <div
        className={cn(
          "relative w-full max-w-2xl pointer-events-auto mb-4 sm:mb-8 animate-slide-up",
          "rounded-2xl overflow-hidden",
          styles.overlay
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-full transition-colors",
            styles.closeBtn
          )}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-6">
          {/* Description */}
          <p className={cn("text-sm leading-relaxed text-center", styles.description)}>
            {displaySettings.description}
            {displaySettings.privacy_policy_url && (
              <>
                {' '}
                <a
                  href={displaySettings.privacy_policy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80 transition-opacity"
                >
                  Saiba mais
                </a>
              </>
            )}
          </p>

          {/* Accept button - centered and prominent */}
          <div className="flex justify-center mt-5">
            <Button
              onClick={handleAccept}
              className={cn("text-sm h-11 px-10 rounded-lg font-medium min-w-[200px]", styles.acceptBtn)}
            >
              {displaySettings.accept_button_text}
            </Button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
