import { describe, expect, it } from 'vitest'
import { fail, ok, type ActionResult } from '@/lib/actions/result'

describe('lib/actions/result', () => {
  it('ok wraps data', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } })
  })

  it('fail wraps errors', () => {
    expect(fail([{ field: 'username', message: 'too short' }])).toEqual({
      ok: false,
      errors: [{ field: 'username', message: 'too short' }],
    })
  })

  it('discriminates on ok', () => {
    const r: ActionResult<{ id: number }> = ok({ id: 7 })
    if (r.ok) {
      expect(r.data.id).toBe(7)
    } else {
      throw new Error('expected ok branch')
    }
  })
})
