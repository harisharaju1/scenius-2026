'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deletePostAction } from '@/lib/actions/posts'
import { Button } from '@/components/ui/button'

export function DeleteButton({ postId }: { postId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this post?')) return
    startTransition(async () => {
      const result = await deletePostAction(postId)
      if (result.ok) router.push('/')
    })
  }

  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
      {isPending ? 'Deleting…' : 'Delete post'}
    </Button>
  )
}
