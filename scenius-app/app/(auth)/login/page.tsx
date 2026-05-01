import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-neutral-500">
        No account?{' '}
        <Link href="/register" className="font-medium underline">
          Register
        </Link>
      </p>
    </main>
  )
}
