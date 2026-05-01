'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { createPostAction } from '@/lib/actions/posts'
import { postInput, type PostInput } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function PostForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PostInput>({ resolver: zodResolver(postInput), defaultValues: { title: '', body: '' } })

  function onSubmit(data: PostInput) {
    const fd = new FormData()
    fd.set('title', data.title)
    fd.set('body', data.body)

    startTransition(async () => {
      const result = await createPostAction(fd)
      if (!result.ok) {
        result.errors.forEach(({ field, message }) => {
          if (field === 'title' || field === 'body') {
            setError(field, { message })
          } else {
            setError('root', { message })
          }
        })
        return
      }
      router.push(`/posts/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" type="text" {...register('title')} />
        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="body">Body (optional)</Label>
        <Textarea id="body" rows={6} {...register('body')} />
        {errors.body && <p className="text-sm text-red-500">{errors.body.message}</p>}
      </div>

      {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Posting…' : 'Post'}
      </Button>
    </form>
  )
}
