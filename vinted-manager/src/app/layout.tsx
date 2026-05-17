import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import DashboardLayout from "@/components/DashboardLayout";
import { DiagnosticProvider } from "@/context/DiagnosticContext";
import { DiagnosticConsole } from "@/components/DiagnosticConsole";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vinted Manager | Pilotage & Stock",
  description: "Plateforme centrale de gestion automatisée de commandes Vinted.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DiagnosticProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
          <DiagnosticConsole />
        </DiagnosticProvider>
      </body>
    </html>
  );
}
