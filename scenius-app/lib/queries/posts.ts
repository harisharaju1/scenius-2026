import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { type SortKey } from '@/lib/sorting'
import type { VoteValue } from '@/lib/voting'

export type { SortKey }

export type PostWithAuthor = {
  id: number
  title: string
  body: string
  score: number
  created_at: string
  author_id: string
  author_username: string
}

const SELECT_FIELDS = 'id, title, body, score, created_at, author_id, profiles!posts_author_id_fkey(username)' as const

function mapRow(row: {
  id: number | null
  title: string | null
  body: string | null
  score: number | null
  created_at: string | null
  author_id: string | null
  profiles: { username: string } | { username: string }[] | null
}): PostWithAuthor {
  const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id!,
    title: row.title!,
    body: row.body ?? '',
    score: row.score ?? 0,
    created_at: row.created_at!,
    author_id: row.author_id!,
    author_username: profiles?.username ?? '[deleted]',
  }
}

export async function listPosts(sort: SortKey = 'hot'): Promise<PostWithAuthor[]> {
  const supabase = await createClient()

  if (sort === 'hot') {
    const { data } = await supabase
      .from('posts_hot')
      .select(SELECT_FIELDS)
      .order('hot_rank', { ascending: false })
      .limit(50)
    return (data ?? []).map(mapRow)
  }

  if (sort === 'top') {
    const { data } = await supabase
      .from('posts')
      .select(SELECT_FIELDS)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []).map(mapRow)
  }

  // new
  const { data } = await supabase
    .from('posts')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []).map(mapRow)
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .single()
  if (!data) return null
  return mapRow(data)
}

export async function getUserVotesForPosts(
  userId: string,
  postIds: number[],
): Promise<Map<number, VoteValue>> {
  if (postIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase
    .from('votes')
    .select('post_id, value')
    .eq('user_id', userId)
    .in('post_id', postIds)
  const map = new Map<number, VoteValue>()
  for (const row of data ?? []) {
    map.set(row.post_id, row.value as VoteValue)
  }
  return map
}

export async function getUserVoteForPost(
  userId: string,
  postId: number,
): Promise<VoteValue | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle()
  return (data?.value ?? null) as VoteValue | null
}
