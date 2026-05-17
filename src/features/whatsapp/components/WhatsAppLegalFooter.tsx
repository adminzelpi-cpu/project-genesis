export function WhatsAppLegalFooter() {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed">
      Ao conectar, você concorda com os{" "}
      <a
        href="https://www.whatsapp.com/legal/business-terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Termos do WhatsApp Business
      </a>
      , a{" "}
      <a
        href="https://developers.facebook.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Política da Plataforma Meta
      </a>{" "}
      e os{" "}
      <a
        href="https://www.whatsapp.com/legal/business-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Termos de Uso da API
      </a>
      . As mensagens são cobradas pela Meta diretamente no cartão da sua Business Manager — a Zelpi não cobra por conversa.
    </p>
  );
}
