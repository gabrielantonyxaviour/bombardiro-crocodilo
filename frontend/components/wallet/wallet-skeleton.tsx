export default function WalletSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="text-center mb-6">
        <div className="h-8 bg-muted rounded w-40 mx-auto mb-2"></div>
        <div className="h-10 bg-muted rounded w-32 mx-auto"></div>
      </div>

      <div className="bg-card rounded-xl p-4 mb-4 border border-border">
        <div className="flex justify-between items-center mb-3">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
        </div>
        <div className="h-6 bg-muted rounded w-40"></div>
      </div>

      <div className="mb-6">
        <div className="h-8 bg-muted rounded w-full mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 flex items-center border border-border">
              <div className="w-10 h-10 rounded-full bg-muted mr-3"></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div className="h-5 bg-muted rounded w-24"></div>
                  <div className="h-5 bg-muted rounded w-20"></div>
                </div>
                <div className="flex justify-between mt-1">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-14 bg-muted rounded-xl"></div>
        <div className="h-14 bg-muted rounded-xl"></div>
      </div>
    </div>
  )
}

