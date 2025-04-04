import { Suspense } from "react"
import ChatInterface from "@/components/chat/chat-interface"
import ChatSkeleton from "@/components/chat/chat-skeleton"

export default function ChatPage() {
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground pb-16">
      <div className="container max-w-md mx-auto px-4 py-6" style={{ height: "calc(100vh - 64px)" }}>
        <h1 className="text-xl font-bold mb-4">AI Assistant</h1>
        <div className="h-full">
          <Suspense fallback={<ChatSkeleton />}>
            <ChatInterface />
          </Suspense>
        </div>
      </div>
    </main>
  )
}