import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./global.css";

export const metadata: Metadata = {
  title: "BLACK+BLUE",
  description: "Order, track, and pay — right from your table.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BLACK+BLUE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111111",
};

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"]
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "900"]
});

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>{props.children}</body>
    </html>
  );
}
