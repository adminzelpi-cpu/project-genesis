import { Mail, Phone, Send, CheckCircle2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useState } from "react";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(200),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5, "Mensagem muito curta").max(5000, "Mensagem muito longa"),
});

export default function ContactPage() {
  const storeSlug = useStoreSlug();
  const { store, isLoading } = useStorefront(storeSlug);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  const hasWhatsapp = !!store.whatsapp;
  const hasEmail = !!store.email;
  const hasPhone = !!store.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifique os campos.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-message", {
        body: {
          store_id: store.id,
          name: parsed.data.name,
          email: parsed.data.email,
          subject: parsed.data.subject,
          message: parsed.data.message,
        },
      });

      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Não foi possível enviar sua mensagem.";
        toast.error(msg);
        return;
      }

      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      toast.success("Mensagem enviada! Em breve entraremos em contato.");
    } catch (err) {
      console.error("[contact] submit failed", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StoreThemeProvider
      primaryColor={store.theme_primary_color}
      secondaryColor={store.theme_secondary_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      faviconUrl={store.favicon_url}
      fontFamily={(store as any).font_family}
    >
      <Helmet>
        <title>Fale Conosco - {store.name}</title>
        <meta name="description" content={`Entre em contato com ${store.name}. Estamos aqui para ajudar!`} />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <StorefrontHeader
          storeName={store.name}
          storeSlug={store.slug}
          storeId={store.id}
          logoUrl={store.logo_url}
          headerBgColor={store.header_bg_color}
          headerTextColor={store.header_text_color}
          headerLayout={store.header_layout}
          headerShowFavorites={store.header_show_favorites}
          headerShowSearch={store.header_show_search}
          headerMobileLogoPosition={store.header_mobile_logo_position}
        />
        <main className="flex-1 py-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="text-2xl font-bold mb-2">Fale Conosco</h1>
            <p className="text-muted-foreground mb-8">
              Tem alguma dúvida ou precisa de ajuda? Entre em contato conosco por um dos canais abaixo.
            </p>

            {/* Contact channels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {hasEmail && (
                <a
                  href={`mailto:${store.email}`}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow text-center"
                >
                  <Mail className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">E-mail</span>
                  <span className="text-xs text-muted-foreground break-all">{store.email}</span>
                </a>
              )}
              {hasWhatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp!.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow text-center"
                >
                  <WhatsAppIcon className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">WhatsApp</span>
                  <span className="text-xs text-muted-foreground">{store.whatsapp}</span>
                </a>
              )}
              {hasPhone && (
                <a
                  href={`tel:${store.phone!.replace(/\D/g, "")}`}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow text-center"
                >
                  <Phone className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">Telefone</span>
                  <span className="text-xs text-muted-foreground">{store.phone}</span>
                </a>
              )}
            </div>

            {/* Contact form — only if merchant has email configured */}
            {hasEmail && (
              <div className="border rounded-xl p-6 bg-card">
                {sent ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h2 className="text-lg font-semibold mb-1">Mensagem enviada!</h2>
                    <p className="text-sm text-muted-foreground mb-5">
                      Recebemos sua mensagem e enviamos uma cópia para o seu e-mail. Responderemos em breve.
                    </p>
                    <Button variant="outline" onClick={() => setSent(false)}>
                      Enviar outra mensagem
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold mb-4">Envie uma mensagem</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome</Label>
                          <Input
                            id="name"
                            required
                            maxLength={120}
                            value={formData.name}
                            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Seu nome"
                            disabled={submitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            maxLength={200}
                            value={formData.email}
                            onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                            placeholder="seu@email.com"
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input
                          id="subject"
                          maxLength={200}
                          value={formData.subject}
                          onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
                          placeholder="Ex: Dúvida sobre um pedido"
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Mensagem</Label>
                        <Textarea
                          id="message"
                          required
                          rows={5}
                          maxLength={5000}
                          value={formData.message}
                          onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
                          placeholder="Como podemos ajudar?"
                          disabled={submitting}
                        />
                      </div>
                      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar mensagem
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
        <StorefrontFooter store={store} />
      </div>
    </StoreThemeProvider>
  );
}
