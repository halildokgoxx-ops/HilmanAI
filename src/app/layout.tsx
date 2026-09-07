import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hilman AI - Profesyonel Yapay Zeka Asistanı",
  description: "Hilman AI kurumsal düzeyde derin muhakeme, kod analizi ve kesintisiz akıllı konuşma platformu.",
  icons: {
    icon: "/hilman-logo.png",
    apple: "/hilman-logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#08090d] text-slate-100 antialiased min-h-screen overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
