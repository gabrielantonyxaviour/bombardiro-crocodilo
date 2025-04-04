"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  };
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
        settleStatus: "completed",
      },
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
        settleStatus: "completed",
      },
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
        settleStatus: "pending",
      },
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
        settleStatus: "not_required",
      },
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<CrossChainOrder | null>(
    null
  );
  const [dialogTab, setDialogTab] = useState("destination");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-yellow-500" />;
      case "failed":
        return <XCircle size={16} className="text-red-500" />;
      case "not_required":
        return <CheckCircle2 size={16} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight size={16} className="text-red-400" />;
      case "receive":
        return <ArrowDownLeft size={16} className="text-green-400" />;
      case "swap":
        return <ArrowLeftRight size={16} className="text-purple-400" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shortenHash = (hash: string) => {
    if (hash.length <= 14) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const getChainExplorer = (chain: string, hash: string) => {
    const explorers: Record<string, string> = {
      Ethereum: "https://etherscan.io",
      Arbitrum: "https://arbiscan.io",
      Optimism: "https://optimistic.etherscan.io",
      Polygon: "https://polygonscan.com",
      Avalanche: "https://snowtrace.io",
      Worldchain: "https://explorer.worldchain.example", // Placeholder
    };

    const baseUrl = explorers[chain] || "https://etherscan.io";
    return `${baseUrl}/tx/${hash}`;
  };

  return (
    <>
      <div
        className="custom-scrollbar overflow-y-auto space-y-3 touch-pan-y sen"
        style={{ maxHeight: "calc(100vh - 130px)" }}
      ></div>
    </>
  );
}
