import { 
  Home, 
  ShoppingCart, 
  Tag, 
  Users, 
  Megaphone, 
  Palette, 
  Truck, 
  CreditCard, 
  Settings,
  ShoppingBag,
  BarChart3,
  Zap,
  FlaskConical,
  ChevronDown,
  Mail,
  Ticket,
  Store,
  FileText,
  Menu,
  ExternalLink,
  Package,
  AlertCircle,
  Volume2,
  Ruler,
  Shield,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  Bot
} from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMeta, faGoogle, faTiktok, faPinterest } from "@fortawesome/free-brands-svg-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import logoZelpi from "@/assets/logo-zelpi-header.png";


const mainItems = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
];

const orderSubmenuItems = [
  { title: "Todos os Pedidos", url: "/dashboard/orders" },
  { title: "Carrinhos Abandonados", url: "/dashboard/orders/abandoned" },
];

import { ImageIcon } from "lucide-react";

const productSubmenuItems = [
  { title: "Todos os Produtos", url: "/dashboard/products" },
  { title: "Categorias", url: "/dashboard/categories" },
  { title: "Atributos", url: "/dashboard/attributes" },
  { title: "Guias de Medidas", url: "/dashboard/size-guides" },
];

import { Target, Link2 } from "lucide-react";

const marketingItems = [
  { title: "WhatsApp", url: "/dashboard/whatsapp", icon: WhatsAppIcon },
  { title: "Chat Inteligente", url: "/dashboard/marketing/chat", icon: Bot },
  { title: "Pixels e Tracking", url: "/dashboard/marketing/pixels", icon: Target },
  { title: "Feeds de Catálogo", url: "/dashboard/marketing/feeds", icon: Megaphone },
  { title: "Newsletter", url: "/dashboard/marketing/newsletter", icon: Mail },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
];

const integrationSubItems: any[] = [];

const storeOnlineSubmenuItems = [
  { title: "Página Inicial", url: "/dashboard/store/home", icon: Home },
  { title: "Temas", url: "/dashboard/store/themes", icon: Palette },
  { title: "Barra de Anúncios", url: "/dashboard/store/announcements", icon: Volume2 },
  { title: "Páginas", url: "/dashboard/store/pages", icon: FileText },
  { title: "Menus", url: "/dashboard/store/menus", icon: Menu },
  { title: "Mídia", url: "/dashboard/media", icon: ImageIcon },
];

const storeItems = [
  { title: "Entrega e Frete", url: "/dashboard/settings/shipping", icon: Truck },
  { title: "Pagamentos", url: "/dashboard/settings/payments", icon: CreditCard },
];


const settingsItems = [
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const { isAdmin } = useIsAdmin();

  const isProductsActive = location.pathname.startsWith("/dashboard/products") || 
                           location.pathname.startsWith("/dashboard/categories") ||
                           location.pathname.startsWith("/dashboard/attributes") ||
                           location.pathname.startsWith("/dashboard/size-guides");

  const isOrdersActive = location.pathname.startsWith("/dashboard/orders");

  const isStoreOnlineActive = location.pathname.startsWith("/dashboard/store/") || location.pathname.startsWith("/dashboard/media");
  const isIntegrationsActive = location.pathname.startsWith("/dashboard/integrations") || location.pathname.startsWith("/dashboard/channels/");

  const [productsSubmenuOpen, setProductsSubmenuOpen] = useState(isProductsActive);
  const [ordersSubmenuOpen, setOrdersSubmenuOpen] = useState(isOrdersActive);
  const [storeOnlineSubmenuOpen, setStoreOnlineSubmenuOpen] = useState(isStoreOnlineActive);
  const [integrationsSubmenuOpen, setIntegrationsSubmenuOpen] = useState(isIntegrationsActive);

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    return isActive
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
      : "hover:bg-muted/50";
  };

  const handleProductsClick = () => {
    setProductsSubmenuOpen(!productsSubmenuOpen);
  };

  const handleOrdersClick = () => {
    setOrdersSubmenuOpen(!ordersSubmenuOpen);
  };

  const handleStoreOnlineClick = () => {
    setStoreOnlineSubmenuOpen(!storeOnlineSubmenuOpen);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">Z</span>
              </div>
            ) : (
              <img
                src={logoZelpi}
                alt="Zelpi"
                className="h-8 w-auto max-w-[170px] object-contain"
              />
            )}
          </div>
        </div>

        {/* Main Navigation - Gestão */}
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Produtos com submenu colapsável */}
              <Collapsible open={productsSubmenuOpen} onOpenChange={setProductsSubmenuOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      onClick={handleProductsClick}
                      className={isProductsActive ? "bg-primary/10 text-primary font-medium" : ""}
                    >
                      <Tag className="h-4 w-4" />
                      {!collapsed && <span>Produtos</span>}
                      {!collapsed && (
                        <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${productsSubmenuOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {productSubmenuItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={item.url} className={getNavClass(item.url)}>
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              {/* Pedidos com submenu colapsável */}
              <Collapsible open={ordersSubmenuOpen} onOpenChange={setOrdersSubmenuOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      onClick={handleOrdersClick}
                      className={isOrdersActive ? "bg-primary/10 text-primary font-medium" : ""}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {!collapsed && <span>Pedidos</span>}
                      {!collapsed && (
                        <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${ordersSubmenuOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {orderSubmenuItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={item.url} className={getNavClass(item.url)}>
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Marketing */}
        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Loja online - Submenu colapsável */}
        <SidebarGroup>
          <SidebarGroupLabel>Canais de venda</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={storeOnlineSubmenuOpen} onOpenChange={setStoreOnlineSubmenuOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      onClick={handleStoreOnlineClick}
                      className={isStoreOnlineActive ? "bg-primary/10 text-primary font-medium" : ""}
                    >
                      <Store className="h-4 w-4" />
                      {!collapsed && <span>Loja online</span>}
                      {!collapsed && (
                        <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${storeOnlineSubmenuOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {storeOnlineSubmenuItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={item.url} className={getNavClass(item.url)}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Loja - Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel>Loja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {storeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
              <NavLink to={item.url} className={`${getNavClass(item.url)} flex items-center justify-between`}>
                   <span className="flex items-center gap-2">
                     <item.icon className="h-4 w-4" />
                     {!collapsed && <span>{item.title}</span>}
                   </span>
                   {!collapsed && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                 </NavLink>
               </SidebarMenuButton>
             </SidebarMenuItem>
           ))}
           {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/dashboard/internal/admin" className={getNavClass("/dashboard/internal/admin")}>
                  <Shield className="h-4 w-4" />
                  {!collapsed && <span>Painel Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
