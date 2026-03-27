import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocCraft AI — Intelligent Documentation Generator",
  description: "Transform raw content into polished, structured documentation using AI",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1729" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-1 text-ink-0 font-sans transition-colors duration-200">{children}</body>
    </html>
  );
}
