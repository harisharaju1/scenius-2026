'use server'
import 'server-only'

import { fail, ok, type ActionResult } from '@/lib/actions/result'
import { createClient } from '@/lib/supabase/server'
import { postInput } from '@/lib/validation'

export async function createPostAction(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const parsed = postInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? 'root'), message: i.message })),
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail([{ field: 'root', message: 'You must be logged in to create a post' }])
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, title: parsed.data.title, body: parsed.data.body })
    .select('id')
    .single()

  if (error || !data) {
    return fail([{ field: 'root', message: 'Failed to create post' }])
  }

  return ok({ id: data.id })
}

export async function deletePostAction(postId: number): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail([{ field: 'root', message: 'You must be logged in' }])
  }

  // .eq('author_id', user.id) is defence-in-depth; RLS enforces the same check
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) {
    return fail([{ field: 'root', message: 'Failed to delete post' }])
  }

  return ok(undefined)
}
