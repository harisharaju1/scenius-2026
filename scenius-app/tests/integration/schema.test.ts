import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY
const hasEnv = Boolean(url && serviceKey)

function admin() {
  return createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } })
}

describe.skipIf(!hasEnv)('vote trigger', () => {
  let postId: number
  let userId: string

  beforeAll(async () => {
    const db = admin()

    const { data, error: authErr } = await db.auth.admin.createUser({
      email: `trigger-test-${Date.now()}@scenius-test.invalid`,
      password: 'test-password-1234',
      user_metadata: { username: `tester${Date.now()}` },
      email_confirm: true,
    })
    if (!data.user) throw new Error(`createUser failed: ${authErr?.message}`)
    userId = data.user.id

    // Allow trigger to write the profiles row
    await new Promise((r) => setTimeout(r, 200))

    const { data: post, error: postErr } = await db
      .from('posts')
      .insert({ author_id: userId, title: 'Vote trigger smoke test' })
      .select('id')
      .single()
    if (!post) throw new Error(`createPost failed: ${postErr?.message}`)
    postId = post.id
  })

  afterAll(async () => {
    const db = admin()
    if (postId) await db.from('posts').delete().eq('id', postId)
    if (userId) await db.auth.admin.deleteUser(userId)
  })

  it('upvote increments score to 1', async () => {
    await admin().from('votes').insert({ user_id: userId, post_id: postId, value: 1 })
    const { data } = await admin().from('posts').select('score').eq('id', postId).single()
    expect(data?.score).toBe(1)
  })

  it('changing vote from +1 to -1 moves score by 2', async () => {
    await admin()
      .from('votes')
      .update({ value: -1 })
      .eq('user_id', userId)
      .eq('post_id', postId)
    const { data } = await admin().from('posts').select('score').eq('id', postId).single()
    expect(data?.score).toBe(-1)
  })

  it('deleting vote restores score to 0', async () => {
    await admin().from('votes').delete().eq('user_id', userId).eq('post_id', postId)
    const { data } = await admin().from('posts').select('score').eq('id', postId).single()
    expect(data?.score).toBe(0)
  })
})
