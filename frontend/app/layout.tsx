import "./globals.css";

import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import MiniKitProvider from "@/components/providers/minikit-provider";
import { RootLayoutContent } from "@/components/root-layout";
import { Toaster } from "@/components/ui/sonner";
import { EnvironmentStoreProvider } from "@/components/providers/context";
import { ErudaProvider } from "@/components/providers/eruda";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multi-Chain Crypto Wallet",
  description: "A mobile-first cryptocurrency wallet with multi-chain support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <EnvironmentStoreProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <ErudaProvider>
              <MiniKitProvider>
                <RootLayoutContent>{children}</RootLayoutContent>
                <Toaster position="top-center" />
              </MiniKitProvider>
            </ErudaProvider>
          </ThemeProvider>
        </EnvironmentStoreProvider>
      </body>
    </html>
  );
}
