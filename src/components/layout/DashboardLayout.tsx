import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import logoZelpi from "@/assets/logo-zelpi-header.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  
  // Check if we're in settings routes to show settings sidebar instead of main sidebar
  const isSettingsRoute = location.pathname.startsWith('/dashboard/settings');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {isSettingsRoute ? <SettingsSidebar /> : <AppSidebar />}
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Merchant</p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut}
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
