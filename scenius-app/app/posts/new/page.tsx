import { PostForm } from '@/components/posts/post-form'

export default function NewPostPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">New post</h1>
      <PostForm />
    </main>
  )
}
