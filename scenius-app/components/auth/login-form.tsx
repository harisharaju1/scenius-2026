'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { loginAction } from '@/lib/actions/auth'
import { loginInput, type LoginInput } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInput) })

  function onSubmit(data: LoginInput) {
    const fd = new FormData()
    fd.set('email', data.email)
    fd.set('password', data.password)

    startTransition(async () => {
      const result = await loginAction(fd)
      if (!result.ok) {
        if (result.errors.some((e) => e.field === 'unconfirmed')) {
          router.push('/register/confirm')
          return
        }
        result.errors.forEach(({ field, message }) => {
          if (field === 'email' || field === 'password') {
            setError(field, { message })
          } else {
            setError('root', { message })
          }
        })
        return
      }
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  )
}
