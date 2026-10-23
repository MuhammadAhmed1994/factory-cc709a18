'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api-client'
import { api } from '../lib/api'
import { InlineAlert, TextField } from './ui'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isLogin = mode === 'login'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    try {
      if (isLogin) await api.login(email, password)
      else await api.register(email, password)
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Invalid email or password.')
      else if (err instanceof ApiError && err.status === 409) setError('An account with this email already exists.')
      else if (err instanceof ApiError && err.status === 429) setError('Too many attempts. Please try again later.')
      else if (err instanceof ApiError && err.status === 400)
        setError('Enter a valid email and a password of at least 8 characters.')
      else setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card">
        <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
        <form onSubmit={onSubmit} noValidate>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn" disabled={submitting}>
            {isLogin ? 'Log in' : 'Register'}
          </button>
        </form>
        <p className="muted">
          {isLogin ? (
            <>
              No account yet? <Link href="/register">Register</Link>
            </>
          ) : (
            <>
              Already registered? <Link href="/login">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}