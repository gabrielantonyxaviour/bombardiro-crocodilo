import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowDown, CheckCircle, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { DialogContent, DialogHeader } from "../ui/dialog"
import { DialogTitle } from "@radix-ui/react-dialog"
import { assetImageMapping, chainImageMapping } from "@/lib/constants"
import Image from "next/image"

// Step types for swap flow
type SwapStep = "fromAsset" | "toAsset" | "amount" | "summary" | "processing" | "confirmation"

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
    chainId: number
}

export function SwapDialog({ resetFlag, setResetFlag, setDialogOpen }: {
    resetFlag: boolean,
    setResetFlag: Function;
    setDialogOpen: Function
}) {
    const [swapStep, setSwapStep] = useState<SwapStep>("fromAsset")
    const [fromAsset, setFromAsset] = useState<Token | null>(null)
    const [toAsset, setToAsset] = useState<Token | null>(null)
    const [amount, setAmount] = useState("")
    const [amountInUSD, setAmountInUSD] = useState(true)
    const [exchangeRate, setExchangeRate] = useState(0)

    // Memoize these data structures so they don't cause rerenders
    const tokens = useCallback(() => [
        { symbol: "ETH", name: "Ethereum", balance: "1.24", balanceUsd: "3,720", priceUsd: 3000, chainId: 1 },
        { symbol: "USDC", name: "USD Coin", balance: "500.00", balanceUsd: "500", priceUsd: 1, chainId: 1 },
        { symbol: "USDT", name: "Tether", balance: "250.50", balanceUsd: "250.50", priceUsd: 1, chainId: 1 },
        { symbol: "ARB", name: "Arbitrum", balance: "150", balanceUsd: "225", priceUsd: 1.5, chainId: 42161 },
        { symbol: "MATIC", name: "Polygon", balance: "2000", balanceUsd: "440", priceUsd: 0.22, chainId: 137 },
        { symbol: "AVAX", name: "Avalanche", balance: "25", balanceUsd: "275", priceUsd: 11, chainId: 43114 },
    ], [])

    // Get chain details
    const getChainById = useCallback((id: number) => {
        const chains = [
            { id: 4801, name: "World" },
            { id: 1, name: "Ethereum" },
            { id: 42161, name: "Arbitrum" },
            { id: 10, name: "Optimism" },
            { id: 137, name: "Polygon" },
            { id: 43114, name: "Avalanche" },
        ]
        return chains.find(chain => chain.id === id) || { id: 0, name: "Unknown" }
    }, [])

    const resetSwapFlow = useCallback(() => {
        setSwapStep("fromAsset")
        setFromAsset(null)
        setToAsset(null)
        setAmount("")
        setAmountInUSD(true)
    }, [])

    useEffect(() => {
        if (resetFlag) {
            resetSwapFlow()
            setResetFlag(false)
            setDialogOpen(null)
        }
    }, [resetFlag, resetSwapFlow, setResetFlag, setDialogOpen])

    useEffect(() => {
        // Calculate exchange rate when both assets are selected
        if (fromAsset && toAsset) {
            setExchangeRate(toAsset.priceUsd / fromAsset.priceUsd)
        }
    }, [fromAsset, toAsset])

    const handleNextStep = useCallback(() => {
        switch (swapStep) {
            case "fromAsset":
                setSwapStep("toAsset")
                break
            case "toAsset":
                setSwapStep("amount")
                break
            case "amount":
                setSwapStep("summary")
                break
            case "summary":
                setSwapStep("processing")
                setTimeout(() => {
                    setSwapStep("confirmation")
                }, 3000)
                break
        }
    }, [swapStep])

    const handlePreviousStep = useCallback(() => {
        switch (swapStep) {
            case "toAsset":
                setSwapStep("fromAsset")
                break
            case "amount":
                setSwapStep("toAsset")
                break
            case "summary":
                setSwapStep("amount")
                break
        }
    }, [swapStep])

    const isNextDisabled = useCallback(() => {
        switch (swapStep) {
            case "fromAsset":
                return !fromAsset
            case "toAsset":
                return !toAsset
            case "amount":
                return !amount || parseFloat(amount) <= 0
            default:
                return false
        }
    }, [swapStep, fromAsset, toAsset, amount])

    const handleDialogClose = useCallback(() => {
        setDialogOpen(null)
        resetSwapFlow()
    }, [setDialogOpen, resetSwapFlow])

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value)
    }, [])

    const handleAmountToggle = useCallback(() => {
        setAmountInUSD(!amountInUSD)
    }, [amountInUSD])

    // Memoized asset selection handlers
    const handleFromAssetSelect = useCallback((asset: Token) => {
        setFromAsset(asset)
    }, [])

    const handleToAssetSelect = useCallback((asset: Token) => {
        setToAsset(asset)
    }, [])

    // Memoized percentage handlers
    const handlePercentage = useCallback((percentage: number) => {
        if (fromAsset) {
            if (amountInUSD) {
                setAmount((parseFloat(fromAsset.balanceUsd.replace(',', '')) * percentage).toString())
            } else {
                setAmount((parseFloat(fromAsset.balance) * percentage).toString())
            }
        }
    }, [fromAsset, amountInUSD])

    const getEstimatedReceiveAmount = useCallback(() => {
        if (!fromAsset || !toAsset || !amount) return "0"

        let valueInUsd
        if (amountInUSD) {
            valueInUsd = parseFloat(amount)
        } else {
            valueInUsd = parseFloat(amount) * fromAsset.priceUsd
        }

        return (valueInUsd / toAsset.priceUsd).toFixed(6)
    }, [fromAsset, toAsset, amount, amountInUSD])

    const renderSwapStep = () => {
        const tokensData = tokens()

        switch (swapStep) {
            case "fromAsset":
                return (
                    <div className="space-y-4 py-4">
                        <Label>Select Source Asset</Label>
                        <div className="grid gap-2">
                            {tokensData.map((token) => (
                                <div
                                    key={token.symbol}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted ${fromAsset?.symbol === token.symbol ? "border-primary bg-primary/5" : "border-border"
                                        }`}
                                    onClick={() => {
                                        handleFromAssetSelect(token)
                                        handleNextStep()
                                    }}
                                >
                                    <div className="flex items-center">
                                        <div className="relative mr-3">
                                            <img
                                                src={assetImageMapping[token.symbol.toLocaleLowerCase()]}
                                                alt={token.symbol}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div className="absolute -bottom-1 -right-1">
                                                <img
                                                    src={chainImageMapping[token.chainId]}
                                                    alt={getChainById(token.chainId).name}
                                                    className="w-4 h-4 rounded-full border border-background"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-medium">{token.symbol}</div>
                                            <div className="text-xs text-muted-foreground">{getChainById(token.chainId).name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div>{token.balance}</div>
                                        <div className="text-xs text-muted-foreground">${token.balanceUsd}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case "toAsset":
                return (
                    <div className="space-y-4 py-4">
                        <Label>Select Destination Asset</Label>
                        <div className="grid gap-2">
                            {tokensData
                                .filter(token => token.symbol !== fromAsset?.symbol)
                                .map((token) => (
                                    <div
                                        key={token.symbol}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted ${toAsset?.symbol === token.symbol ? "border-primary bg-primary/5" : "border-border"
                                            }`}
                                        onClick={() => {
                                            handleToAssetSelect(token)
                                            handleNextStep()
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <div className="relative mr-3">
                                                <img
                                                    src={assetImageMapping[token.symbol.toLocaleLowerCase()]}
                                                    alt={token.symbol}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                                <div className="absolute -bottom-1 -right-1">
                                                    <img
                                                        src={chainImageMapping[token.chainId]}
                                                        alt={getChainById(token.chainId).name}
                                                        className="w-4 h-4 rounded-full border border-background"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium">{token.symbol}</div>
                                                <div className="text-xs text-muted-foreground">{getChainById(token.chainId).name}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div>{token.balance}</div>
                                            <div className="text-xs text-muted-foreground">${token.balanceUsd}</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )

            case "amount":
                return (
                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border p-4">
                            <div className="flex justify-between items-center mb-2">
                                <Label htmlFor="amount">You Pay</Label>
                                <button
                                    onClick={handleAmountToggle}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Switch to {amountInUSD ? fromAsset?.symbol : 'USD'}
                                </button>
                            </div>

                            <div className="flex items-center space-x-3 mb-3">
                                <div className="relative">
                                    <img
                                        src={assetImageMapping[fromAsset?.symbol.toLocaleLowerCase() || ""]}
                                        alt={fromAsset?.symbol}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="absolute -bottom-1 -right-1">
                                        <img
                                            src={chainImageMapping[fromAsset?.chainId || 0]}
                                            alt={getChainById(fromAsset?.chainId || 0).name}
                                            className="w-4 h-4 rounded-full border border-background"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{fromAsset?.symbol}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Balance: {amountInUSD
                                            ? `$${fromAsset?.balanceUsd}`
                                            : `${fromAsset?.balance} ${fromAsset?.symbol}`
                                        }
                                    </div>
                                </div>
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
                                        {fromAsset?.symbol}
                                    </span>
                                )}
                            </div>

                            {fromAsset && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {amountInUSD
                                            ? `≈ ${amount ? (parseFloat(amount) / fromAsset.priceUsd).toFixed(6) : '0'} ${fromAsset.symbol}`
                                            : `≈ $${amount ? (parseFloat(amount) * fromAsset.priceUsd).toFixed(2) : '0'}`
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

                        <div className="flex justify-center">
                            <div className="bg-muted rounded-full p-2">
                                <ArrowDown size={16} />
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <Label>You Receive</Label>

                            <div className="flex items-center space-x-3 my-3">
                                <div className="relative">
                                    <img
                                        src={assetImageMapping[toAsset?.symbol.toLocaleLowerCase() || ""]}
                                        alt={toAsset?.symbol}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="absolute -bottom-1 -right-1">
                                        <img
                                            src={chainImageMapping[toAsset?.chainId || 0]}
                                            alt={getChainById(toAsset?.chainId || 0).name}
                                            className="w-4 h-4 rounded-full border border-background"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="font-medium">{toAsset?.symbol}</div>
                                    <div className="text-xs text-muted-foreground">{getChainById(toAsset?.chainId || 0).name}</div>
                                </div>
                            </div>

                            <div className="bg-muted rounded-lg p-3 font-medium">
                                ≈ {getEstimatedReceiveAmount()} {toAsset?.symbol}
                            </div>

                            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                                <span>Rate</span>
                                <span className="flex items-center">
                                    1 {fromAsset?.symbol} ≈ {exchangeRate.toFixed(6)} {toAsset?.symbol}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                                        <RefreshCw size={12} />
                                    </Button>
                                </span>
                            </div>
                        </div>
                    </div>
                )

            case "summary":
                return (
                    <div className="space-y-4 py-4">
                        <h3 className="text-lg font-medium">Swap Summary</h3>

                        <div className="space-y-3 bg-muted rounded-lg p-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">You Pay</span>
                                <div className="text-right">
                                    <div className="flex items-center">
                                        <div className="relative mr-2">
                                            <img
                                                src={assetImageMapping[fromAsset?.symbol.toLocaleLowerCase() || ""]}
                                                alt={fromAsset?.symbol}
                                                className="w-5 h-5 rounded-full"
                                            />
                                            <div className="absolute -bottom-1 -right-1">
                                                <img
                                                    src={chainImageMapping[fromAsset?.chainId || 0]}
                                                    alt={getChainById(fromAsset?.chainId || 0).name}
                                                    className="w-3 h-3 rounded-full border border-muted"
                                                />
                                            </div>
                                        </div>
                                        <span>
                                            {amountInUSD
                                                ? `${(parseFloat(amount) / (fromAsset?.priceUsd || 1)).toFixed(6)} ${fromAsset?.symbol}`
                                                : `${amount} ${fromAsset?.symbol}`
                                            }
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {amountInUSD
                                            ? `$${amount}`
                                            : `≈ $${(parseFloat(amount) * (fromAsset?.priceUsd || 1)).toFixed(2)}`
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">You Receive</span>
                                <div className="text-right">
                                    <div className="flex items-center">
                                        <div className="relative mr-2">
                                            <img
                                                src={assetImageMapping[toAsset?.symbol.toLocaleLowerCase() || ""]}
                                                alt={toAsset?.symbol}
                                                className="w-5 h-5 rounded-full"
                                            />
                                            <div className="absolute -bottom-1 -right-1">
                                                <img
                                                    src={chainImageMapping[toAsset?.chainId || 0]}
                                                    alt={getChainById(toAsset?.chainId || 0).name}
                                                    className="w-3 h-3 rounded-full border border-muted"
                                                />
                                            </div>
                                        </div>
                                        <span>
                                            {getEstimatedReceiveAmount()} {toAsset?.symbol}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        ≈ ${(parseFloat(getEstimatedReceiveAmount()) * (toAsset?.priceUsd || 1)).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Rate</span>
                                <div className="text-sm">
                                    1 {fromAsset?.symbol} ≈ {exchangeRate.toFixed(6)} {toAsset?.symbol}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Fee</span>
                                <span className="text-sm">0.3% (≈ $1.50)</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Network Fee</span>
                                <span className="text-sm">~$1.25</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            This swap will be processed via Worldchain. The transaction will be confirmed on both {getChainById(fromAsset?.chainId || 0).name} and {getChainById(toAsset?.chainId || 0).name} chains.
                        </p>
                    </div>
                )

            case "processing":
                return (
                    <div className="space-y-4 py-8 text-center">
                        <Loader2 size={48} className="mx-auto animate-spin text-primary" />
                        <h3 className="text-lg font-medium">Processing Swap</h3>
                        <p className="text-sm text-muted-foreground">
                            Your swap is being processed. Please do not close this window.
                        </p>
                    </div>
                )

            case "confirmation":
                return (
                    <div className="space-y-4 py-4 text-center">
                        <CheckCircle size={48} className="mx-auto text-green-500" />
                        <h3 className="text-lg font-medium">Swap Successful</h3>

                        <div className="bg-muted rounded-lg p-3 text-left">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Order ID</span>
                                    <div className="flex items-center">
                                        <span className="text-xs mr-1">0x83D8656EC7...</span>
                                        <button className="p-1 hover:text-primary">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Complete</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Paid</span>
                                    <div className="flex items-center">
                                        <div className="relative mr-2">
                                            <img
                                                src={assetImageMapping[fromAsset?.symbol.toLocaleLowerCase() || ""]}
                                                alt={fromAsset?.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        </div>
                                        <span className="text-sm">
                                            {amountInUSD
                                                ? `${(parseFloat(amount) / (fromAsset?.priceUsd || 1)).toFixed(6)}`
                                                : amount
                                            } {fromAsset?.symbol}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Received</span>
                                    <div className="flex items-center">
                                        <div className="relative mr-2">
                                            <img
                                                src={assetImageMapping[toAsset?.symbol.toLocaleLowerCase() || ""]}
                                                alt={toAsset?.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        </div>
                                        <span className="text-sm">
                                            {getEstimatedReceiveAmount()} {toAsset?.symbol}
                                        </span>
                                    </div>
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
                    {swapStep !== "confirmation" && swapStep !== "processing" ? (
                        <>
                            <div className="flex items-center">
                                {(swapStep === "toAsset" || swapStep === "amount" || swapStep === "summary") && (
                                    <button
                                        onClick={handlePreviousStep}
                                        className="mr-2 p-1 rounded-full hover:bg-muted"
                                    >
                                        <ArrowDown size={16} className="rotate-90" />
                                    </button>
                                )}
                                Swap Assets
                            </div>
                        </>
                    ) : (
                        swapStep === "confirmation" ? "Swap Confirmed" : "Processing"
                    )}
                </DialogTitle>
            </DialogHeader>

            {renderSwapStep()}

            {swapStep === "amount" && (
                <Button
                    className="w-full mt-2"
                    onClick={handleNextStep}
                    disabled={isNextDisabled()}
                >
                    Review Swap
                </Button>
            )}

            {swapStep === "summary" && (
                <Button
                    className="w-full mt-2"
                    onClick={handleNextStep}
                    disabled={isNextDisabled()}
                >
                    Confirm Swap
                </Button>
            )}

            {swapStep === "confirmation" && (
                <Button
                    className="w-full mt-2 flex items-center"
                    onClick={handleDialogClose}
                >
                    <p>View Transaction</p> <ExternalLink size={16} className="ml-1" />
                </Button>
            )}
        </DialogContent>
    )
}