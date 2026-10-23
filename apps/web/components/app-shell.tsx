'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../lib/api-client'
import { api } from '../lib/api'
import type { User } from '../lib/api'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/summary', label: 'Summary' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true
    api
      .me()
      .then((u) => {
        if (active) setUser(u)
      })
      .catch((err: unknown) => {
        if (active && err instanceof ApiError && err.status === 401) router.replace('/login')
      })
    return () => {
      active = false
    }
  }, [router])

  async function logout() {
    try {
      await api.logout()
    } finally {
      router.replace('/login')
    }
  }

  return (
    <>
      <header className="shell-header">
        <div className="shell-bar">
          <Link href="/dashboard" className="shell-logo">
            Expense Tracker
          </Link>
          <nav className="shell-nav" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="shell-user">
            {user ? <span>{user.email}</span> : null}
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  )
}