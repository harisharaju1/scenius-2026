import { describe, expect, it } from 'vitest'
import { nextVoteState } from '@/lib/voting'

describe('nextVoteState', () => {
  it('null + upvote → insert +1', () => {
    expect(nextVoteState(null, 1)).toEqual({ kind: 'insert', value: 1 })
  })

  it('null + downvote → insert -1', () => {
    expect(nextVoteState(null, -1)).toEqual({ kind: 'insert', value: -1 })
  })

  it('+1 + upvote → delete (toggle off)', () => {
    expect(nextVoteState(1, 1)).toEqual({ kind: 'delete' })
  })

  it('-1 + downvote → delete (toggle off)', () => {
    expect(nextVoteState(-1, -1)).toEqual({ kind: 'delete' })
  })

  it('+1 + downvote → update -1 (flip)', () => {
    expect(nextVoteState(1, -1)).toEqual({ kind: 'update', value: -1 })
  })

  it('-1 + upvote → update +1 (flip)', () => {
    expect(nextVoteState(-1, 1)).toEqual({ kind: 'update', value: 1 })
  })
})
