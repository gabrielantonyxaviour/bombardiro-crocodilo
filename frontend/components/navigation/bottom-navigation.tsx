"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BrainCircuit, BarChart3 } from "lucide-react";

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 z-10">
      <div className="container max-w-md mx-auto h-full"></div>
    </nav>
  );
}
