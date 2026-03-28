"use client";

import Link from "next/link";
import {
  FileText,
  LayoutDashboard,
  ShieldCheck,
  FileCode,
  Hammer,
  Search,
  Settings,
  ChevronRight,
  PlusCircle,
  BookOpen,
  HelpCircle,
  Wrench,
  Tag,
  Workflow,
  Layers,
  ScanText,
  Scissors,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

// ── Real doccraft-help-center file structure ─────────────────────────────────
const workspaces = [
  {
    title: "Getting Started",
    url: "/workspace?file=getting-started.html",
    icon: BookOpen,
    badge: "Guide",
    badgeColor: "text-blue-400",
  },
  {
    title: "Workflow Guides",
    url: "/workspace?file=workflows.html",
    icon: Workflow,
    badge: "Guide",
    badgeColor: "text-blue-400",
  },
  {
    title: "Generating Docs",
    url: "/workspace?file=feature-generate.html",
    icon: FileText,
    badge: "Feature",
    badgeColor: "text-purple-400",
  },
  {
    title: "UI Reference",
    url: "/workspace?file=ui-reference.html",
    icon: FileCode,
    badge: "Ref",
    badgeColor: "text-cyan-400",
  },
  {
    title: "FAQ",
    url: "/workspace?file=faq.html",
    icon: HelpCircle,
    badge: "Support",
    badgeColor: "text-yellow-400",
  },
  {
    title: "Troubleshooting",
    url: "/workspace?file=troubleshooting.html",
    icon: Wrench,
    badge: "Support",
    badgeColor: "text-yellow-400",
  },
  {
    title: "Release Notes",
    url: "/workspace?file=release-notes.html",
    icon: Tag,
    badge: "Ref",
    badgeColor: "text-cyan-400",
  },
];

// ── Processing Engine — linked to real routes ─────────────────────────────────
const toolkit = [
  { title: "PDF Atomicizer", url: "/split", icon: Scissors, accent: "text-blue-400" },
  { title: "Structure Merge", url: "/merge", icon: Layers, accent: "text-purple-400" },
  { title: "OCR Ingestion", url: "/ocr", icon: ScanText, accent: "text-emerald-400" },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-slate-800 bg-transparent">
      {/* ── Brand header ── */}
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-sm">
            D
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-100">DocCraft OS</h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Architect Edition
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {/* ── Overview ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/" aria-label="Command Center" />}
                  className="hover:bg-slate-900 text-slate-300 hover:text-white transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="font-medium text-sm">Command Center</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Workspaces — real doccraft-help-center files ── */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-2">
            <SidebarGroupLabel className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Help Center Docs
            </SidebarGroupLabel>
            <Link href="/workspace?file=index.html" title="Browse all docs">
              <PlusCircle className="w-3 h-3 text-slate-600 hover:text-blue-500 cursor-pointer transition-colors" />
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaces.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} aria-label={item.title} />}
                    className="group hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
                  >
                    <item.icon className="w-4 h-4 opacity-70 group-hover:text-blue-400 shrink-0" />
                    <span className="text-sm flex-1">{item.title}</span>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Processing Engine — real route links ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
            Processing Engine
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {toolkit.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} aria-label={item.title} />}
                    className="hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg transition-all"
                  >
                    <item.icon className={`w-4 h-4 ${item.accent}`} />
                    <span className="text-sm font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Recent Activity ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
            Recent Activity
          </SidebarGroupLabel>
          <div className="px-4 py-2 space-y-3">
            <div className="flex items-start gap-2 border-l border-slate-800 pl-3">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <div>
                <p className="text-[11px] text-slate-300 font-medium">Help Center Opened</p>
                <p className="text-[9px] text-slate-500">Ready to browse</p>
              </div>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer / User ── */}
      <SidebarFooter className="p-4 border-t border-slate-900 bg-slate-950/50">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer group">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-blue-500/50 transition-colors shrink-0">
            <span className="text-[10px] font-bold text-slate-300">SS</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Sulagna Sasmal</p>
            <p className="text-[10px] text-slate-500 truncate italic leading-tight">
              Sr. Technical Writer
            </p>
          </div>
          <Settings className="w-4 h-4 text-slate-600 group-hover:text-slate-300 shrink-0" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
