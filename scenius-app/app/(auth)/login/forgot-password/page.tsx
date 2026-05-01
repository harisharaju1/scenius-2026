import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Forgot password</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium underline">
          Back to log in
        </Link>
      </p>
    </main>
  )
}
