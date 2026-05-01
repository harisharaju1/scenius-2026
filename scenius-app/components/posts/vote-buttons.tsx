'use client'

import { useOptimistic, useTransition } from 'react'
import { castVoteAction } from '@/lib/actions/votes'
import type { VoteValue } from '@/lib/voting'

type Props = {
  postId: number
  initialScore: number
  userVote: VoteValue | null
}

export function VoteButtons({ postId, initialScore, userVote }: Props) {
  const [isPending, startTransition] = useTransition()

  const [optimistic, addOptimistic] = useOptimistic<
    { score: number; vote: VoteValue | null },
    { requested: VoteValue }
  >(
    { score: initialScore, vote: userVote },
    (current, { requested }) => {
      if (current.vote === requested) {
        return { score: current.score - requested, vote: null }
      }
      const delta = current.vote === null ? requested : requested - current.vote
      return { score: current.score + delta, vote: requested }
    },
  )

  function handleVote(requested: VoteValue) {
    startTransition(async () => {
      addOptimistic({ requested })
      await castVoteAction(postId, requested)
    })
  }

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <button
        onClick={() => handleVote(1)}
        disabled={isPending}
        aria-label="Upvote"
        className={`text-lg leading-none transition-colors ${
          optimistic.vote === 1 ? 'text-orange-500' : 'text-neutral-400 hover:text-orange-500'
        }`}
      >
        ▲
      </button>
      <span className="text-sm font-medium tabular-nums">{optimistic.score}</span>
      <button
        onClick={() => handleVote(-1)}
        disabled={isPending}
        aria-label="Downvote"
        className={`text-lg leading-none transition-colors ${
          optimistic.vote === -1 ? 'text-blue-500' : 'text-neutral-400 hover:text-blue-500'
        }`}
      >
        ▼
      </button>
    </div>
  )
}
