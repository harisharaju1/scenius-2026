import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/posts/delete-button'
import { VoteButtons } from '@/components/posts/vote-buttons'
import { CommentForm } from '@/components/posts/comment-form'
import { createClient } from '@/lib/supabase/server'
import { getPostById, getUserVoteForPost } from '@/lib/queries/posts'
import { getCommentsByPostId } from '@/lib/queries/comments'
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

  const [userVote, comments] = await Promise.all([
    user ? getUserVoteForPost(user.id, postId) : Promise.resolve(null as VoteValue | null),
    getCommentsByPostId(postId),
  ])

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <article className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            by {post.author_username} &middot;{' '}
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>

        {post.body && (
          <p className="whitespace-pre-wrap text-neutral-800">{post.body}</p>
        )}

        <div className="flex items-center gap-4 border-t pt-4">
          <VoteButtons postId={post.id} initialScore={post.score} userVote={userVote} />
          {user?.id === post.author_id && <DeleteButton postId={post.id} />}
        </div>
      </article>

      <section className="mt-8 space-y-6">
        <h2 className="font-semibold">
          {comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
        </h2>

        {comments.length > 0 && (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-md border p-4">
                <p className="mb-1 text-xs text-neutral-500">
                  {c.author_username} &middot; {new Date(c.created_at).toLocaleDateString()}
                </p>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-neutral-500">
            <a href="/login" className="underline underline-offset-2">Log in</a> to leave a comment.
          </p>
        )}
      </section>
    </main>
  )
}
