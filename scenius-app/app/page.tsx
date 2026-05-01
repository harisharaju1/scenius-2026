import Link from 'next/link'
import { PostCard } from '@/components/posts/post-card'
import { createClient } from '@/lib/supabase/server'
import { listPosts, type SortKey } from '@/lib/queries/posts'

const SORTS: SortKey[] = ['hot', 'new', 'top']

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort: rawSort } = await searchParams
  const sort: SortKey = SORTS.includes(rawSort as SortKey) ? (rawSort as SortKey) : 'hot'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const posts = await listPosts(sort)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          {SORTS.map((s) => (
            <Link
              key={s}
              href={`/?sort=${s}`}
              className={
                s === sort ? 'font-semibold' : 'text-neutral-500 hover:text-neutral-800'
              }
            >
              {s}
            </Link>
          ))}
        </nav>
        {user && (
          <Link href="/posts/new" className="text-sm font-medium hover:underline">
            + new post
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {posts.length === 0 ? (
          <p className="text-neutral-500">No posts yet.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </main>
  )
}
