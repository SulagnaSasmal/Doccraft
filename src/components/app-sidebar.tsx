"use client";

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
} from "@/components/ui/sidebar";
import {
  FileText,
  FolderOpen,
  Shield,
  BookOpen,
  Layers,
  Settings,
  Zap,
  LayoutDashboard,
} from "lucide-react";

const workspaceItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Document Generator", icon: Zap, href: "/" },
  { title: "Document Library", icon: FolderOpen, href: "/" },
];

const toolsItems = [
  { title: "API Reference", icon: FileText, href: "/" },
  { title: "Compliance Hub", icon: Shield, href: "/" },
  { title: "Learning Academy", icon: BookOpen, href: "/" },
  { title: "SDK Docs", icon: Layers, href: "/" },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-slate-800 bg-slate-950">
      <SidebarHeader className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 text-sm">DocCraft AI</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-widest px-4 py-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors w-full">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-widest px-4 py-2">
            Documentation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors w-full">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800 px-4 py-3">
        <a
          href="/"
          className="flex items-center gap-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
