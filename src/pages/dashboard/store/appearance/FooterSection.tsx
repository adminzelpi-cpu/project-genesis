import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { HexColorPicker } from "@/components/ui/hex-color-picker";
import { Instagram, Facebook, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FooterSectionProps {
  storeName: string;
  footerBgColor: string;
  footerTextColor: string;
  footerNewsletterEnabled: boolean;
  footerNewsletterTitle: string;
  footerNewsletterSubtitle: string;
  footerShowPaymentMethods: boolean;
  footerShowSocialLinks: boolean;
  footerCopyrightText: string;
  onFooterBgColorChange: (v: string) => void;
  onFooterTextColorChange: (v: string) => void;
  onFooterNewsletterEnabledChange: (v: boolean) => void;
  onFooterNewsletterTitleChange: (v: string) => void;
  onFooterNewsletterSubtitleChange: (v: string) => void;
  onFooterShowPaymentMethodsChange: (v: boolean) => void;
  onFooterShowSocialLinksChange: (v: boolean) => void;
  onFooterCopyrightTextChange: (v: string) => void;
}

export function FooterSection({
  storeName,
  footerBgColor, footerTextColor,
  footerNewsletterEnabled, footerNewsletterTitle, footerNewsletterSubtitle,
  footerShowPaymentMethods, footerShowSocialLinks, footerCopyrightText,
  onFooterBgColorChange, onFooterTextColorChange,
  onFooterNewsletterEnabledChange, onFooterNewsletterTitleChange, onFooterNewsletterSubtitleChange,
  onFooterShowPaymentMethodsChange, onFooterShowSocialLinksChange, onFooterCopyrightTextChange,
}: FooterSectionProps) {
  const FOOTER_PALETTES: { id: string; name: string; bg: string; text: string }[] = [
    { id: 'graphite', name: 'Grafite', bg: '#1f2937', text: '#ffffff' },
    { id: 'noir',     name: 'Noir',    bg: '#0a0a0a', text: '#fafafa' },
    { id: 'cream',    name: 'Creme',   bg: '#f5f1ea', text: '#1a1a1a' },
    { id: 'mist',     name: 'Névoa',   bg: '#e5e7eb', text: '#1f2937' },
  ];
  const activePaletteId = FOOTER_PALETTES.find(
    p => p.bg.toLowerCase() === (footerBgColor || '').toLowerCase() &&
         p.text.toLowerCase() === (footerTextColor || '').toLowerCase()
  )?.id;

  return (
    <div className="space-y-8">
      {/* Quick palettes */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Estilo do rodapé</Label>
        <p className="text-xs text-muted-foreground">Escolha uma combinação pronta ou personalize abaixo.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FOOTER_PALETTES.map((palette) => {
            const isActive = activePaletteId === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => {
                  onFooterBgColorChange(palette.bg);
                  onFooterTextColorChange(palette.text);
                }}
                className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                  isActive ? 'border-foreground' : 'border-border hover:border-foreground/30'
                }`}
              >
                <div
                  className="p-3 space-y-1.5"
                  style={{ backgroundColor: palette.bg, color: palette.text }}
                >
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Newsletter</p>
                  <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: `${palette.text}40` }} />
                  <div className="h-1.5 w-1/2 rounded" style={{ backgroundColor: `${palette.text}25` }} />
                </div>
                <div className="px-2.5 py-1.5 bg-background flex items-center justify-between">
                  <span className="text-xs font-medium">{palette.name}</span>
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: palette.bg }} />
                    <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: palette.text }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Cores personalizadas</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fundo</Label>
            <HexColorPicker value={footerBgColor} onChange={onFooterBgColorChange} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Texto / Ícones</Label>
            <HexColorPicker value={footerTextColor} onChange={onFooterTextColorChange} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prévia</Label>
        <div className="rounded-lg border overflow-hidden">
          <div className="p-5" style={{ backgroundColor: footerBgColor, color: footerTextColor }}>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="font-semibold uppercase tracking-wider mb-1.5" style={{ fontSize: '10px' }}>Ajuda</p>
                <p style={{ color: `${footerTextColor}cc`, fontSize: '11px' }}>Acompanhe seu Pedido</p>
                <p style={{ color: `${footerTextColor}cc`, fontSize: '11px' }}>Trocas e Devoluções</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider mb-1.5" style={{ fontSize: '10px' }}>Institucional</p>
                <p style={{ color: `${footerTextColor}cc`, fontSize: '11px' }}>Sobre Nós</p>
                <p style={{ color: `${footerTextColor}cc`, fontSize: '11px' }}>Privacidade</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider mb-1.5" style={{ fontSize: '10px' }}>Social</p>
                <div className="flex gap-1.5 mt-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${footerTextColor}15` }}>
                    <Instagram className="h-3 w-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${footerTextColor}15` }}>
                    <Facebook className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">Seções</Label>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Newsletter</Label>
            <p className="text-xs text-muted-foreground">Formulário de captura de e-mails</p>
          </div>
          <Switch checked={footerNewsletterEnabled} onCheckedChange={onFooterNewsletterEnabledChange} />
        </div>

        {footerNewsletterEnabled && (
          <div className="space-y-3 pl-1 border-l-2 border-muted ml-1">
            <div className="pl-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Título</Label>
                <Input value={footerNewsletterTitle} onChange={(e) => onFooterNewsletterTitleChange(e.target.value)} placeholder="Receba novidades e promoções" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtítulo</Label>
                <Input value={footerNewsletterSubtitle} onChange={(e) => onFooterNewsletterSubtitleChange(e.target.value)} placeholder="Cadastre-se e seja o primeiro..." className="h-9 text-sm" />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-sm">Formas de pagamento</Label>
          <Switch checked={footerShowPaymentMethods} onCheckedChange={onFooterShowPaymentMethodsChange} />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Redes sociais</Label>
          <Switch checked={footerShowSocialLinks} onCheckedChange={onFooterShowSocialLinksChange} />
        </div>
      </div>

      {/* Copyright */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Copyright</Label>
        <Input
          value={footerCopyrightText}
          onChange={(e) => onFooterCopyrightTextChange(e.target.value)}
          placeholder={`© ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.`}
          className="h-9 text-sm"
        />
        <p className="text-xs text-muted-foreground">Deixe em branco para o texto padrão</p>
      </div>
    </div>
  );
}
