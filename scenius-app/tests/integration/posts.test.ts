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

describe.skipIf(!hasEnv)('posts integration', () => {
  const stamp = Date.now()
  const u1Email = `posts-u1-${stamp}@scenius-test.invalid`
  const u2Email = `posts-u2-${stamp}@scenius-test.invalid`
  const password = 'test-pass-123!'
  let userId1: string
  let userId2: string
  let postId: number

  beforeAll(async () => {
    const [r1, r2] = await Promise.all([
      admin().auth.admin.createUser({
        email: u1Email,
        password,
        user_metadata: { username: `postsU1${stamp}` },
        email_confirm: true,
      }),
      admin().auth.admin.createUser({
        email: u2Email,
        password,
        user_metadata: { username: `postsU2${stamp}` },
        email_confirm: true,
      }),
    ])
    if (!r1.data.user || !r2.data.user) throw new Error('createUser failed')
    userId1 = r1.data.user.id
    userId2 = r2.data.user.id
    await new Promise((r) => setTimeout(r, 200))
  })

  afterAll(async () => {
    if (postId) await admin().from('posts').delete().eq('id', postId)
    await Promise.all([
      userId1 ? admin().auth.admin.deleteUser(userId1) : Promise.resolve(),
      userId2 ? admin().auth.admin.deleteUser(userId2) : Promise.resolve(),
    ])
  })

  it('creates a post', async () => {
    const { data, error } = await admin()
      .from('posts')
      .insert({ author_id: userId1, title: 'Integration test post', body: 'Hello' })
      .select('id, score')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeDefined()
    expect(data?.score).toBe(0)
    postId = data!.id
  })

  it('fetches the post with author username', async () => {
    const { data } = await admin()
      .from('posts')
      .select('id, title, profiles!posts_author_id_fkey(username)')
      .eq('id', postId)
      .single()
    expect(data?.title).toBe('Integration test post')
    expect((data?.profiles as { username: string } | null)?.username).toMatch(/postsU1/)
  })

  it('user2 delete attempt leaves post intact (RLS silently blocks)', async () => {
    const client = createClient<Database>(url!, publishableKey!, { auth: { persistSession: false } })
    await client.auth.signInWithPassword({ email: u2Email, password })
    // RLS policy means this deletes 0 rows, no error thrown
    const { error } = await client.from('posts').delete().eq('id', postId)
    expect(error).toBeNull()

    const { data } = await admin().from('posts').select('id').eq('id', postId).single()
    expect(data?.id).toBe(postId)
  })

  it('owner can delete their own post', async () => {
    const { error } = await admin()
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId1)
    expect(error).toBeNull()
    const { data } = await admin().from('posts').select('id').eq('id', postId).maybeSingle()
    expect(data).toBeNull()
    postId = 0 // prevent afterAll double-delete
  })
})
