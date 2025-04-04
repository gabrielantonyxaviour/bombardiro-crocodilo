'use client'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { MiniKit, WalletAuthInput } from '@worldcoin/minikit-js'
import { useRouter } from "next/navigation"
import { toast } from "sonner"
export default function LandingPage() {

  const router = useRouter()

  const signInWithWallet = async () => {
    if (!MiniKit.isInstalled()) {
      return
    }

    const res = await fetch(`/api/nonce`)
    const { nonce } = await res.json()

    const { commandPayload: generateMessageResult, finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce: nonce,
      requestId: '0', // Optional
      expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
      statement: 'This is my statement and here is a link https://worldcoin.com/apps',
    })

    if (finalPayload.status === 'error') {
      return
    } else {
      const response = await fetch('/api/complete-siwe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      })
      const { status } = await response.json()

      if (status === 'success') {
        toast.success("Successfully signed in with Worldcoin")
        router.push('/home')
      } else {
        toast.error("Error signing in with Worldcoin")
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center justify-center px-4 h-screen">
        <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
          {/* App Logo */}
          <div className="flex space-x-6 items-center relative">
            <Image
              src="/intents.png"
              alt="App Logo"
              width={140}
              height={140}
            />
            <p className="absolute left-[48%] font-bold text-xl">x</p>
            <Image
              src="/chains/world.png"
              alt="App Logo"
              width={60}
              height={60}
              className="rounded-full"
            />
          </div>


          {/* App Name */}
          <h1 className="text-3xl font-bold text-center">World-7683</h1>

          {/* One liner */}
          <p className="text-center text-muted-foreground mb-8">
            Human verified transactions on any EVM chain powered by ERC-7863
          </p>

          <Button
            size="lg"
            className="w-full flex items-center justify-center space-x-2 rounded-xl py-6"
            onClick={() => {
              signInWithWallet()
            }}
          >
            <div className="w-5 h-5 relative mr-2">
              <Image
                src="/chains/world.png"
                alt="Worldcoin Logo"
                fill
                className="object-contain rounded-full"
              />
            </div>
            <span>Sign in with Worldcoin</span>
          </Button>

          {/* App version */}
          <p className="text-xs text-muted-foreground mt-8">
            Version 1.0.0
          </p>

        </div>
        <div className="mt-2">
          <ThemeToggle />

        </div>

      </div>
    </main>
  )
}