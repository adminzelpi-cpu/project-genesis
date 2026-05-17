 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { ChevronDown, ChevronUp } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface LinkItem {
   title: string;
   url: string;
   openInNewTab?: boolean;
 }
 
 interface FooterLinkSectionProps {
   title: string;
   links: LinkItem[];
   textColor: string;
   textMutedColor: string;
   collapsible?: boolean;
 }
 
 export function FooterLinkSection({ 
   title, 
   links, 
   textColor, 
   textMutedColor,
   collapsible = true 
 }: FooterLinkSectionProps) {
   const [isOpen, setIsOpen] = useState(false);
 
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
         <span className="font-semibold text-sm uppercase tracking-wider">{title}</span>
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
         <ul className="space-y-3">
           {links.map((link, index) => (
             <li key={index}>
               <Link
                 to={link.url}
                 target={link.openInNewTab ? "_blank" : undefined}
                 rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                 className="text-sm hover:underline underline-offset-2 transition-opacity hover:opacity-80"
                 style={{ color: textMutedColor }}
               >
                 {link.title}
               </Link>
             </li>
           ))}
         </ul>
       </div>
     </div>
   );
 }