"use client"

import Image from "next/image"
import { useState } from "react"

interface Asset {
  id: string
  name: string
  symbol: string
  balance: string
  value: number
  valueFormatted: string
  chains: string[]
}

export default function AssetList() {
  const [assets] = useState<Asset[]>([
    {
      id: "1",
      name: "Ethereum",
      symbol: "ETH",
      balance: "1.45",
      value: 4350,
      valueFormatted: "$4,350.00",
      chains: ["Ethereum", "Worldchain"],
    },
    {
      id: "2",
      name: "USD Coin",
      symbol: "USDC",
      balance: "3,250.75",
      value: 3250.75,
      valueFormatted: "$3,250.75",
      chains: ["Ethereum", "Arbitrum", "Worldchain"],
    },
    {
      id: "3",
      name: "Worldcoin",
      symbol: "WLD",
      balance: "750.5",
      value: 1875.25,
      valueFormatted: "$1,875.25",
      chains: ["Worldchain"],
    },
    {
      id: "4",
      name: "Bitcoin",
      symbol: "BTC",
      balance: "0.05",
      value: 2980.5,
      valueFormatted: "$2,980.50",
      chains: ["Bitcoin", "Worldchain"],
    },
  ])

  // Sort assets by value (highest first)
  const sortedAssets = [...assets].sort((a, b) => b.value - a.value)

  const getChainColor = (chain: string) => {
    const colors: Record<string, string> = {
      Ethereum: "bg-blue-500",
      Arbitrum: "bg-blue-700",
      Worldchain: "bg-purple-600",
      Bitcoin: "bg-orange-500",
    }
    return colors[chain] || "bg-gray-500"
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4">Assets</h2>
      <div className="space-y-3">
        {sortedAssets.map((asset) => (
          <div key={asset.id} className="bg-gray-900 rounded-xl p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mr-3 overflow-hidden">
              <Image
                src={`/placeholder.svg?height=40&width=40&text=${asset.symbol}`}
                alt={asset.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium">{asset.name}</span>
                <span className="font-medium">{asset.valueFormatted}</span>
              </div>
              <div className="flex justify-between mt-1">
                <div className="flex space-x-1">
                  {asset.chains.map((chain) => (
                    <span
                      key={`${asset.id}-${chain}`}
                      className={`text-xs px-2 py-0.5 rounded-full ${getChainColor(chain)} text-white`}
                    >
                      {chain.substring(0, 1)}
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-400">
                  {asset.balance} {asset.symbol}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

