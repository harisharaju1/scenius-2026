import { describe, expect, it } from 'vitest'
import { buildPostsQuery, isValidSortKey } from '@/lib/sorting'

describe('isValidSortKey', () => {
  it('accepts hot, new, top', () => {
    expect(isValidSortKey('hot')).toBe(true)
    expect(isValidSortKey('new')).toBe(true)
    expect(isValidSortKey('top')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isValidSortKey('best')).toBe(false)
    expect(isValidSortKey('')).toBe(false)
    expect(isValidSortKey(null)).toBe(false)
  })
})

describe('buildPostsQuery', () => {
  it('hot → posts_hot view ordered by hot_rank desc', () => {
    const q = buildPostsQuery('hot')
    expect(q.from).toBe('posts_hot')
    expect(q.orderBy[0]).toEqual({ column: 'hot_rank', ascending: false })
  })

  it('top → posts ordered by score desc then created_at desc', () => {
    const q = buildPostsQuery('top')
    expect(q.from).toBe('posts')
    expect(q.orderBy[0]).toEqual({ column: 'score', ascending: false })
    expect(q.orderBy[1]).toEqual({ column: 'created_at', ascending: false })
  })

  it('new → posts ordered by created_at desc', () => {
    const q = buildPostsQuery('new')
    expect(q.from).toBe('posts')
    expect(q.orderBy[0]).toEqual({ column: 'created_at', ascending: false })
  })
})
