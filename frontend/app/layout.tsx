import "./globals.css"

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import BottomNavigation from "@/components/navigation/bottom-navigation"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Multi-Chain Crypto Wallet",
  description: "A mobile-first cryptocurrency wallet with multi-chain support",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="max-h-screen overflow-hidden sen">
            {children}
            <BottomNavigation />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

