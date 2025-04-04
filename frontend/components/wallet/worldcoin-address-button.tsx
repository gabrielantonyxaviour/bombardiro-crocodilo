"use client";

import { useState } from "react";
import { Copy, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { MiniKit } from "@worldcoin/minikit-js";
import { useEnvironmentStore } from "../providers/context";

export default function WorldcoinAddressButton() {
  const [copied, setCopied] = useState(false);
  const { worldAddress } = useEnvironmentStore((store) => store);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild className="sen">
        <Button variant="outline" size="icon" className="rounded-full">
          <Image
            src="/chains/world.png"
            width={24}
            height={24}
            alt="Worldchain"
            className="rounded-full"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sen border-border">
        <DialogHeader>
          <DialogTitle>World Wallet</DialogTitle>
        </DialogHeader>

        {/* Username Section */}
        <div className="flex flex-col space-y-3">
          {MiniKit.user?.profilePictureUrl && (
            <div className="flex flex-col space-y-1">
              <Image
                src={MiniKit.user?.profilePictureUrl}
                width={24}
                height={24}
                alt="Worldchain"
                className="rounded-full"
              />
            </div>
          )}
          <div className="flex flex-col space-y-1 ">
            <div className="flex justify-between items-center ">
              <span className="text-sm text-muted-foreground">Username</span>
            </div>
            <p className="text-sm sen text-foreground ">
              {MiniKit.user?.username || "N/A"}
            </p>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex space-x-1 items-center">
              <span className="text-sm text-muted-foreground">Address</span>
              <Button
                onClick={() => copyToClipboard(worldAddress || "")}
                variant="ghost"
                size="sm"
                className="h-2 text-xs"
              >
                {copied ? (
                  <>
                    <Check size={6} className="mr-1" />
                  </>
                ) : (
                  <>
                    <Copy size={6} className="mr-1" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm sen text-foreground break-all ">
              {worldAddress || ""}
            </p>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center ">
              <span className="text-sm text-muted-foreground">
                Orb Verification
              </span>
            </div>
            <div className="flex items-center">
              <Shield
                size={16}
                className={`mr-2 ${
                  MiniKit.user?.username ? "text-green-500" : "text-red-500"
                }`}
              />
              <p className="text-sm sen text-foreground">
                {MiniKit.user?.username ? "Verified" : "Not Verified"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
