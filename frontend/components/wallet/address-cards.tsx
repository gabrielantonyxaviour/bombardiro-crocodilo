"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AddressCards() {
  const [copied, setCopied] = useState(false)
  const smartAccountAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
  const totalBalance = "$12,456.78"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="mb-6">
      {/* Single row with EVM account (left) and balance (right) */}
      <div className="flex justify-between items-center">
        {/* Left side - EVM Account */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-muted-foreground mb-1">EVM Account</span>
          <div className="flex items-center">
            <p className="text-base text-foreground">{formatAddress(smartAccountAddress)}</p>
            <Button
              onClick={() => copyToClipboard(smartAccountAddress)}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
            >
              {copied ? <Check size={6} /> : <Copy size={6} />}
            </Button>
          </div>
        </div>

        {/* Right side - Balance */}
        <div className="text-right">
          <h2 className="text-sm font-semibold text-muted-foreground mb-1">Total Balance</h2>
          <p className="text-lg font-semibold text-foreground">{totalBalance}</p>
        </div>
      </div>
    </div>
  )
}