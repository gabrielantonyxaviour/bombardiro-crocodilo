import { Suspense } from "react"
import Header from "@/components/header"
import AddressCards from "@/components/wallet/address-cards"
import AssetTabs from "@/components/wallet/asset-tabs"
import ActionButtons from "@/components/wallet/action-buttons"
import WalletSkeleton from "@/components/wallet/wallet-skeleton"
import { VerifyWorldId } from "@/components/verify-world-id"

export default function Home() {
    return (
        <main className="flex flex-col min-h-screen bg-background text-foreground pb-16">
            <Header />
            <div
                className="container max-w-md mx-auto px-4 py-6 mt-16"
                style={{ height: "calc(100vh - 16px - 64px)" }}
            >
                <Suspense fallback={<WalletSkeleton />}>
                    <div className="flex flex-col h-full">
                        <AddressCards />
                        <ActionButtons />
                        <VerifyWorldId />
                        <div className="flex-1 overflow-hidden asset-tabs-container">
                            <AssetTabs />
                        </div>
                    </div>
                </Suspense>
            </div>
        </main>
    )
}