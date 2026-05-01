import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const hasEnv = Boolean(url && serviceKey && publishableKey)

function admin() {
  return createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } })
}

function anon() {
  return createClient<Database>(url!, publishableKey!, { auth: { persistSession: false } })
}

describe.skipIf(!hasEnv)('auth integration', () => {
  const stamp = Date.now()
  const testEmail = `auth-test-${stamp}@scenius-test.invalid`
  const testPassword = 'test-pass-123!'
  const testUsername = `tester${stamp}`
  let userId: string

  beforeAll(async () => {
    const { data, error } = await admin().auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: { username: testUsername },
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
    userId = data.user.id
    await new Promise((r) => setTimeout(r, 200))
  })

  afterAll(async () => {
    if (userId) await admin().auth.admin.deleteUser(userId)
  })

  it('handle_new_user trigger creates the profile row', async () => {
    const { data } = await admin()
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
    expect(data?.username).toBe(testUsername)
  })

  it('signInWithPassword succeeds with correct credentials', async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data.session?.user?.id).toBe(userId)
  })

  it('signInWithPassword fails with wrong password', async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: testEmail,
      password: 'wrong-password',
    })
    expect(error).not.toBeNull()
    expect(data.session).toBeNull()
  })
})
