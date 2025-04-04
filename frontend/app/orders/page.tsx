import { Suspense } from "react"
import OrderList from "@/components/orders/order-list"
import OrderSkeleton from "@/components/orders/order-skeleton"

export default function OrdersPage() {
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground pb-16">
      <div className="container max-w-md mx-auto px-4 py-6" style={{ height: "calc(100vh - 64px)" }}>
        <h1 className="text-xl font-bold mb-4">Orders</h1>
        <div className="h-full">
          <Suspense fallback={<OrderSkeleton />}>
            <OrderList />
          </Suspense>
        </div>
      </div>
    </main>
  )
}