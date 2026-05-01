'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RichBodyEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
}

export function RichBodyEditor({ id, value, onChange }: RichBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  function insertAtCursor(text: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + text + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length
      el.focus()
    })
  }

  async function uploadImage(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('post-images').upload(path, file)
    if (error) return

    const {
      data: { publicUrl },
    } = supabase.storage.from('post-images').getPublicUrl(path)
    insertAtCursor(`![image](${publicUrl})\n`)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setIsUploading(true)
    for (const file of images) {
      await uploadImage(file)
    }
    setIsUploading(false)
  }

  function insertCodeBlock() {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const snippet = selected ? `\`\`\`\n${selected}\n\`\`\`` : `\`\`\`\n\n\`\`\``
    const next = value.slice(0, start) + snippet + value.slice(end)
    onChange(next)
    // place cursor inside the block when nothing was selected
    const cursorPos = selected ? start + snippet.length : start + 4
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = cursorPos
      el.focus()
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={insertCodeBlock}
          title="Insert code block (wraps selection)"
          className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-mono transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <span>&lt;/&gt;</span>
          <span>Code</span>
        </button>
      </div>

      <div
        className={cn(
          'relative rounded-md border transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-input',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
        }}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          className="w-full resize-y rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Write your post… drag images to embed them. Markdown is supported."
        />

        {isDragging && !isUploading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-blue-500/10">
            <span className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow">
              Drop image to embed
            </span>
          </div>
        )}

        {isUploading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-white/80 dark:bg-neutral-900/80">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Uploading…</span>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Drag &amp; drop images to embed &middot; Markdown supported
      </p>
    </div>
  )
}
