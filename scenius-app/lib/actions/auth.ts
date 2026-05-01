'use server'
import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { fail, ok, type ActionResult } from '@/lib/actions/result'
import { createClient } from '@/lib/supabase/server'
import { loginInput, registerInput } from '@/lib/validation'

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function registerAction(formData: FormData): Promise<ActionResult<void>> {
  const parsed = registerInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? 'root'), message: i.message })),
    )
  }

  const { username, email, password } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await siteOrigin()}/callback`,
    },
  })

  if (error) {
    if (
      error.message.includes('profiles_username_key') ||
      error.message.toLowerCase().includes('username')
    ) {
      return fail([{ field: 'username', message: 'Username already taken' }])
    }
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('user already')
    ) {
      return fail([{ field: 'email', message: 'Email already registered' }])
    }
    return fail([{ field: 'root', message: error.message }])
  }

  return ok(undefined)
}

export async function loginAction(formData: FormData): Promise<ActionResult<void>> {
  const parsed = loginInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? 'root'), message: i.message })),
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return fail([{ field: 'root', message: 'Invalid email or password' }])
  }

  return ok(undefined)
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
