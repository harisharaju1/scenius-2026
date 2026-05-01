'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="mb-2 font-semibold text-red-700">Something went wrong</h2>
        <p className="mb-4 text-sm text-red-600">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
