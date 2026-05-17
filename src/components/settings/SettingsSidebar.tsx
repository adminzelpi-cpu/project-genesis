import { ChevronLeft, Store, Mail, Building2, MapPin, Share2, Truck, FileText, CreditCard, MessageSquare, Bell, Shield, Globe, ImageIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const settingsCategories = [
  {
    label: 'Loja',
    items: [
      { title: 'Informações gerais', path: '/dashboard/settings/general', icon: Store },
      { title: 'Marca', path: '/dashboard/settings/brand', icon: ImageIcon },
      { title: 'Dados da empresa', path: '/dashboard/settings/business', icon: Building2 },
      { title: 'Endereço', path: '/dashboard/settings/address', icon: MapPin },
      { title: 'Redes sociais', path: '/dashboard/settings/social', icon: Share2 },
      { title: 'Domínios', path: '/dashboard/settings/domains', icon: Globe },
    ],
  },
  {
    label: 'Pagamentos e Envios',
    items: [
      { title: 'Meios de pagamento', path: '/dashboard/settings/payments', icon: CreditCard },
      { title: 'Meios de envio', path: '/dashboard/settings/shipping', icon: Truck },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'E-mails automáticos', path: '/dashboard/settings/emails', icon: MessageSquare },
      { title: 'Notificações', path: '/dashboard/settings/notifications', icon: Bell },
    ],
  },
  {
    label: 'Legal',
    items: [
      { title: 'Políticas e termos', path: '/dashboard/settings/policies', icon: FileText },
      { title: 'LGPD / Cookies', path: '/dashboard/settings/lgpd', icon: Shield },
    ],
  },
];

export function SettingsSidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Back to Dashboard Header - Fixed */}
        <div className="p-4 border-b sticky top-0 bg-sidebar z-10">
          <NavLink 
            to="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Configurações</span>
          </NavLink>
        </div>

        {/* Navigation Categories */}
        {settingsCategories.map((category) => (
          <SidebarGroup key={category.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                    >
                      <NavLink to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
