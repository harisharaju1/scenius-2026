import { describe, expect, it } from 'vitest'
import { loginInput, postInput, registerInput } from '@/lib/validation'

describe('registerInput', () => {
  const valid = { username: 'alice', email: 'alice@example.com', password: 'secret123' }

  it('accepts valid data', () => {
    expect(registerInput.safeParse(valid).success).toBe(true)
  })

  it('rejects username shorter than 5', () => {
    const r = registerInput.safeParse({ ...valid, username: 'ab' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('username')
  })

  it('rejects username longer than 30', () => {
    expect(registerInput.safeParse({ ...valid, username: 'a'.repeat(31) }).success).toBe(false)
  })

  it('accepts username at boundaries (5 and 30)', () => {
    expect(registerInput.safeParse({ ...valid, username: 'alice' }).success).toBe(true)
    expect(registerInput.safeParse({ ...valid, username: 'a'.repeat(30) }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    const r = registerInput.safeParse({ ...valid, email: 'not-an-email' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('email')
  })

  it('rejects password shorter than 6', () => {
    const r = registerInput.safeParse({ ...valid, password: 'abc' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('password')
  })

  it('accepts password exactly 6 characters', () => {
    expect(registerInput.safeParse({ ...valid, password: 'abcdef' }).success).toBe(true)
  })
})

describe('loginInput', () => {
  const valid = { email: 'alice@example.com', password: 'secret123' }

  it('accepts valid data', () => {
    expect(loginInput.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(loginInput.safeParse({ ...valid, email: 'bad' }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(loginInput.safeParse({ ...valid, password: '' }).success).toBe(false)
  })
})

describe('postInput', () => {
  const valid = { title: 'My post' }

  it('accepts valid data', () => {
    expect(postInput.safeParse(valid).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(postInput.safeParse({ title: '' }).success).toBe(false)
  })

  it('rejects title longer than 300', () => {
    expect(postInput.safeParse({ title: 'a'.repeat(301) }).success).toBe(false)
  })

  it('accepts title at boundaries (1 and 300)', () => {
    expect(postInput.safeParse({ title: 'a' }).success).toBe(true)
    expect(postInput.safeParse({ title: 'a'.repeat(300) }).success).toBe(true)
  })

  it('defaults body to empty string when omitted', () => {
    const r = postInput.safeParse({ title: 'My post' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.body).toBe('')
  })

  it('accepts optional body', () => {
    const r = postInput.safeParse({ title: 'My post', body: 'some body text' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.body).toBe('some body text')
  })
})
