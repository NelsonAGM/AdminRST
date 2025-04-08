import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Clipboard,
  Users,
  Wrench,
  Monitor,
  UserCog,
  Settings,
  LogOut,
  Laptop,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { CompanySettings } from "@shared/schema";

interface SidebarProps {
  onLinkClick?: () => void;
}

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}

function SidebarItem({ href, icon, children, onClick }: SidebarItemProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <div className="w-full">
      <Link href={href}>
        <button
          onClick={onClick}
          className={cn(
            "flex items-center py-3 px-4 text-sm text-sidebar-foreground hover:bg-sidebar-primary hover:bg-opacity-30 hover:text-white rounded-md mb-1 transition-colors w-full text-left",
            isActive && "bg-sidebar-primary bg-opacity-30 text-white"
          )}
        >
          <span className="mr-3">{icon}</span>
          <span>{children}</span>
        </button>
      </Link>
    </div>
  );
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const { logoutMutation, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
        if (onLinkClick) onLinkClick();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "No se pudo cerrar la sesión",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <aside className="bg-sidebar-background text-sidebar-foreground w-64 flex flex-col h-screen">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <Laptop className="h-6 w-6 text-secondary mr-2" />
          <h1 className="text-xl font-medium">{companySettings?.name || "Sistemas RST"}</h1>
        </div>
      </div>

      <nav className="mt-4 px-2 flex-1 overflow-y-auto">
        <SidebarItem href="/" icon={<LayoutDashboard className="h-5 w-5" />} onClick={onLinkClick}>
          Panel
        </SidebarItem>
        <SidebarItem href="/orders" icon={<Clipboard className="h-5 w-5" />} onClick={onLinkClick}>
          Órdenes de Servicio
        </SidebarItem>
        <SidebarItem href="/clients" icon={<Users className="h-5 w-5" />} onClick={onLinkClick}>
          Clientes
        </SidebarItem>
        <SidebarItem href="/technicians" icon={<Wrench className="h-5 w-5" />} onClick={onLinkClick}>
          Técnicos
        </SidebarItem>
        <SidebarItem href="/equipment" icon={<Monitor className="h-5 w-5" />} onClick={onLinkClick}>
          Equipos
        </SidebarItem>
        
        {user?.role === "admin" && (
          <>
            <SidebarItem href="/users" icon={<UserCog className="h-5 w-5" />} onClick={onLinkClick}>
              Usuarios
            </SidebarItem>
            <SidebarItem href="/admin" icon={<Settings className="h-5 w-5" />} onClick={onLinkClick}>
              Administración
            </SidebarItem>
          </>
        )}
      </nav>

      <div className="mt-auto p-4">
        <div className="border-t border-sidebar-border pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center py-2 px-4 text-sidebar-foreground hover:bg-destructive hover:bg-opacity-30 hover:text-white rounded-md transition-colors w-full text-left"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
