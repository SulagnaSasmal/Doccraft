import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocCraft AI — Intelligent Documentation Generator",
  description: "Transform raw content into polished, structured documentation using AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-surface-1 text-ink-0 font-sans">{children}</body>
    </html>
  );
}
