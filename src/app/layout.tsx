import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DocCraft AI — Intelligent Documentation Generator",
  description: "Transform raw content into polished, structured documentation using AI",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1729" },
  ],
};

// Inline script to set dark class before React hydrates (prevents FOUC)
const themeScript = `(function(){try{var t=localStorage.getItem("doccraft_theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-950 text-slate-50 font-sans">
        <TooltipProvider>
          <SidebarProvider>
            <div className="flex h-screen w-full bg-slate-950 text-slate-50 font-sans overflow-hidden">
              {/* Navigation Sidebar: Workspaces & Documentation */}
              <AppSidebar />

              <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Command Bar */}
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="text-slate-400 hover:text-slate-100" />
                    <div className="h-6 w-px bg-slate-800 mx-1" />
                    <h1 className="text-sm font-medium text-slate-400">
                      Project /{" "}
                      <span className="text-slate-100">DocCraft AI</span>
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* CMD+K Search bar */}
                    <button className="bg-slate-800 text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                      Search Docs...{" "}
                      <kbd className="ml-2 opacity-50">⌘K</kbd>
                    </button>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs select-none">
                      SS
                    </div>
                  </div>
                </header>

                {/* Dynamic Content Area */}
                <section className="flex-1 overflow-y-auto">
                  {children}
                </section>
              </main>

              {/* Right-side Active Intelligence Panel */}
              <aside className="w-80 border-l border-slate-800 bg-slate-900/30 p-4 hidden xl:flex xl:flex-col shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  Document Insights
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <p className="text-xs text-slate-400">Compliance Status</p>
                    <p className="text-sm font-medium mt-1 text-yellow-500 italic">
                      ● Needs Verification (FEMA)
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <p className="text-xs text-slate-400">Active Documents</p>
                    <p className="text-sm font-medium mt-1 text-slate-200">—</p>
                  </div>
                </div>
              </aside>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
