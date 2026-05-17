import {
  Home,
  Store,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Visão Geral", url: "/dashboard/internal/admin", icon: Home },
  { title: "Gestão de Lojas", url: "/dashboard/internal/stores", icon: Store },
  { title: "Monitoramento", url: "/dashboard/internal/monitoring", icon: AlertCircle },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    return isActive
      ? "bg-primary/8 text-primary font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background text-sm font-bold">Z</span>
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-sm font-bold text-foreground">Zelpi Admin</h2>
                <p className="text-[10px] text-muted-foreground">Painel interno</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" className="text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <BarChart3 className="h-4 w-4" />
                    {!collapsed && <span>Dashboard Lojista</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
