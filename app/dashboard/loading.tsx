export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-60 bg-surface-200/60 rounded-xl" />
        <div className="h-4 w-80 bg-surface-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-surface-100" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 bg-surface-100 rounded" />
                <div className="h-6 w-20 bg-surface-200/60 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-xl" />
          ))}
        </div>
        <div className="lg:col-span-2 card p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
