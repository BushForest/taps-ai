import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TAPs Eats",
  description: "NFC-powered table ordering for modern restaurants.",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
