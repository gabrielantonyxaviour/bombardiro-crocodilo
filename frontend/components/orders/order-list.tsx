"use client"

import { useState } from "react"
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ExternalLink,
  Layers
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface CrossChainOrder {
  id: string;
  type: "send" | "receive" | "swap" | "other";
  description: string;
  amount: string;
  token: string;
  destinationToken?: string;
  destinationAmount?: string;
  status: "completed" | "pending" | "failed";
  timestamp: Date;
  destinationChain: string;
  hash: string;
  // ERC-7683 specific fields
  erc7683: {
    originChain: string; // Usually Worldchain
    openTxHash: string;
    fillTxHash: string;
    settleTxHash?: string;
    openStatus: "completed" | "pending" | "failed";
    fillStatus: "completed" | "pending" | "failed";
    settleStatus: "completed" | "pending" | "failed" | "not_required";
  }
}

export default function OrderList() {
  const [transactions] = useState<CrossChainOrder[]>([
    {
      id: "1",
      type: "send",
      description: "Sent ETH to 0x71C7...976F",
      amount: "0.5",
      token: "ETH",
      status: "completed",
      timestamp: new Date(Date.now() - 3600000),
      destinationChain: "Arbitrum",
      hash: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199...",
      erc7683: {
        originChain: "Worldchain",
        openTxHash: "0xa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...",
        fillTxHash: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199...",
        settleTxHash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t...",
        openStatus: "completed",
        fillStatus: "completed",
        settleStatus: "completed"
      }
    },
    {
      id: "2",
      type: "swap",
      description: "Swapped USDC for ETH",
      amount: "250",
      token: "USDC",
      destinationToken: "ETH",
      destinationAmount: "0.12",
      status: "completed",
      timestamp: new Date(Date.now() - 86400000),
      destinationChain: "Optimism",
      hash: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F...",
      erc7683: {
        originChain: "Worldchain",
        openTxHash: "0xb2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1...",
        fillTxHash: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F...",
        settleTxHash: "0x2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t...",
        openStatus: "completed",
        fillStatus: "completed",
        settleStatus: "completed"
      }
    },
    {
      id: "3",
      type: "send",
      description: "Sent AVAX to 0x8626...1199",
      amount: "5",
      token: "AVAX",
      status: "pending",
      timestamp: new Date(Date.now() - 7200000),
      destinationChain: "Avalanche",
      hash: "0x3a1b2c3d4e5f...",
      erc7683: {
        originChain: "Worldchain",
        openTxHash: "0xc3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2...",
        fillTxHash: "0x3a1b2c3d4e5f...",
        openStatus: "completed",
        fillStatus: "pending",
        settleStatus: "pending"
      }
    },
    {
      id: "4",
      type: "swap",
      description: "Swapped ETH for MATIC",
      amount: "0.2",
      token: "ETH",
      destinationToken: "MATIC",
      destinationAmount: "360",
      status: "failed",
      timestamp: new Date(Date.now() - 172800000),
      destinationChain: "Polygon",
      hash: "0x9a8b7c6d5e...",
      erc7683: {
        originChain: "Worldchain",
        openTxHash: "0xd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3...",
        fillTxHash: "0x9a8b7c6d5e...",
        openStatus: "completed",
        fillStatus: "failed",
        settleStatus: "not_required"
      }
    },
  ])

  const [selectedOrder, setSelectedOrder] = useState<CrossChainOrder | null>(null)
  const [dialogTab, setDialogTab] = useState("destination")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-green-500" />
      case "pending":
        return <Clock size={16} className="text-yellow-500" />
      case "failed":
        return <XCircle size={16} className="text-red-500" />
      case "not_required":
        return <CheckCircle2 size={16} className="text-gray-400" />
      default:
        return null
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight size={16} className="text-red-400" />
      case "receive":
        return <ArrowDownLeft size={16} className="text-green-400" />
      case "swap":
        return <ArrowLeftRight size={16} className="text-purple-400" />
      default:
        return null
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const shortenHash = (hash: string) => {
    if (hash.length <= 14) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  }

  const getChainExplorer = (chain: string, hash: string) => {
    const explorers: Record<string, string> = {
      "Ethereum": "https://etherscan.io",
      "Arbitrum": "https://arbiscan.io",
      "Optimism": "https://optimistic.etherscan.io",
      "Polygon": "https://polygonscan.com",
      "Avalanche": "https://snowtrace.io",
      "Worldchain": "https://explorer.worldchain.example", // Placeholder
    };

    const baseUrl = explorers[chain] || "https://etherscan.io";
    return `${baseUrl}/tx/${hash}`;
  }

  return (
    <>
      <div className="custom-scrollbar overflow-y-auto space-y-3 touch-pan-y sen" style={{ maxHeight: "calc(100vh - 130px)" }}>
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-card rounded-xl p-4 flex items-center cursor-pointer hover:bg-muted transition-colors border border-border"
            onClick={() => setSelectedOrder(transaction)}
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3">
              {getTypeIcon(transaction.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">{transaction.description}</span>
                <div className="flex items-center">
                  {getStatusIcon(transaction.status)}
                  <ChevronRight size={16} className="ml-1 text-muted-foreground" />
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground mr-1">{transaction.destinationChain}</span>
                </span>
                <div className="flex items-center">
                  <span className="text-sm mr-2 text-foreground">
                    {transaction.type === "receive" ? "+" : "-"}
                    {transaction.amount} {transaction.token}
                    {transaction.destinationToken && ` → ${transaction.destinationAmount} ${transaction.destinationToken}`}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(transaction.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="mr-2">Order Details</span>
              {selectedOrder && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${selectedOrder.status === "completed" ? "bg-green-100 text-green-800" :
                  selectedOrder.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                  {selectedOrder.status}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="destination" value={dialogTab} onValueChange={setDialogTab} className="sen">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="destination" className="dark:data-[state=active]:bg-black/70">Destination Chain</TabsTrigger>
                <TabsTrigger value="cross-chain" className="dark:data-[state=active]:bg-black/70">Cross-Chain Details</TabsTrigger>
              </TabsList>

              {/* Destination Chain Tab - Shows transaction as if it happened directly on the destination chain */}
              <TabsContent value="destination" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2">
                      {getTypeIcon(selectedOrder.type)}
                    </div>
                    <span className="font-medium">{selectedOrder.description}</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Chain</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">{selectedOrder.destinationChain}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span>
                      {selectedOrder.amount} {selectedOrder.token}
                      {selectedOrder.destinationToken && ` → ${selectedOrder.destinationAmount} ${selectedOrder.destinationToken}`}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span>{formatDate(selectedOrder.timestamp)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transaction Hash</span>
                    <div className="flex items-center">
                      <span className="text-xs font-mono truncate max-w-[120px]">{shortenHash(selectedOrder.hash)}</span>
                      <a
                        href={getChainExplorer(selectedOrder.destinationChain, selectedOrder.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} className="ml-1 text-primary" />
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  className="text-xs text-primary hover:underline flex items-center justify-center w-full mt-2"
                  onClick={() => setDialogTab("cross-chain")}
                >
                  <Layers size={12} className="mr-1" />
                  View cross-chain details
                </button>
              </TabsContent>

              {/* Cross-Chain Details Tab - Shows ERC-7683 details */}
              <TabsContent value="cross-chain" className="space-y-4">
                <div className="flex items-center mb-2">
                  <Layers size={18} className="mr-2 text-primary" />
                  <span className="text-sm font-medium">ERC-7683 Cross-Chain Flow</span>
                </div>

                <div className="space-y-2">
                  {/* Open Transaction */}
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">1. Open Order</span>
                      {getStatusIcon(selectedOrder.erc7683.openStatus)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{selectedOrder.erc7683.originChain}</span>
                      <div className="flex items-center">
                        <span className="text-xs font-mono truncate max-w-[120px]">{shortenHash(selectedOrder.erc7683.openTxHash)}</span>
                        <a
                          href={getChainExplorer(selectedOrder.erc7683.originChain, selectedOrder.erc7683.openTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={12} className="ml-1 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Fill Transaction */}
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">2. Fill Order</span>
                      {getStatusIcon(selectedOrder.erc7683.fillStatus)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{selectedOrder.destinationChain}</span>
                      <div className="flex items-center">
                        <span className="text-xs font-mono truncate max-w-[120px]">{shortenHash(selectedOrder.erc7683.fillTxHash)}</span>
                        <a
                          href={getChainExplorer(selectedOrder.destinationChain, selectedOrder.erc7683.fillTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={12} className="ml-1 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Settle Transaction */}
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">3. Settle Order</span>
                      {getStatusIcon(selectedOrder.erc7683.settleStatus)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{selectedOrder.erc7683.originChain}</span>
                      <div className="flex items-center">
                        {selectedOrder.erc7683.settleTxHash ? (
                          <>
                            <span className="text-xs font-mono truncate max-w-[120px]">{shortenHash(selectedOrder.erc7683.settleTxHash)}</span>
                            <a
                              href={getChainExplorer(selectedOrder.erc7683.originChain, selectedOrder.erc7683.settleTxHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={12} className="ml-1 text-primary" />
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {selectedOrder.erc7683.settleStatus === "not_required" ? "Not required" : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    This transaction was initiated on {selectedOrder.erc7683.originChain} using the ERC-7683 standard,
                    which enables cross-chain transactions with a seamless user experience. The transaction appears as if it was
                    executed directly on {selectedOrder.destinationChain}, but behind the scenes it follows the ERC-7683 flow.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}