import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, CalendarDays, FileText, FolderArchive, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Documentos", url: "/documentos", icon: FolderArchive },
] as const;

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1">
              <div className="h-7 w-7 shrink-0 rounded-md bg-[image:var(--gradient-primary)]" />
              <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                ServiçoPro
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium capitalize">
              {items.find((i) => i.url === pathname)?.title ?? ""}
            </span>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
