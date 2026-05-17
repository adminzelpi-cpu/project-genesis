 import { Link } from "react-router-dom";
 import { useStorefrontMenus } from "@/features/storefront/hooks/useStorefrontMenus";
 import { usePublicPolicies } from "@/features/policies/hooks/usePublicPolicies";
 import { useStorePath } from "@/contexts/StoreSlugContext";
 import { ScrollToTopButton } from "./ScrollToTopButton";
 import { FooterLinkSection } from "../footer/FooterLinkSection";
 import { FooterContactSection } from "../footer/FooterContactSection";
 import { FooterPaymentSection } from "../footer/FooterPaymentSection";
 import { FooterNewsletter } from "../footer/FooterNewsletter";
 
 interface FooterProps {
   store: {
     id: string;
     name: string;
     slug: string;
     logo_url?: string | null;
     instagram?: string | null;
     facebook?: string | null;
     whatsapp?: string | null;
     tiktok?: string | null;
     email?: string | null;
     phone?: string | null;
     footer_bg_color?: string | null;
     footer_text_color?: string | null;
     footer_newsletter_enabled?: boolean;
     footer_newsletter_title?: string | null;
     footer_newsletter_subtitle?: string | null;
     footer_show_payment_methods?: boolean;
     footer_show_social_links?: boolean;
     footer_copyright_text?: string | null;
   };
 }
 
 export function StorefrontFooter({ store }: FooterProps) {
    const { data: menus } = useStorefrontMenus(store.id);
    const { data: policies = [] } = usePublicPolicies(store.id);
    const { buildPath } = useStorePath();
 
    const bgColor = store.footer_bg_color || "#1f2937";
    const textColor = store.footer_text_color || "#ffffff";
    const textMutedColor = `${textColor}cc`;
    const showNewsletter = store.footer_newsletter_enabled !== false;
    const showPaymentMethods = store.footer_show_payment_methods !== false;
    const showSocialLinks = store.footer_show_social_links !== false;
    const newsletterTitle = store.footer_newsletter_title || "Receba novidades e promoções";
    const newsletterSubtitle = store.footer_newsletter_subtitle || "Cadastre-se e seja o primeiro a saber sobre ofertas exclusivas";
    const copyrightText = store.footer_copyright_text || `© ${new Date().getFullYear()} ${store.name}. Todos os direitos reservados.`;
 
    // Help menu items: system links + custom items from menu
    // "Fale Conosco" só aparece se o lojista configurou um e-mail de contato
    const systemHelpLinks = [
      { title: "Acompanhe seu Pedido", url: buildPath(`/customer/orders`) },
      ...(store.email ? [{ title: "Fale Conosco", url: buildPath(`/contato`) }] : []),
    ];
    
    // Custom help links from menu
    const customHelpLinks = (menus?.footer?.helpItems || []).map((item) => ({
      title: item.title,
      url: item.link_type === "custom" && item.url
        ? (item.url.startsWith("/") ? buildPath(item.url) : item.url)
        : item.link_type === "category" && item.link_reference_id ? buildPath(`/category/${item.link_reference_id}`)
        : item.link_type === "product" && item.link_reference_id ? buildPath(`/product/${item.link_reference_id}`)
        : item.link_type === "page" && item.link_reference_id ? buildPath(`/page/${item.link_reference_id}`)
        : item.url ? (item.url.startsWith("/") ? buildPath(item.url) : item.url) : "#",
      openInNewTab: item.open_in_new_tab,
    }));
    
    const helpLinks = [...systemHelpLinks, ...customHelpLinks];
 
    // Build a set of policy slugs from menu items to avoid duplicates
    const menuPolicyUrls = new Set(
      menus?.footer?.institutionalItems
        ?.filter((item) => item.url?.startsWith("/pagina/"))
        .map((item) => item.url) || []
    );

    // Institutional menu items (from CMS menu) + any policies not already in the menu
    const institutionalLinks = [
      ...(menus?.footer?.institutionalItems?.map((item) => ({
        title: item.title,
        url: item.link_type === "custom" && item.url
          ? (item.url.startsWith("/") ? buildPath(item.url) : item.url)
          : item.link_type === "category" && item.link_reference_id ? buildPath(`/category/${item.link_reference_id}`)
          : item.link_type === "product" && item.link_reference_id ? buildPath(`/product/${item.link_reference_id}`)
          : item.link_type === "page" && item.link_reference_id ? buildPath(`/page/${item.link_reference_id}`)
          : item.url ? (item.url.startsWith("/") ? buildPath(item.url) : item.url) : "#",
        openInNewTab: item.open_in_new_tab,
      })) || []),
      // Add any policies that are NOT already present as menu items
      ...policies
        .filter((policy) => !menuPolicyUrls.has(`/pagina/${policy.slug}`))
        .map((policy) => ({
          title: policy.title,
          url: buildPath(`/pagina/${policy.slug}`),
        })),
    ];
 
   return (
     <>
       <ScrollToTopButton />
       <footer style={{ backgroundColor: bgColor, color: textColor }}>
         {/* Mobile Newsletter Hero - Only on mobile */}
         {showNewsletter && (
            <FooterNewsletter
              bgColor={bgColor}
              textColor={textColor}
              textMutedColor={textMutedColor}
              title={newsletterTitle}
              subtitle={newsletterSubtitle}
              variant="mobile"
              storeId={store.id}
            />
         )}
 
         {/* Main Footer Content - Responsive grid */}
         <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl w-full">
           
           {/* DESKTOP LAYOUT (lg+): Two main columns 50/50 */}
           <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12">
             {/* Left Column: Links sub-grid */}
             <div className="grid grid-cols-3 gap-6">
               <FooterLinkSection
                 title="Precisa de ajuda?"
                 links={helpLinks}
                 textColor={textColor}
                 textMutedColor={textMutedColor}
                 collapsible={false}
               />
               <div>
                 <FooterLinkSection
                   title="Institucional"
                   links={institutionalLinks}
                   textColor={textColor}
                   textMutedColor={textMutedColor}
                   collapsible={false}
                 />
               </div>
               <FooterContactSection
                 store={store}
                 textColor={textColor}
                 textMutedColor={textMutedColor}
                 showSocialLinks={showSocialLinks}
                 collapsible={false}
               />
             </div>
 
             {/* Right Column: Payment + Newsletter */}
             <div className="grid grid-cols-2 gap-6">
                {showPaymentMethods && (
                  <FooterPaymentSection
                    textColor={textColor}
                    textMutedColor={textMutedColor}
                    collapsible={false}
                    storeId={store.id}
                  />
                )}
               {showNewsletter && (
                  <FooterNewsletter
                    bgColor={bgColor}
                    textColor={textColor}
                    textMutedColor={textMutedColor}
                    title={newsletterTitle}
                    subtitle={newsletterSubtitle}
                    variant="desktop"
                    storeId={store.id}
                  />
               )}
             </div>
           </div>
 
           {/* TABLET LAYOUT (sm to lg): Newsletter/Payment top, links bottom */}
           <div className="hidden sm:block lg:hidden">
             {/* Top row: Newsletter + Payment side by side */}
             <div className="grid grid-cols-2 gap-6 mb-8">
               {showNewsletter && (
                  <FooterNewsletter
                    bgColor={bgColor}
                    textColor={textColor}
                    textMutedColor={textMutedColor}
                    title={newsletterTitle}
                    subtitle={newsletterSubtitle}
                    variant="desktop"
                    storeId={store.id}
                  />
               )}
                {showPaymentMethods && (
                  <FooterPaymentSection
                    textColor={textColor}
                    textMutedColor={textMutedColor}
                    collapsible={false}
                    storeId={store.id}
                  />
                )}
             </div>
             
             {/* Bottom row: Links distributed */}
             <div className="flex justify-between gap-4">
               <FooterLinkSection
                 title="Precisa de ajuda?"
                 links={helpLinks}
                 textColor={textColor}
                 textMutedColor={textMutedColor}
                 collapsible={false}
               />
               <div>
                 <FooterLinkSection
                   title="Institucional"
                   links={institutionalLinks}
                   textColor={textColor}
                   textMutedColor={textMutedColor}
                   collapsible={false}
                 />
               </div>
               <FooterContactSection
                 store={store}
                 textColor={textColor}
                 textMutedColor={textMutedColor}
                 showSocialLinks={showSocialLinks}
                 collapsible={false}
               />
             </div>
           </div>
 
           {/* MOBILE LAYOUT (below sm): Stacked accordions */}
           <div className="sm:hidden">
             <FooterLinkSection
               title="Precisa de ajuda?"
               links={helpLinks}
               textColor={textColor}
               textMutedColor={textMutedColor}
             />
             <FooterLinkSection
               title="Institucional"
               links={institutionalLinks}
               textColor={textColor}
               textMutedColor={textMutedColor}
             />
             <FooterContactSection
               store={store}
               textColor={textColor}
               textMutedColor={textMutedColor}
               showSocialLinks={showSocialLinks}
             />
              {showPaymentMethods && (
                <FooterPaymentSection
                  textColor={textColor}
                  textMutedColor={textMutedColor}
                  storeId={store.id}
                />
              )}
           </div>
         </div>
 
         {/* Bottom Bar */}
         <div className="border-t border-white/10">
           <div className="container mx-auto px-4 py-4 max-w-7xl">
             <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs" style={{ color: textMutedColor }}>
                <p>{copyrightText}</p>
                <p className="flex items-center gap-1">
                  Desenvolvido com 
                  <span className="font-semibold" style={{ color: textColor }}>Zelpi</span>
                </p>
             </div>
           </div>
         </div>
       </footer>
     </>
   );
 }