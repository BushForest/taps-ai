import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"]
});

export const metadata = {
  title: "TAPs Ops — Admin",
  description: "TAPs Eats restaurant operations dashboard"
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{props.children}</body>
    </html>
  );
}
