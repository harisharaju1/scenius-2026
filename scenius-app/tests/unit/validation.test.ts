import { describe, expect, it } from 'vitest'
import { forgotPasswordInput, loginInput, postInput, registerInput, resetPasswordInput } from '@/lib/validation'

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

describe('forgotPasswordInput', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordInput.safeParse({ email: 'alice@example.com' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const r = forgotPasswordInput.safeParse({ email: 'not-an-email' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('email')
  })

  it('rejects an empty email', () => {
    expect(forgotPasswordInput.safeParse({ email: '' }).success).toBe(false)
  })
})

describe('resetPasswordInput', () => {
  const valid = { password: 'newpass1', confirmPassword: 'newpass1' }

  it('accepts matching passwords of sufficient length', () => {
    expect(resetPasswordInput.safeParse(valid).success).toBe(true)
  })

  it('rejects password shorter than 6 characters', () => {
    const r = resetPasswordInput.safeParse({ ...valid, password: 'abc', confirmPassword: 'abc' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('password')
  })

  it('rejects mismatched passwords', () => {
    const r = resetPasswordInput.safeParse({ password: 'newpass1', confirmPassword: 'different' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path[0]).toBe('confirmPassword')
  })

  it('rejects when confirmPassword is empty', () => {
    const r = resetPasswordInput.safeParse({ password: 'newpass1', confirmPassword: '' })
    expect(r.success).toBe(false)
  })

  it('accepts password at the minimum boundary (6 chars)', () => {
    expect(
      resetPasswordInput.safeParse({ password: 'abcdef', confirmPassword: 'abcdef' }).success,
    ).toBe(true)
  })
})

describe('postInput', () => {
  const valid = { title: 'My post', body: '' }

  it('accepts valid data', () => {
    expect(postInput.safeParse(valid).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(postInput.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  it('rejects title longer than 300', () => {
    expect(postInput.safeParse({ ...valid, title: 'a'.repeat(301) }).success).toBe(false)
  })

  it('accepts title at boundaries (1 and 300)', () => {
    expect(postInput.safeParse({ ...valid, title: 'a' }).success).toBe(true)
    expect(postInput.safeParse({ ...valid, title: 'a'.repeat(300) }).success).toBe(true)
  })

  it('accepts empty body', () => {
    expect(postInput.safeParse({ title: 'My post', body: '' }).success).toBe(true)
  })

  it('accepts body with text', () => {
    const r = postInput.safeParse({ title: 'My post', body: 'some body text' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.body).toBe('some body text')
  })
})
