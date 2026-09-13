import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ekip Konum Takibi",
  description:
    "Rıza temelli ekip konum takibi uygulaması. Yalnızca konum paylaşımına açıkça izin veren ekip üyelerinin konumunu gösterir.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}