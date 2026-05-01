export type SortKey = 'hot' | 'new' | 'top'

export const VALID_SORT_KEYS: SortKey[] = ['hot', 'new', 'top']

export function isValidSortKey(s: unknown): s is SortKey {
  return VALID_SORT_KEYS.includes(s as SortKey)
}

export type PostsQuery = {
  from: 'posts' | 'posts_hot'
  orderBy: { column: string; ascending: boolean }[]
}

export function buildPostsQuery(sort: SortKey): PostsQuery {
  switch (sort) {
    case 'hot':
      return {
        from: 'posts_hot',
        orderBy: [{ column: 'hot_rank', ascending: false }],
      }
    case 'top':
      return {
        from: 'posts',
        orderBy: [
          { column: 'score', ascending: false },
          { column: 'created_at', ascending: false },
        ],
      }
    case 'new':
      return {
        from: 'posts',
        orderBy: [{ column: 'created_at', ascending: false }],
      }
  }
}
