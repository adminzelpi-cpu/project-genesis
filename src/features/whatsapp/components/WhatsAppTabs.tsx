import { NavLink, useLocation } from "react-router-dom";
import { CheckCircle2, MessageSquare, FileText, Megaphone, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard/whatsapp", label: "Conexão", icon: Plug, end: true },
  { to: "/dashboard/whatsapp/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/dashboard/whatsapp/templates", label: "Templates", icon: FileText },
  { to: "/dashboard/whatsapp/campaigns", label: "Campanhas", icon: Megaphone },
];

export function WhatsAppTabs() {
  const { pathname } = useLocation();
  return (
    <div className="border-b">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {tabs.map(t => {
          const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-[#25D366] text-[#25D366]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
