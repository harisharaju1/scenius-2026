'use client'

import { useRef, useTransition } from 'react'
import { addCommentAction } from '@/lib/actions/comments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function CommentForm({ postId }: { postId: number }) {
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addCommentAction(postId, fd)
      if (result.ok) formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        name="body"
        placeholder="Add a comment…"
        rows={3}
        disabled={isPending}
        required
      />
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? 'Posting…' : 'Post comment'}
      </Button>
    </form>
  )
}
