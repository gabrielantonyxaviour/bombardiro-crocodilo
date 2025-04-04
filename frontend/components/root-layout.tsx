'use client'
import { usePathname } from "next/navigation"
import BottomNavigation from "./navigation/bottom-navigation"

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isHomePage = pathname === "/"

    return (
        <div className="max-h-screen overflow-hidden sen">
            {children}
            {!isHomePage && <BottomNavigation />}
        </div>
    )
}