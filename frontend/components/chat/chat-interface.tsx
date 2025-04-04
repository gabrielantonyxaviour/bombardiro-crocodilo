"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  transactionPreview?: {
    type: string
    description: string
    amount: string
    token: string
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you with your crypto today?",
      sender: "assistant",
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      let aiResponse: Message

      if (input.toLowerCase().includes("swap") && input.toLowerCase().includes("bridge")) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          content:
            "I can help you swap ETH for USDC and bridge it to Arbitrum. Here's what the transaction will look like:",
          sender: "assistant",
          timestamp: new Date(),
          transactionPreview: {
            type: "Swap & Bridge",
            description: "Swap 0.5 ETH to USDC, then bridge to Arbitrum",
            amount: "0.5 ETH → ~800 USDC",
            token: "ETH → USDC",
          },
        }
      } else {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          content:
            "I understand you want to perform a crypto operation. Could you provide more details about what you'd like to do?",
          sender: "assistant",
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real app, this would trigger voice recording functionality
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleOrderConfirm = () => {
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      content: "Order confirmed! I'll process your swap from ETH to USDC and bridge it to Arbitrum right away.",
      sender: "assistant",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, confirmationMessage])
  }

  const handleOrderReject = () => {
    const rejectionMessage: Message = {
      id: Date.now().toString(),
      content: "Order cancelled. Is there anything else you'd like to do instead?",
      sender: "assistant",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, rejectionMessage])
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 custom-scrollbar overflow-y-auto mb-4 space-y-4 touch-pan-y"
        style={{ maxHeight: "calc(100vh - 215px)" }}
      >
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${message.sender === "user"
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-secondary text-secondary-foreground rounded-tl-none"
                }`}
            >
              <p className="mb-1">{message.content}</p>

              {message.transactionPreview && (
                <div className="mt-3 bg-background rounded-lg p-3 border border-border">
                  <div className="text-sm font-medium mb-2">{message.transactionPreview.type}</div>
                  <p className="text-xs text-gray-300 mb-2">{message.transactionPreview.description}</p>
                  <div className="flex justify-between text-sm">
                    <span>{message.transactionPreview.amount}</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      onClick={handleOrderConfirm}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1"
                    >
                      <Check size={14} className="mr-1" />
                      Confirm
                    </Button>
                    <Button
                      onClick={handleOrderReject}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1"
                    >
                      <X size={14} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              <div
                className={`text-xs mt-1 ${message.sender === "user" ? "text-primary/70" : "text-muted-foreground"}`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card rounded-xl p-2 flex items-center border border-border">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none h-10 py-2 px-3 text-foreground placeholder-muted-foreground"
          rows={1}
        />
        <Button
          onClick={toggleRecording}
          variant={isRecording ? "destructive" : "secondary"}
          className="rounded-full p-2 mr-1"
          size="icon"
        >
          <Mic size={18} />
        </Button>
        <Button onClick={handleSend} className="rounded-full p-2" size="icon" disabled={!input.trim()}>
          <Send size={18} />
        </Button>
      </div>
    </div>
  )
}