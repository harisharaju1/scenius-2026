'use server'
import 'server-only'

import { revalidatePath } from 'next/cache'
import { type ActionResult, fail, ok } from '@/lib/actions/result'
import { createClient } from '@/lib/supabase/server'
import { commentInput } from '@/lib/validation'

export async function addCommentAction(
  postId: number,
  formData: FormData,
): Promise<ActionResult<void>> {
  const parsed = commentInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? 'root'), message: i.message })),
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail([{ field: 'root', message: 'Not authenticated' }])

  // Cast needed until `pnpm db:gen` is run after applying 0002_comments.sql migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('comments')
    .insert({ post_id: postId, author_id: user.id, body: parsed.data.body })

  if (error) return fail([{ field: 'root', message: error.message }])

  revalidatePath(`/posts/${postId}`)
  return ok(undefined)
}
