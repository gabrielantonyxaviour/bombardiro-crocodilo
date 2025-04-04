"use client"

import { useState } from "react"
import { Send, ArrowLeftRight } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SendDialog } from "./send"
import { SwapDialog } from "./swap"

export default function ActionButtons() {
  const [dialogOpen, setDialogOpen] = useState<"send" | "swap" | null>(null)
  const [resetFlag, setResetFlag] = useState(false)

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setResetFlag(true)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Dialog open={dialogOpen === "send"} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button
            onClick={() => setDialogOpen("send")}
            variant="outline"
            className="py-5 flex items-center justify-center"
          >
            <Send size={20} className="mr-2" />
            <span className="font-medium">Send</span>
          </Button>
        </DialogTrigger>
        <SendDialog resetFlag={resetFlag} setResetFlag={setResetFlag} setDialogOpen={setDialogOpen} />
      </Dialog>

      <Dialog open={dialogOpen === "swap"} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button
            onClick={() => setDialogOpen("swap")}
            variant="outline"
            className="py-5 flex items-center justify-center"
          >
            <ArrowLeftRight size={20} className="mr-2" />
            <span className="font-medium">Swap</span>
          </Button>
        </DialogTrigger>
        <SwapDialog resetFlag={resetFlag} setResetFlag={setResetFlag} setDialogOpen={setDialogOpen} />
      </Dialog>
    </div>
  )
}