"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { assetImageMapping } from "@/lib/constants"

interface Asset {
  id: string
  name: string
  symbol: string
  balance: string
  value: number
  valueFormatted: string
  chains: {
    id: number
    name: string
    balance: string
  }[]
}

interface NFT {
  id: string
  name: string
  collection: string
  image: string
  value: number
  valueFormatted: string
  chain: string
}

export default function AssetTabs() {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

  const [coins] = useState<Asset[]>([
    {
      id: "1",
      name: "Ethereum",
      symbol: "ETH",
      balance: "2.15",
      value: 4350,
      valueFormatted: "$4,350.00",
      chains: [
        { id: 1, name: "Ethereum", balance: "0.75 ETH" },
        { id: 480, name: "Worldchain", balance: "0.70 ETH" },
        { id: 10, name: "Optimism", balance: "0.70 ETH" },
      ],
    },
    {
      id: "2",
      name: "USD Coin",
      symbol: "USDC",
      balance: "3,250.75",
      value: 3250.75,
      valueFormatted: "$3,250.75",
      chains: [
        { id: 1, name: "Ethereum", balance: "1,250.25 USDC" },
        { id: 42161, name: "Arbitrum", balance: "1,000.50 USDC" },
        { id: 480, name: "Worldchain", balance: "1,000.00 USDC" },
      ],
    },
    {
      id: "3",
      name: "Worldcoin",
      symbol: "WLD",
      balance: "750.5",
      value: 1875.25,
      valueFormatted: "$1,875.25",
      chains: [
        { id: 480, name: "Worldchain", balance: "750.5 WLD" }
      ],
    },
    {
      id: "4",
      name: "Polygon",
      symbol: "POL",
      balance: "1250.75",
      value: 1125.68,
      valueFormatted: "$1,125.68",
      chains: [
        { id: 1, name: "Ethereum", balance: "950.5 POL" },
        { id: 8453, name: "Base", balance: "300.25 POL" },
        { id: 137, name: "Polygon", balance: "0 POL" },
      ],
    },
    {
      id: "5",
      name: "Avalanche",
      symbol: "AVAX",
      balance: "15.5",
      value: 620,
      valueFormatted: "$620.00",
      chains: [
        { id: 43114, name: "Avalanche", balance: "15.5 AVAX" },
      ],
    },
    {
      id: "6",
      name: "Dai",
      symbol: "DAI",
      balance: "1580.42",
      value: 1580.42,
      valueFormatted: "$1,580.42",
      chains: [
        { id: 1, name: "Ethereum", balance: "800.25 DAI" },
        { id: 42161, name: "Arbitrum", balance: "500.17 DAI" },
        { id: 8453, name: "Base", balance: "280.00 DAI" },
      ],
    },
    {
      id: "13",
      name: "Optimism",
      symbol: "OP",
      balance: "325.5",
      value: 683.55,
      valueFormatted: "$683.55",
      chains: [
        { id: 10, name: "Optimism", balance: "325.5 OP" },
      ],
    },
    {
      id: "14",
      name: "Arbitrum",
      symbol: "ARB",
      balance: "550",
      value: 577.5,
      valueFormatted: "$577.50",
      chains: [
        { id: 42161, name: "Arbitrum", balance: "550 ARB" },
      ],
    },
  ])

  const [nfts] = useState<NFT[]>([
    {
      id: "1",
      name: "Bored Ape #1234",
      collection: "Bored Ape Yacht Club",
      image: "/placeholder.svg?height=200&width=200&text=BAYC",
      value: 45000,
      valueFormatted: "$45,000.00",
      chain: "Ethereum",
    },
    {
      id: "2",
      name: "World ID #5678",
      collection: "World ID",
      image: "/placeholder.svg?height=200&width=200&text=WID",
      value: 2500,
      valueFormatted: "$2,500.00",
      chain: "Worldchain",
    },
  ])

  // Sort assets by value (highest first)
  const sortedCoins = [...coins].sort((a, b) => b.value - a.value)
  const sortedNFTs = [...nfts].sort((a, b) => b.value - a.value)

  const toggleAssetExpand = (assetId: string) => {
    if (expandedAsset === assetId) {
      setExpandedAsset(null)
    } else {
      setExpandedAsset(assetId)
    }
  }

  const getChainColor = (chain: string) => {
    const colors: Record<string, string> = {
      Ethereum: "bg-blue-500",
      Arbitrum: "bg-blue-700",
      Worldchain: "bg-purple-600",
      Bitcoin: "bg-orange-500",
    }
    return colors[chain] || "bg-zinc-500"
  }

  return (
    <Tabs defaultValue="coins" className="mb-2 mt-4 h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
        <TabsTrigger value="coins" className="dark:data-[state=active]:bg-black/70">Coins</TabsTrigger>
        <TabsTrigger value="nfts" className="dark:data-[state=active]:bg-black/70">NFTs</TabsTrigger>
      </TabsList>

      <div className="custom-scrollbar overflow-y-auto flex-1 touch-pan-y">
        <TabsContent value="coins" className="space-y-3 pb-4">
          {sortedCoins.map((asset) => (
            <div key={asset.id} className="bg-card rounded-xl overflow-hidden border border-border">
              <div
                className="p-4 flex items-center cursor-pointer"
                onClick={() => asset.chains.length > 1 && toggleAssetExpand(asset.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
                  <Image
                    src={assetImageMapping[asset.symbol.toLowerCase()]}
                    alt={asset.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">{asset.name}</span>
                    <span className="font-medium text-foreground">{asset.valueFormatted}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="flex space-x-1">
                      {asset.chains.length > 1 ? (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{asset.chains.length} chains</span>
                          {expandedAsset === asset.id ? (
                            <ChevronUp size={14} className="ml-1" />
                          ) : (
                            <ChevronDown size={14} className="ml-1" />
                          )}
                        </div>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getChainColor(asset.chains[0].name)} text-white`}
                        >
                          {asset.chains[0].name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {asset.balance} {asset.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {asset.chains.length > 1 && expandedAsset === asset.id && (
                <div className="bg-muted p-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Chain Distribution</p>
                  <div className="space-y-2">
                    {asset.chains.map((chain) => (
                      <div key={`${asset.id}-${chain.name}`} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full ${getChainColor(chain.name)} mr-2`}></span>
                          <span className="text-sm text-foreground">{chain.name}</span>
                        </div>
                        <span className="text-sm text-foreground">{chain.balance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="nfts" className="grid grid-cols-2 gap-3 pb-4">
          {sortedNFTs.map((nft) => (
            <div key={nft.id} className="bg-card rounded-xl overflow-hidden border border-border">
              <div className="aspect-square relative">
                <Image src={nft.image || "/placeholder.svg"} alt={nft.name} fill className="object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getChainColor(nft.chain)} text-white inline-block`}
                  >
                    {nft.chain}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-foreground truncate">{nft.name}</h3>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{nft.collection}</span>
                  <span className="text-xs font-medium text-foreground">{nft.valueFormatted}</span>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </div>
    </Tabs>
  )
}