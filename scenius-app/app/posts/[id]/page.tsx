import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/posts/delete-button'
import { createClient } from '@/lib/supabase/server'
import { getPostById } from '@/lib/queries/posts'

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <article>
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          by {post.author_username} &middot; score: {post.score} &middot;{' '}
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        {post.body && <p className="mt-4 whitespace-pre-wrap">{post.body}</p>}
        {user?.id === post.author_id && (
          <div className="mt-6">
            <DeleteButton postId={post.id} />
          </div>
        )}
      </article>
    </main>
  )
}
