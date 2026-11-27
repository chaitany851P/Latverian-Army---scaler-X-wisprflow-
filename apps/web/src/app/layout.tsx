import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { enMessages } from "../messages/en";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceKhata — Voice-First Shop Copilot",
  description: "Multilingual voice bookkeeping, khata, and inventory copilot for Indian retailers"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
