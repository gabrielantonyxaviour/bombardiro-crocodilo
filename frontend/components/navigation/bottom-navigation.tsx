"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BrainCircuit, BarChart3 } from "lucide-react"

export default function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 z-10">
      <div className="container max-w-md mx-auto h-full">
        <ul className="flex justify-around items-center h-full">
          <li>
            <Link
              href="/chat"
              className={`flex flex-col items-center justify-center h-full w-20 ${pathname === "/chat" ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <BrainCircuit size={24} />
              <span className="text-xs mt-1">AI</span>
            </Link>
          </li>
          <li>
            <Link
              href="/home"
              className={`flex flex-col items-center justify-center h-full w-20 ${pathname === "/home" ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <Home size={24} />
              <span className="text-xs mt-1">Home</span>
            </Link>
          </li>
          <li>
            <Link
              href="/orders"
              className={`flex flex-col items-center justify-center h-full w-20 ${pathname === "/orders" ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <BarChart3 size={24} />
              <span className="text-xs mt-1">Orders</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

