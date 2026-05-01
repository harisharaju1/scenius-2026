import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Post not found</h1>
      <p className="mb-6 text-neutral-500">It may have been deleted.</p>
      <Link href="/" className="text-sm font-medium underline underline-offset-2">
        Back to feed
      </Link>
    </main>
  )
}
