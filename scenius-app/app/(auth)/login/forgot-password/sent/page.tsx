import Link from 'next/link'

export default function ForgotPasswordSentPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Check your email</h1>
      <p className="mb-6 text-sm text-neutral-500">
        If an account exists for that address, you&apos;ll receive a password reset link shortly.
      </p>
      <p className="text-sm text-neutral-500">
        <Link href="/login" className="font-medium underline">
          Back to log in
        </Link>
      </p>
    </main>
  )
}
