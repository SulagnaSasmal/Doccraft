import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-surface-1 text-ink-0 font-sans transition-colors duration-200">{children}</body>
    </html>
  );
}
