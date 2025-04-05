"use client";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import WorldcoinAddressButton from "./wallet/worldcoin-address-button";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-10">
      <div className="container max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
            <Image
              src="/intents.png"
              alt="Worldcoin Logo"
              width={24}
              height={24}
              className="rounded-full"
            />
          </div>
          <h1 className="text-xl font-bold text-foreground">World-7683</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            className="text-sm text-foreground hover:text-primary focus:outline-none"
            onClick={() => (window as any).toggleEruda()}
          >
            <Settings className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          </Button>
          <ThemeToggle />
          <WorldcoinAddressButton />
        </div>
      </div>
    </header>
  );
}
