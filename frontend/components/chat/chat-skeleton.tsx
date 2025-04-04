export default function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 custom-scrollbar overflow-y-auto mb-4 space-y-4 animate-pulse">
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl p-3 bg-secondary rounded-tl-none">
            <div className="h-4 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-3 bg-muted rounded w-16 mt-2"></div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-2 flex items-center border border-border">
        <div className="flex-1 h-10 bg-muted rounded-lg"></div>
        <div className="w-10 h-10 bg-muted rounded-full ml-2 mr-1"></div>
        <div className="w-10 h-10 bg-muted rounded-full"></div>
      </div>
    </div>
  )
}