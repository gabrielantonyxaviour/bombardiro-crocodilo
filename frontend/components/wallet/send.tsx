import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, ChevronRight, Copy, ExternalLink, Loader2, X } from "lucide-react"
import { DialogContent, DialogHeader } from "../ui/dialog"
import { DialogTitle } from "@radix-ui/react-dialog"
import { assetImageMapping, chainImageMapping } from "@/lib/constants"
import Image from "next/image"

// Step types for send flow
type SendStep = "recipient" | "chain" | "asset" | "amount" | "summary" | "processing" | "confirmation"

// Chain type
interface Chain {
    id: number
    name: string
}

// Token type
interface Token {
    symbol: string
    name: string
    balance: string
    balanceUsd: string
    priceUsd: number
}

// Remove the async - React function components should not be async
export function SendDialog({ resetFlag, setResetFlag, setDialogOpen }: {
    resetFlag: boolean,
    setResetFlag: Function;
    setDialogOpen: Function
}) {
    const [sendStep, setSendStep] = useState<SendStep>("recipient")
    const [recipient, setRecipient] = useState("")
    const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
    const [selectedAsset, setSelectedAsset] = useState<Token | null>(null)
    const [amount, setAmount] = useState("")
    const [amountInUSD, setAmountInUSD] = useState(true)

    // Memoize these data structures so they don't cause rerenders
    const chains = useCallback(() => [
        { id: 4801, name: "World" },
        { id: 1, name: "Ethereum" },
        { id: 42161, name: "Arbitrum" },
        { id: 10, name: "Optimism" },
        { id: 137, name: "Polygon" },
        { id: 43114, name: "Avalanche" },
    ], [])

    const tokens = useCallback(() => [
        { symbol: "ETH", name: "Ethereum", balance: "1.24", balanceUsd: "3,720", priceUsd: 3000 },
        { symbol: "USDC", name: "USD Coin", balance: "500.00", balanceUsd: "500", priceUsd: 1 },
        { symbol: "USDT", name: "Tether", balance: "250.50", balanceUsd: "250.50", priceUsd: 1 },
        { symbol: "ARB", name: "Arbitrum", balance: "150", balanceUsd: "225", priceUsd: 1.5 },
    ], [])

    const resetSendFlow = useCallback(() => {
        setSendStep("recipient")
        setRecipient("")
        setSelectedChain(null)
        setSelectedAsset(null)
        setAmount("")
        setAmountInUSD(true)
    }, [])

    useEffect(() => {
        if (resetFlag) {
            resetSendFlow()
            setResetFlag(false)
            setDialogOpen(null)
        }
    }, [resetFlag, resetSendFlow, setResetFlag])

    const handleNextStep = useCallback(() => {
        switch (sendStep) {
            case "recipient":
                setSendStep("chain")
                break
            case "chain":
                setSendStep("asset")
                break
            case "asset":
                setSendStep("amount")
                break
            case "amount":
                setSendStep("summary")
                break
            case "summary":
                setSendStep("processing")
                setTimeout(() => {
                    setSendStep("confirmation")
                }, 3000)
                break
        }
    }, [sendStep])

    const handlePreviousStep = useCallback(() => {
        switch (sendStep) {
            case "chain":
                setSendStep("recipient")
                break
            case "asset":
                setSendStep("chain")
                break
            case "amount":
                setSendStep("asset")
                break
            case "summary":
                setSendStep("amount")
                break
        }
    }, [sendStep])

    const isNextDisabled = useCallback(() => {
        switch (sendStep) {
            case "recipient":
                return !recipient || recipient.length < 10
            case "chain":
                return !selectedChain
            case "asset":
                return !selectedAsset
            case "amount":
                return !amount || parseFloat(amount) <= 0
            default:
                return false
        }
    }, [sendStep, recipient, selectedChain, selectedAsset, amount])

    const handleDialogClose = useCallback(() => {
        setDialogOpen(null)
        resetSendFlow()
    }, [setDialogOpen, resetSendFlow])

    const handleRecipientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setRecipient(e.target.value)
    }, [])

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value)
    }, [])

    const handleAmountToggle = useCallback(() => {
        setAmountInUSD(!amountInUSD)
    }, [amountInUSD])

    // Memoized chain selection handler
    const handleChainSelect = useCallback((chain: Chain) => {
        setSelectedChain(chain)
    }, [])

    // Memoized asset selection handler
    const handleAssetSelect = useCallback((asset: Token) => {
        setSelectedAsset(asset)
    }, [])

    // Memoized percentage handlers
    const handlePercentage = useCallback((percentage: number) => {
        if (selectedAsset) {
            if (amountInUSD) {
                setAmount((parseFloat(selectedAsset.balanceUsd.replace(',', '')) * percentage).toString())
            } else {
                setAmount((parseFloat(selectedAsset.balance) * percentage).toString())
            }
        }
    }, [selectedAsset, amountInUSD])

    const renderSendStep = () => {
        const chainsData = chains()
        const tokensData = tokens()

        switch (sendStep) {
            case "recipient":
                return (
                    <div className="space-y-4 py-4">
                        <Label htmlFor="recipient">Recipient Address</Label>
                        <Input
                            id="recipient"
                            placeholder="0x..."
                            value={recipient}
                            onChange={handleRecipientChange}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the full Ethereum address of the recipient
                        </p>
                    </div>
                )

            case "chain":
                return (
                    <div className="space-y-4 py-4">
                        <Label>Select Chain</Label>
                        <div className="grid gap-2">
                            {chainsData.map((chain) => (
                                <div
                                    key={chain.id}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-muted ${selectedChain?.id === chain.id ? "border-primary bg-primary/5" : "border-border"
                                        }`}
                                    onClick={() => {
                                        handleChainSelect(chain)
                                        setSendStep("asset")
                                    }}
                                >
                                    <img src={chainImageMapping[chain.id]} alt={chain.name} className="w-6 h-6 mr-3 rounded-full" />
                                    <div>{chain.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case "asset":
                return (
                    <div className="space-y-4 py-4">
                        <div className="flex justify-between">
                            <Label>Select Asset</Label>
                            <div className="flex items-center space-x-2">
                                <Image src={chainImageMapping[selectedChain?.id ?? 0] || "yo"} alt={selectedChain?.name || ""} width={24} height={24} className="rounded-full" />
                                <span className="text-sm">{selectedChain?.name}</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            {tokensData.map((token) => (
                                <div
                                    key={token.symbol}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted ${selectedAsset?.symbol === token.symbol ? "border-primary bg-primary/5" : "border-border"
                                        }`}
                                    onClick={() => {
                                        handleAssetSelect(token)
                                        setSendStep("amount")
                                    }}
                                >
                                    <div className="flex items-center">
                                        <img src={assetImageMapping[token.symbol.toLocaleLowerCase()]} alt={token.symbol} className="w-6 h-6 mr-3 rounded-full" />
                                        <div>
                                            <div>{token.symbol}</div>
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                )

            case "amount":
                return (
                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="amount">Amount</Label>
                            <button
                                onClick={handleAmountToggle}
                                className="text-xs text-primary hover:underline"
                            >
                                Switch to {amountInUSD ? selectedAsset?.symbol : 'USD'}
                            </button>
                        </div>

                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {amountInUSD ? '$' : ''}
                            </span>
                            <Input
                                id="amount"
                                className="pl-7"
                                placeholder="0.00"
                                type="number"
                                value={amount}
                                onChange={handleAmountChange}
                            />
                            {!amountInUSD && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {selectedAsset?.symbol}
                                </span>
                            )}
                        </div>

                        {selectedAsset && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {amountInUSD
                                        ? `≈ ${amount ? (parseFloat(amount) / selectedAsset.priceUsd).toFixed(6) : '0'} ${selectedAsset.symbol}`
                                        : `≈ $${amount ? (parseFloat(amount) * selectedAsset.priceUsd).toFixed(2) : '0'}`
                                    }
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Balance: {amountInUSD
                                        ? `$${selectedAsset.balanceUsd}`
                                        : `${selectedAsset.balance} ${selectedAsset.symbol}`
                                    }
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handlePercentage(0.25)}
                            >
                                25%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handlePercentage(0.5)}
                            >
                                50%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handlePercentage(0.75)}
                            >
                                75%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handlePercentage(1.0)}
                            >
                                Max
                            </Button>
                        </div>
                    </div>
                )

            case "summary":
                return (
                    <div className="space-y-4 py-4">
                        <h3 className="text-lg font-medium">Transaction Summary</h3>

                        <div className="space-y-3 bg-muted rounded-lg p-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Action</span>
                                <span className="text-sm">Send {selectedAsset?.symbol}</span>
                            </div>


                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground"> Chain</span>
                                <span className="flex items-center text-sm">
                                    {selectedChain && <img src={chainImageMapping[selectedChain.id]} alt={selectedChain.name} className="w-4 h-4 mr-1 rounded-full" />}
                                    {selectedChain?.name}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Recipient</span>
                                <span className="text-sm sen">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Estimated Fee</span>
                                <span>~$2.50</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Amount</span>
                                <div className="text-right">
                                    <div>
                                        {amountInUSD
                                            ? `$${amount}`
                                            : `${amount} ${selectedAsset?.symbol}`
                                        }
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {amountInUSD
                                            ? `≈ ${(parseFloat(amount) / (selectedAsset?.priceUsd || 1)).toFixed(6)} ${selectedAsset?.symbol}`
                                            : `≈ $${(parseFloat(amount) * (selectedAsset?.priceUsd || 1)).toFixed(2)}`
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            This transaction will be processed via Worldchain using ERC-7683. It will appear as a native transaction on {selectedChain?.name}.
                        </p>
                    </div>
                )

            case "processing":
                return (
                    <div className="space-y-4 py-8 text-center">
                        <Loader2 size={48} className="mx-auto animate-spin text-primary" />
                        <h3 className="text-lg font-medium">Processing Transaction</h3>
                        <p className="text-sm text-muted-foreground">
                            Your transaction is being processed. Please do not close this window.
                        </p>
                    </div>
                )

            case "confirmation":
                return (
                    <div className="space-y-4 py-4 text-center">
                        <CheckCircle size={48} className="mx-auto text-green-500" />
                        <h3 className="text-lg font-medium">Transaction Submitted</h3>

                        <div className="bg-muted rounded-lg p-3 text-left">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Order ID</span>
                                    <div className="flex items-center">
                                        <span className="text-xs sen mr-1">0x71C7656EC7...</span>
                                        <button className="p-1 hover:text-primary">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                </div>
                            </div>
                        </div>


                    </div>
                )
        }
    }

    return (
        <DialogContent className="sen">
            <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                    {sendStep !== "confirmation" && sendStep !== "processing" ? (
                        <>
                            <div className="flex items-center">
                                {sendStep !== "recipient" && (
                                    <button
                                        onClick={handlePreviousStep}
                                        className="mr-2 p-1 rounded-full hover:bg-muted"
                                    >
                                        <ChevronRight size={16} className="rotate-180" />
                                    </button>
                                )}
                                Send Assets
                            </div>
                        </>
                    ) : (
                        sendStep === "confirmation" ? "Transaction Confirmed" : "Processing"
                    )}
                </DialogTitle>
            </DialogHeader>

            {renderSendStep()}


            {(sendStep === 'recipient' || sendStep === 'summary' || sendStep == 'amount') && (
                <Button
                    className="w-full mt-2"
                    onClick={handleNextStep}
                    disabled={isNextDisabled()}
                >
                    {sendStep === "summary" ? "Confirm" : "Next"}
                </Button>
            )}

            {sendStep === "confirmation" && (
                <Button
                    className="w-full mt-2 flex items-center"
                    onClick={handleDialogClose}
                >
                    <p>View Order</p>  <ExternalLink size={16} className="ml-1" />
                </Button>
            )}
        </DialogContent>
    )
}