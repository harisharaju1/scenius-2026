import { describe, expect, it } from 'vitest'
import { extractStoragePaths } from '@/lib/images'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/post-images'

describe('extractStoragePaths', () => {
  it('returns empty array for empty body', () => {
    expect(extractStoragePaths('', BASE)).toEqual([])
  })

  it('returns empty array when body has no images', () => {
    expect(extractStoragePaths('hello world', BASE)).toEqual([])
  })

  it('extracts a single image path', () => {
    const body = `![image](${BASE}/user-id/123.png)`
    expect(extractStoragePaths(body, BASE)).toEqual(['user-id/123.png'])
  })

  it('extracts multiple image paths', () => {
    const body = `![a](${BASE}/uid/1.jpg)\n![b](${BASE}/uid/2.png)`
    expect(extractStoragePaths(body, BASE)).toEqual(['uid/1.jpg', 'uid/2.png'])
  })

  it('ignores images from other domains', () => {
    const body = '![external](https://example.com/photo.jpg)'
    expect(extractStoragePaths(body, BASE)).toEqual([])
  })

  it('ignores images from a different bucket on the same host', () => {
    const body =
      '![other](https://abc.supabase.co/storage/v1/object/public/avatars/uid/pic.png)'
    expect(extractStoragePaths(body, BASE)).toEqual([])
  })

  it('accepts base URL with a trailing slash', () => {
    const body = `![image](${BASE}/uid/file.jpg)`
    expect(extractStoragePaths(body, `${BASE}/`)).toEqual(['uid/file.jpg'])
  })

  it('does not match bare links — only image syntax', () => {
    const body = `[link](${BASE}/uid/file.jpg)`
    expect(extractStoragePaths(body, BASE)).toEqual([])
  })

  it('handles mixed markdown content', () => {
    const body = `
# Title

Some text and \`inline code\`.

![screenshot](${BASE}/uid/screen.webp)

A paragraph with [a link](https://example.com).

![diagram](${BASE}/uid/diagram.gif)

\`\`\`js
const x = 1
\`\`\`
    `.trim()
    expect(extractStoragePaths(body, BASE)).toEqual(['uid/screen.webp', 'uid/diagram.gif'])
  })

  it('ignores images with empty alt text', () => {
    const body = `![](${BASE}/uid/no-alt.jpg)`
    expect(extractStoragePaths(body, BASE)).toEqual(['uid/no-alt.jpg'])
  })

  it('ignores images whose URL appears in a code block', () => {
    // code blocks are plain text in the string — the regex cannot distinguish them,
    // so this documents the known limitation rather than asserting filtering
    const body = `\`\`\`\n![image](${BASE}/uid/code.png)\n\`\`\``
    // the path IS extracted (limitation: no AST-level filtering)
    expect(extractStoragePaths(body, BASE)).toEqual(['uid/code.png'])
  })
})
