import { z } from 'zod'

export const registerInput = z.object({
  username: z
    .string()
    .min(5, 'Must be at least 5 characters')
    .max(30, 'Must be at most 30 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Must be at least 6 characters'),
})

export const loginInput = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const postInput = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Must be at most 300 characters'),
  body: z.string().default(''),
})

export type RegisterInput = z.infer<typeof registerInput>
export type LoginInput = z.infer<typeof loginInput>
export type PostInput = z.infer<typeof postInput>
