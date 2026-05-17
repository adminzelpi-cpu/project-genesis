import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Palette, PanelTop, PanelBottom, Type, Save } from "lucide-react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { useStore } from "@/features/stores/hooks/useStore";
import { toast } from "sonner";
import type { ButtonRadius, ElementRadius, HeaderLayout, MobileLogoPosition, FontFamily, ColorPalette } from "./appearance/types";
import { HeaderSection } from "./appearance/HeaderSection";
import { FooterSection } from "./appearance/FooterSection";
import { ColorsSection } from "./appearance/ColorsSection";
import { TypographySection } from "./appearance/TypographySection";

export default function StoreAppearance() {
  const { store, isLoading: isLoadingStore, refreshStore } = useActiveStore();
  const { updateStore, loading: isSaving } = useStore();

  // All theme state
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [buttonColor, setButtonColor] = useState("#000000");
  const [buttonHoverColor, setButtonHoverColor] = useState("#333333");
  const [buttonTextColor, setButtonTextColor] = useState<string | null>(null);
  const [primaryTextColor, setPrimaryTextColor] = useState<string | null>(null);
  const [secondaryTextColor, setSecondaryTextColor] = useState<string | null>(null);
  const [buttonRadius, setButtonRadius] = useState<ButtonRadius>("rounded");
  const [elementRadius, setElementRadius] = useState<ElementRadius>("rounded");
  const [headerBgColor, setHeaderBgColor] = useState("#ffffff");
  const [headerTextColor, setHeaderTextColor] = useState("#000000");
  const [headerLayout, setHeaderLayout] = useState<HeaderLayout>("default");
  const [headerShowFavorites, setHeaderShowFavorites] = useState(true);
  const [headerShowSearch, setHeaderShowSearch] = useState(true);
  const [headerMobileLogoPosition, setHeaderMobileLogoPosition] = useState<MobileLogoPosition>("center");
  const [footerBgColor, setFooterBgColor] = useState("#1f2937");
  const [footerTextColor, setFooterTextColor] = useState("#ffffff");
  const [footerNewsletterEnabled, setFooterNewsletterEnabled] = useState(true);
  const [footerNewsletterTitle, setFooterNewsletterTitle] = useState("Receba novidades e promoções");
  const [footerNewsletterSubtitle, setFooterNewsletterSubtitle] = useState("Cadastre-se e seja o primeiro a saber sobre ofertas exclusivas");
  const [footerShowPaymentMethods, setFooterShowPaymentMethods] = useState(true);
  const [footerShowSocialLinks, setFooterShowSocialLinks] = useState(true);
  const [footerCopyrightText, setFooterCopyrightText] = useState("");
  const [fontFamily, setFontFamily] = useState<FontFamily>("system");

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (store) {
      setPrimaryColor(store.theme_primary_color || "#3b82f6");
      setSecondaryColor(store.theme_secondary_color || "#D4A853");
      setLogoUrl(store.logo_url || null);
      setFaviconUrl((store as any).favicon_url || null);
      setButtonColor((store as any).button_color || store.theme_primary_color || "#000000");
      setButtonHoverColor((store as any).button_hover_color || "#333333");
      setButtonTextColor((store as any).button_text_color ?? null);
      setPrimaryTextColor((store as any).primary_text_color ?? null);
      setSecondaryTextColor((store as any).secondary_text_color ?? null);
      setButtonRadius(((store as any).button_border_radius as ButtonRadius) || "rounded");
      setElementRadius(((store as any).element_border_radius as ElementRadius) || "rounded");
      setHeaderBgColor((store as any).header_bg_color || "#ffffff");
      setHeaderTextColor((store as any).header_text_color || "#000000");
      setHeaderLayout(((store as any).header_layout as HeaderLayout) || "default");
      setHeaderShowFavorites((store as any).header_show_favorites !== false);
      setHeaderShowSearch((store as any).header_show_search !== false);
      setHeaderMobileLogoPosition(((store as any).header_mobile_logo_position as MobileLogoPosition) || "center");
      setFooterBgColor((store as any).footer_bg_color || "#1f2937");
      setFooterTextColor((store as any).footer_text_color || "#ffffff");
      setFooterNewsletterEnabled((store as any).footer_newsletter_enabled !== false);
      setFooterNewsletterTitle((store as any).footer_newsletter_title || "Receba novidades e promoções");
      setFooterNewsletterSubtitle((store as any).footer_newsletter_subtitle || "Cadastre-se e seja o primeiro a saber sobre ofertas exclusivas");
      setFooterShowPaymentMethods((store as any).footer_show_payment_methods !== false);
      setFooterShowSocialLinks((store as any).footer_show_social_links !== false);
      setFooterCopyrightText((store as any).footer_copyright_text || "");
      setFontFamily(((store as any).font_family as FontFamily) || "system");
      setHasChanges(false);
    }
  }, [store]);

  // Wrap setters to track changes
  const track = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setHasChanges(true); };

  const handleApplyPalette = (palette: ColorPalette) => {
    setPrimaryColor(palette.colors.primary);
    setSecondaryColor(palette.colors.secondary);
    setPrimaryTextColor(palette.colors.primaryText);
    setSecondaryTextColor(palette.colors.secondaryText);
    setButtonColor(palette.colors.button);
    setButtonHoverColor(palette.colors.buttonHover);
    setButtonTextColor(palette.colors.buttonText);
    setHeaderBgColor(palette.colors.headerBg);
    setHeaderTextColor(palette.colors.headerText);
    setFooterBgColor(palette.colors.footerBg);
    setFooterTextColor(palette.colors.footerText);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (!store) { toast.error("Nenhuma loja encontrada"); return; }

    const { error } = await updateStore(store.id, {
      theme_primary_color: primaryColor,
      theme_secondary_color: secondaryColor,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      button_color: buttonColor,
      button_hover_color: buttonHoverColor,
      button_text_color: buttonTextColor,
      primary_text_color: primaryTextColor,
      secondary_text_color: secondaryTextColor,
      button_border_radius: buttonRadius,
      element_border_radius: elementRadius,
      header_bg_color: headerBgColor,
      header_text_color: headerTextColor,
      header_layout: headerLayout,
      header_show_favorites: headerShowFavorites,
      header_show_search: headerShowSearch,
      header_mobile_logo_position: headerMobileLogoPosition,
      footer_bg_color: footerBgColor,
      footer_text_color: footerTextColor,
      footer_newsletter_enabled: footerNewsletterEnabled,
      footer_newsletter_title: footerNewsletterTitle,
      footer_newsletter_subtitle: footerNewsletterSubtitle,
      footer_show_payment_methods: footerShowPaymentMethods,
      footer_show_social_links: footerShowSocialLinks,
      footer_copyright_text: footerCopyrightText || null,
      font_family: fontFamily,
    } as any);

    if (!error) {
      refreshStore();
      setHasChanges(false);
      toast.success("Tema salvo com sucesso!");
    }
  };

  if (isLoadingStore) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aparência</h1>
          <p className="text-sm text-muted-foreground">Personalize o visual da sua loja</p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving || !hasChanges} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar tudo
        </Button>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto gap-0.5">
          <TabsTrigger value="colors" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Cores e Estilo</span>
            <span className="sm:hidden">Cores</span>
          </TabsTrigger>
          <TabsTrigger value="header" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PanelTop className="h-4 w-4" />
            Cabeçalho
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PanelBottom className="h-4 w-4" />
            Rodapé
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Type className="h-4 w-4" />
            Tipografia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors">
          <div className="rounded-xl border bg-card p-6">
            <ColorsSection
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              buttonColor={buttonColor}
              buttonHoverColor={buttonHoverColor}
              buttonTextColor={buttonTextColor}
              primaryTextColor={primaryTextColor}
              secondaryTextColor={secondaryTextColor}
              buttonRadius={buttonRadius}
              elementRadius={elementRadius}
              onPrimaryColorChange={track(setPrimaryColor)}
              onSecondaryColorChange={track(setSecondaryColor)}
              onButtonColorChange={track(setButtonColor)}
              onButtonHoverColorChange={track(setButtonHoverColor)}
              onButtonTextColorChange={track(setButtonTextColor)}
              onPrimaryTextColorChange={track(setPrimaryTextColor)}
              onSecondaryTextColorChange={track(setSecondaryTextColor)}
              onButtonRadiusChange={track(setButtonRadius)}
              onElementRadiusChange={track(setElementRadius)}
              onApplyPalette={handleApplyPalette}
            />
          </div>
        </TabsContent>

        <TabsContent value="header">
          <div className="rounded-xl border bg-card p-6">
            <HeaderSection
              storeName={store.name || 'Minha Loja'}
              storeId={store.id}
              logoUrl={logoUrl}
              faviconUrl={faviconUrl}
              headerBgColor={headerBgColor}
              headerTextColor={headerTextColor}
              headerLayout={headerLayout}
              headerShowFavorites={headerShowFavorites}
              headerShowSearch={headerShowSearch}
              headerMobileLogoPosition={headerMobileLogoPosition}
              onLogoChange={(url) => { setLogoUrl(url); setHasChanges(true); }}
              onFaviconChange={(url) => { setFaviconUrl(url); setHasChanges(true); }}
              onHeaderBgColorChange={track(setHeaderBgColor)}
              onHeaderTextColorChange={track(setHeaderTextColor)}
              onHeaderLayoutChange={track(setHeaderLayout)}
              onHeaderShowFavoritesChange={track(setHeaderShowFavorites)}
              onHeaderShowSearchChange={track(setHeaderShowSearch)}
              onHeaderMobileLogoPositionChange={track(setHeaderMobileLogoPosition)}
              refreshStore={refreshStore}
            />
          </div>
        </TabsContent>

        <TabsContent value="footer">
          <div className="rounded-xl border bg-card p-6">
            <FooterSection
              storeName={store.name || 'Minha Loja'}
              footerBgColor={footerBgColor}
              footerTextColor={footerTextColor}
              footerNewsletterEnabled={footerNewsletterEnabled}
              footerNewsletterTitle={footerNewsletterTitle}
              footerNewsletterSubtitle={footerNewsletterSubtitle}
              footerShowPaymentMethods={footerShowPaymentMethods}
              footerShowSocialLinks={footerShowSocialLinks}
              footerCopyrightText={footerCopyrightText}
              onFooterBgColorChange={track(setFooterBgColor)}
              onFooterTextColorChange={track(setFooterTextColor)}
              onFooterNewsletterEnabledChange={track(setFooterNewsletterEnabled)}
              onFooterNewsletterTitleChange={track(setFooterNewsletterTitle)}
              onFooterNewsletterSubtitleChange={track(setFooterNewsletterSubtitle)}
              onFooterShowPaymentMethodsChange={track(setFooterShowPaymentMethods)}
              onFooterShowSocialLinksChange={track(setFooterShowSocialLinks)}
              onFooterCopyrightTextChange={track(setFooterCopyrightText)}
            />
          </div>
        </TabsContent>

        <TabsContent value="typography">
          <div className="rounded-xl border bg-card p-6">
            <TypographySection
              fontFamily={fontFamily}
              onFontFamilyChange={track(setFontFamily)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating save bar when changes exist */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Você tem alterações não salvas</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => { if (store) { /* Reset from store - trigger re-read */ refreshStore(); } }}>
                Descartar
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar tudo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
