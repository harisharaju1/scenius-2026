'use server'
import 'server-only'

import { fail, ok, type ActionResult } from '@/lib/actions/result'
import { createClient } from '@/lib/supabase/server'
import { postInput } from '@/lib/validation'
import { extractStoragePaths } from '@/lib/images'

const BUCKET = 'post-images'
const bucketBase = () =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

export async function createPostAction(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const parsed = postInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? 'root'), message: i.message })),
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail([{ field: 'root', message: 'You must be logged in to create a post' }])
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, title: parsed.data.title, body: parsed.data.body })
    .select('id')
    .single()

  if (error || !data) {
    return fail([{ field: 'root', message: 'Failed to create post' }])
  }

  // Record embedded image paths for lifecycle management (cleanup on post delete).
  // Best-effort: a failure here does not fail post creation.
  // TODO: remove `as any` cast after `pnpm db:gen` picks up 0004_post_images.sql
  const imagePaths = extractStoragePaths(parsed.data.body, bucketBase())
  if (imagePaths.length > 0) {
    await (supabase as any)
      .from('post_images')
      .insert(imagePaths.map((storage_path) => ({ post_id: data.id, storage_path })))
  }

  return ok({ id: data.id })
}

export async function deletePostAction(postId: number): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail([{ field: 'root', message: 'You must be logged in' }])
  }

  // Fetch image paths before deletion so storage can be cleaned up afterward.
  // TODO: remove `as any` cast after `pnpm db:gen` picks up 0004_post_images.sql
  const { data: images } = await (supabase as any)
    .from('post_images')
    .select('storage_path')
    .eq('post_id', postId)

  // .eq('author_id', user.id) is defence-in-depth; RLS enforces the same check
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) {
    return fail([{ field: 'root', message: 'Failed to delete post' }])
  }

  // Remove storage objects after the post is confirmed deleted.
  // If this fails, objects become orphaned but the post is gone — acceptable.
  if (images?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove((images as { storage_path: string }[]).map((i) => i.storage_path))
  }

  return ok(undefined)
}
