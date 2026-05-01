export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-md border p-4">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-4 rounded bg-neutral-200" />
                <div className="h-3 w-6 rounded bg-neutral-200" />
                <div className="h-4 w-4 rounded bg-neutral-200" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-neutral-200" />
                <div className="h-3 w-1/3 rounded bg-neutral-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
