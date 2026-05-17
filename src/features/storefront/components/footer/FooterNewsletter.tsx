import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FooterNewsletterProps {
  bgColor: string;
  textColor: string;
  textMutedColor: string;
  title: string;
  subtitle: string;
  variant?: "mobile" | "desktop" | "collapsible";
  storeId?: string;
}

async function subscribeToNewsletter(storeId: string, email: string, source: string = 'footer') {
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      { store_id: storeId, email: email.trim().toLowerCase(), source, consented_at: new Date().toISOString() },
      { onConflict: 'store_id,email' }
    );
  if (error) throw error;
}

// Detect if a hex color is light (luminance > 0.5) → returns true for light backgrounds
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

export function FooterNewsletter({ 
  bgColor,
  textColor, 
  textMutedColor,
  title,
  subtitle,
  variant = "desktop",
  storeId
}: FooterNewsletterProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Adaptive input styling based on footer background luminance
  const lightBg = isLightColor(bgColor);
  const inputStyle: React.CSSProperties = {
    color: textColor,
    backgroundColor: lightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.1)',
    borderColor: lightBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
  };
  const placeholderClass = lightBg ? 'placeholder:text-black/40' : 'placeholder:text-white/50';
  const inputClassBase = 'text-inherit h-10 w-full';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !storeId) return;

    setIsSubmitting(true);
    try {
      await subscribeToNewsletter(storeId, email, 'footer');
      toast.success("Cadastro realizado com sucesso! 🎉");
      setEmail("");
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile hero version
  if (variant === "mobile") {
    return (
      <div className="border-b border-white/10 sm:hidden">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: `${textColor}15` }}>
              <Mail className="h-6 w-6" style={{ color: textColor }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: textColor }}>{title}</h3>
            <p className="text-sm mb-6" style={{ color: textMutedColor }}>
              {subtitle}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(inputClassBase, placeholderClass, 'h-12 border')}
                style={inputStyle}
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-12 px-6 font-semibold"
                style={{ backgroundColor: textColor, color: bgColor }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Cadastrar
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet inline version
  if (variant === "desktop") {
    return (
      <div className="w-full">
        <h4 className="font-semibold text-sm uppercase tracking-wider mb-4" style={{ color: textColor }}>
          Newsletter
        </h4>
        <p className="text-sm mb-4" style={{ color: textMutedColor }}>
          {subtitle}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(inputClassBase, placeholderClass, 'border')}
            style={inputStyle}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-10 font-semibold"
            style={{ backgroundColor: textColor, color: bgColor }}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Cadastrar
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Collapsible version for tablet
  return (
    <div className="border-b border-white/10 sm:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 sm:py-0 sm:pointer-events-none"
        style={{ color: textColor }}
      >
        <span className="font-semibold text-sm uppercase tracking-wider">Newsletter</span>
        <span className="sm:hidden">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300 sm:overflow-visible sm:max-h-none sm:mt-4",
        isOpen ? "max-h-96 pb-4" : "max-h-0"
      )}>
        <p className="text-sm mb-4" style={{ color: textMutedColor }}>
          {subtitle}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(inputClassBase, placeholderClass, 'border')}
            style={inputStyle}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-10 font-semibold"
            style={{ backgroundColor: textColor, color: bgColor }}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Cadastrar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
