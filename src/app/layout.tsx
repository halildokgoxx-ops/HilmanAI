import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HilmanAI — Çok Modlu Yapay Zeka Asistanı",
    template: "%s — HilmanAI",
  },
  description:
    "HilmanAI v1 Beta: Türkçe derin muhakeme, kodlama, görsel analizi, resim ve video üretimi. Güvenli Google girişiyle ücretsiz kullanın.",
  applicationName: "HilmanAI",
  authors: [{ name: "HilmanAI" }],
  keywords: ["HilmanAI", "yapay zeka", "AI asistan", "Türkçe AI", "kodlama", "görsel üretimi", "chatbot"],
  icons: {
    icon: "/hilman-logo.png",
    apple: "/hilman-logo.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "HilmanAI",
    title: "HilmanAI — Çok Modlu Yapay Zeka Asistanı",
    description:
      "Derin muhakeme, kodlama, vision, resim ve video üretimi tek platformda.",
  },
  twitter: {
    card: "summary",
    title: "HilmanAI — Çok Modlu Yapay Zeka Asistanı",
    description:
      "Derin muhakeme, kodlama, vision, resim ve video üretimi tek platformda.",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
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
