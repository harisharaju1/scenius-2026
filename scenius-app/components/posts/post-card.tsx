import Link from 'next/link'
import type { PostWithAuthor } from '@/lib/queries/posts'
import type { VoteValue } from '@/lib/voting'
import { VoteButtons } from './vote-buttons'

type Props = {
  post: PostWithAuthor
  userVote?: VoteValue | null
}

export function PostCard({ post, userVote = null }: Props) {
  return (
    <article className="rounded-md border p-4">
      <div className="flex items-start gap-4">
        <VoteButtons
          postId={post.id}
          initialScore={post.score}
          userVote={userVote}
        />
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
