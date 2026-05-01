import Link from 'next/link'
import type { PostWithAuthor } from '@/lib/queries/posts'

export function PostCard({ post }: { post: PostWithAuthor }) {
  return (
    <article className="rounded-md border p-4">
      <div className="flex items-start gap-4">
        <div className="flex min-w-10 flex-col items-center text-center">
          <span className="text-sm font-semibold">{post.score}</span>
          <span className="text-xs text-neutral-400">pts</span>
        </div>
        <div className="flex-1">
          <Link href={`/posts/${post.id}`} className="font-medium hover:underline">
            {post.title}
          </Link>
          <p className="mt-1 text-xs text-neutral-500">
            by {post.author_username} &middot;{' '}
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </article>
  )
}
