export default function OrderSkeleton() {
  return (
    <div className="custom-scrollbar overflow-y-auto space-y-3 animate-pulse touch-pan-y" style={{ maxHeight: "calc(100vh - 130px)" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-xl p-4 flex items-center border border-border">
          <div className="w-8 h-8 rounded-full bg-muted mr-3"></div>
          <div className="flex-1">
            <div className="flex justify-between">
              <div className="h-5 bg-muted rounded w-40"></div>
              <div className="h-5 bg-muted rounded w-16"></div>
            </div>
            <div className="flex justify-between mt-1">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 bg-muted rounded w-32"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}