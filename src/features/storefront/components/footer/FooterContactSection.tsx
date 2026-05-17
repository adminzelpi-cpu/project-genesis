 import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Instagram, Facebook } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
 import { cn } from "@/lib/utils";
 
 interface FooterContactSectionProps {
   store: {
     email?: string | null;
     whatsapp?: string | null;
     instagram?: string | null;
     facebook?: string | null;
     tiktok?: string | null;
   };
   textColor: string;
   textMutedColor: string;
   showSocialLinks: boolean;
   collapsible?: boolean;
 }
 
 export function FooterContactSection({ 
   store, 
   textColor, 
   textMutedColor,
   showSocialLinks,
   collapsible = true 
 }: FooterContactSectionProps) {
   const [isOpen, setIsOpen] = useState(false);
   const hasSocialLinks = store.instagram || store.facebook || store.tiktok;
   const hasContactInfo = store.email || store.whatsapp;
 
   if (!hasContactInfo && !hasSocialLinks) return null;
 
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
         <span className="font-semibold text-sm uppercase tracking-wider">Atendimento</span>
         {collapsible && (
           <span className="sm:hidden">
             {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
           </span>
         )}
       </button>
       <div className={cn(
         collapsible && "overflow-hidden transition-all duration-300 sm:overflow-visible sm:max-h-none sm:mt-4",
         collapsible && (isOpen ? "max-h-96 pb-4" : "max-h-0"),
         !collapsible && "mt-4"
       )}>
         <div className="space-y-4">
           {hasContactInfo && (
             <div className="space-y-2">
               {store.email && (
                 <a 
                   href={`mailto:${store.email}`}
                   className="text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                   style={{ color: textMutedColor }}
                 >
                   <Mail className="h-4 w-4" />
                   {store.email}
                 </a>
               )}
               {store.whatsapp && (
                 <a 
                   href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                   style={{ color: textMutedColor }}
                 >
                   <WhatsAppIcon className="h-4 w-4" />
                   {store.whatsapp}
                 </a>
               )}
             </div>
           )}
 
           {showSocialLinks && hasSocialLinks && (
             <div className="flex items-center gap-3 pt-2">
               {store.instagram && (
                 <a
                   href={store.instagram.startsWith('http') ? store.instagram : `https://instagram.com/${store.instagram}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                   style={{ backgroundColor: `${textColor}15` }}
                   aria-label="Instagram"
                 >
                   <Instagram className="h-5 w-5" style={{ color: textColor }} />
                 </a>
               )}
               {store.facebook && (
                 <a
                   href={store.facebook.startsWith('http') ? store.facebook : `https://facebook.com/${store.facebook}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                   style={{ backgroundColor: `${textColor}15` }}
                   aria-label="Facebook"
                 >
                   <Facebook className="h-5 w-5" style={{ color: textColor }} />
                 </a>
               )}
               {store.tiktok && (
                 <a
                   href={store.tiktok.startsWith('http') ? store.tiktok : `https://tiktok.com/@${store.tiktok}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                   style={{ backgroundColor: `${textColor}15` }}
                   aria-label="TikTok"
                 >
                   <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: textColor }}>
                     <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.14a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.01-.57Z"/>
                   </svg>
                 </a>
               )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }