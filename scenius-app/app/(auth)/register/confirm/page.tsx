import Link from 'next/link'

export default function ConfirmPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-20 text-center">
      <div className="mb-4 text-4xl">✉️</div>
      <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
      <p className="mb-6 text-sm text-neutral-500">
        We sent a confirmation link to your email address. Click it to activate your account and
        sign in.
      </p>
      <p className="text-xs text-neutral-400">
        Wrong address?{' '}
        <Link href="/register" className="underline underline-offset-2">
          Register again
        </Link>
      </p>
    </main>
  )
}
