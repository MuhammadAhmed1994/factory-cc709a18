'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, formatAmount, localMonth } from '../lib/api'
import type { DashboardData } from '../lib/api'
import { ExpenseList } from './expense-list'

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .dashboard(localMonth())
      .then((d) => {
        if (active) setData(d)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error && err.message ? err.message : 'Could not load the dashboard.')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <div className="row-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <Link href="/expenses/new" className="btn">
          Add expense
        </Link>
      </div>

      {error ? (
        <div role="alert" className="alert">
          {error}
        </div>
      ) : null}

      {!data && !error ? <p className="muted">Loading dashboard…</p> : null}

      {data ? (
        <>
          <div className="stat-grid">
            <div className="card" data-testid="stat-total">
              <div className="muted">Spent this month</div>
              <div className="stat-value">{formatAmount(data.total)}</div>
            </div>
            <div className="card" data-testid="stat-count">
              <div className="muted">Transactions</div>
              <div className="stat-value">{data.count}</div>
            </div>
          </div>

          <h2>Recent spending</h2>
          {data.recent.length === 0 ? (
            <div className="empty">
              <h3>No expenses yet</h3>
              <p>Add your first expense to see your spending here.</p>
            </div>
          ) : (
            <div className="card">
              <ExpenseList items={data.recent} />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}