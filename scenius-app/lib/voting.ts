export type VoteValue = 1 | -1
export type VoteKind = 'insert' | 'update' | 'delete'

export type VoteState =
  | { kind: 'insert'; value: VoteValue }
  | { kind: 'update'; value: VoteValue }
  | { kind: 'delete' }

/**
 * Returns the DB operation needed when a user casts `requested` on a post
 * they currently have `current` on (null = no existing vote).
 *
 * Cases:
 *   null  + 1  → insert  +1
 *   null  + -1 → insert  -1
 *   +1    + 1  → delete  (toggle off)
 *   -1    + -1 → delete  (toggle off)
 *   +1    + -1 → update  -1 (flip)
 *   -1    + 1  → update  +1 (flip)
 */
export function nextVoteState(
  current: VoteValue | null,
  requested: VoteValue,
): VoteState {
  if (current === null) return { kind: 'insert', value: requested }
  if (current === requested) return { kind: 'delete' }
  return { kind: 'update', value: requested }
}
