import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Reset password</h1>
      <p className="mb-6 text-sm text-neutral-500">Choose a new password for your account.</p>
      <ResetPasswordForm />
    </main>
  )
}
