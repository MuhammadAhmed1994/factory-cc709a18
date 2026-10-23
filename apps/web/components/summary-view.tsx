'use client'

import { useEffect, useState } from 'react'
import { api, CATEGORY_LABELS, formatAmount, localMonth } from '../lib/api'
import type { SummaryData } from '../lib/api'

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function SummaryView() {
  const [month, setMonth] = useState(localMonth())
  const [data, setData] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return
    let active = true
    setError(null)
    api
      .summary(month)
      .then((d) => {
        if (active) setData(d)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error && err.message ? err.message : 'Could not load the summary.')
      })
    return () => {
      active = false
    }
  }, [month])

  const total = data ? Number(data.total) : 0

  return (
    <div>
      <h1>Monthly summary</h1>
      <div className="card filters">
        <button type="button" className="btn btn-secondary" onClick={() => setMonth(shiftMonth(month, -1))}>
          Previous month
        </button>
        <div className="field">
          <label htmlFor="month">Month</label>
          <input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setMonth(shiftMonth(month, 1))}>
          Next month
        </button>
      </div>

      {error ? (
        <div role="alert" className="alert">
          {error}
        </div>
      ) : null}

      {data && !error ? (
        <>
          <div className="card" data-testid="summary-total">
            <div className="muted">Total spent in {data.month}</div>
            <div className="stat-value">{formatAmount(data.total)}</div>
            <div className="muted">{data.count} transactions</div>
          </div>

          <h2>By category</h2>
          {data.count === 0 ? (
            <div className="empty">
              <h3>No expenses this month</h3>
              <p>Nothing was recorded for {data.month}.</p>
            </div>
          ) : null}
          <ul className="list" aria-label="Category breakdown">
            {[...data.breakdown]
              .sort((a, b) => Number(b.total) - Number(a.total))
              .map((row) => {
                const pct = total > 0 ? Math.round((Number(row.total) / total) * 100) : 0
                return (
                  <li key={row.category} data-testid="breakdown-row">
                    <div className="expense-main">
                      <strong>{CATEGORY_LABELS[row.category] ?? row.category}</strong>
                      <div className="muted">
                        {row.count} transactions · {pct}%
                      </div>
                      <div className="bar-track" style={{ marginTop: 4 }}>
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="expense-side">
                      <span className="expense-amount">{formatAmount(row.total)}</span>
                    </div>
                  </li>
                )
              })}
          </ul>
        </>
      ) : null}
    </div>
  )
}