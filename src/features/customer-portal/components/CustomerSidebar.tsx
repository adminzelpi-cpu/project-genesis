import { NavLink, useNavigate } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  CreditCard,
  Heart,
  X,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useMemo } from "react";
import { useCustomerAuth } from "@/features/auth";

export function CustomerSidebar() {
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const { customer, logout } = useCustomerAuth();

  const userEmail = customer?.email ?? "";
  const userName = customer?.nome || "Cliente";

  // Build base path using buildPath for subdomain compatibility
  const basePath = buildPath("/customer");

  const menuItems = useMemo(() => [
    { title: "Dashboard", url: basePath, icon: LayoutDashboard },
    { title: "Meus Pedidos", url: `${basePath}/orders`, icon: Package },
    { title: "Meus Dados", url: `${basePath}/profile`, icon: User },
    { title: "Endereços", url: `${basePath}/addresses`, icon: MapPin },
    
    { title: "Favoritos", url: `${basePath}/favorites`, icon: Heart },
  ], [basePath]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logout realizado!");
    if (storeSlug) {
      navigate(buildPath("/"));
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {userName}
              </span>
              <span className="text-xs text-sidebar-foreground/60">{userEmail}</span>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpenMobile(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Minha Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
        <div className="text-xs text-sidebar-foreground/50 px-3 mt-2">
          Área do Cliente v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
