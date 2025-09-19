"use client"

import { useMutation } from '@tanstack/react-query'
import { signIn } from 'next-auth/react'
import { z } from 'zod'

// Validation schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type SignupData = z.infer<typeof signupSchema>
export type LoginData = z.infer<typeof loginSchema>

// Signup mutation
export function useSignup() {
  return useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Signup failed')
      }

      return response.json()
    },
  })
}

// Login mutation
export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (!result?.ok) {
        throw new Error('Login failed')
      }

      return result
    },
  })
}