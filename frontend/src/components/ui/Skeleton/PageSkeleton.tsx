export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-1">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-bg-tertiary rounded-lg" />
          <div className="h-4 w-64 bg-bg-tertiary rounded-md" />
        </div>
        <div className="h-9 w-28 bg-bg-tertiary rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-bg-secondary border border-border-primary space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-bg-tertiary rounded" />
              <div className="w-8 h-8 rounded-lg bg-bg-tertiary" />
            </div>
            <div className="h-7 w-32 bg-bg-tertiary rounded-lg" />
            <div className="h-3 w-16 bg-bg-tertiary rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-bg-secondary border border-border-primary overflow-hidden">
        <div className="p-4 border-b border-border-primary">
          <div className="h-5 w-36 bg-bg-tertiary rounded" />
        </div>
        <div className="divide-y divide-border-primary">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-bg-tertiary rounded" style={{ width: `${40 + (i * 10) % 40}%` }} />
                <div className="h-3 bg-bg-tertiary rounded" style={{ width: `${30 + (i * 7) % 30}%` }} />
              </div>
              <div className="h-6 w-16 bg-bg-tertiary rounded-full" />
              <div className="h-4 w-20 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PageSkeleton
