'use server'
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, ok } from '@/lib/actions/result'
import { nextVoteState, type VoteValue } from '@/lib/voting'

export async function castVoteAction(
  postId: number,
  requested: VoteValue,
): Promise<ActionResult<{ score: number }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail([{ field: 'root', message: 'Not authenticated' }])

  const { data: existing } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  const current = (existing?.value ?? null) as VoteValue | null
  const state = nextVoteState(current, requested)

  if (state.kind === 'delete') {
    await supabase
      .from('votes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
  } else if (state.kind === 'insert') {
    await supabase
      .from('votes')
      .insert({ user_id: user.id, post_id: postId, value: state.value })
  } else {
    await supabase
      .from('votes')
      .update({ value: state.value })
      .eq('user_id', user.id)
      .eq('post_id', postId)
  }

  const { data: post } = await supabase
    .from('posts')
    .select('score')
    .eq('id', postId)
    .single()

  return ok({ score: post?.score ?? 0 })
}
