import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type Comment = {
  id: number
  post_id: number
  author_id: string
  author_username: string
  body: string
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

export async function getCommentsByPostId(postId: number): Promise<Comment[]> {
  const supabase = await createClient()
  // Cast needed until `pnpm db:gen` is run after applying 0002_comments.sql migration
  const { data } = await (supabase as AnyRow)
    .from('comments')
    .select('id, post_id, author_id, body, created_at, profiles!comments_author_id_fkey(username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row: AnyRow) => {
    const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      author_username: (profiles as { username: string } | null)?.username ?? '[deleted]',
      body: row.body,
      created_at: row.created_at,
    }
  })
}
