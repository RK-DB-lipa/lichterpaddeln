import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Getränkewagen Kasse",
  description: "Schnellkasse für Getränkewagen – einfach Getränke antippen und bestellen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-900 text-white antialiased select-none">
        {children}
      </body>
    </html>
  );
}
