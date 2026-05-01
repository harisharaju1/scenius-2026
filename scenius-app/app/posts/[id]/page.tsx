import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/posts/delete-button'
import { VoteButtons } from '@/components/posts/vote-buttons'
import { createClient } from '@/lib/supabase/server'
import { getPostById, getUserVoteForPost } from '@/lib/queries/posts'
import type { VoteValue } from '@/lib/voting'

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const postId = parseInt(id, 10)
  if (isNaN(postId)) notFound()

  const [post, supabase] = await Promise.all([getPostById(postId), createClient()])
  if (!post) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userVote: VoteValue | null = user
    ? await getUserVoteForPost(user.id, postId)
    : null

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <article>
        <div className="flex items-start gap-4">
          <VoteButtons postId={post.id} initialScore={post.score} userVote={userVote} />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{post.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              by {post.author_username} &middot;{' '}
              {new Date(post.created_at).toLocaleDateString()}
            </p>
            {post.body && <p className="mt-4 whitespace-pre-wrap">{post.body}</p>}
          </div>
        </div>
        {user?.id === post.author_id && (
          <div className="mt-6">
            <DeleteButton postId={post.id} />
          </div>
        )}
      </article>
    </main>
  )
}
