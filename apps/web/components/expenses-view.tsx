'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { api, CATEGORIES, CATEGORY_LABELS, formatAmount } from '../lib/api'
import type { Expense, ExpensePage } from '../lib/api'
import { ConfirmDialog } from './confirm-dialog'
import { ExpenseList } from './expense-list'
import { useToast } from './toast'

const PAGE_SIZE = 20

export function ExpensesView() {
  const toast = useToast()
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ExpensePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Title search is debounced by 300ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setData(await api.listExpenses({ search, category, from, to, page, limit: PAGE_SIZE }))
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : 'Could not load expenses.')
    } finally {
      setLoading(false)
    }
  }, [search, category, from, to, page])

  useEffect(() => {
    void load()
  }, [load])

  const cancelDelete = useCallback(() => {
    setToDelete(null)
    setDeleteError(null)
  }, [])

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteExpense(toDelete.id)
      toast.success('Expense deleted')
      setToDelete(null)
      await load()
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Could not delete the expense.'
      setDeleteError(message)
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = Boolean(search || category || from || to)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div>
      <div className="row-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Expenses</h1>
        <Link href="/expenses/new" className="btn">
          Add expense
        </Link>
      </div>

      <div className="card filters" role="search">
        <div className="field">
          <label htmlFor="search">Search by title</label>
          <input id="search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-from">From</label>
          <input id="filter-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="field">
          <label htmlFor="filter-to">To</label>
          <input id="filter-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="alert">
          {loadError}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="muted">Loading expenses…</p>
      ) : data && data.items.length === 0 ? (
        <div className="empty">
          <h2>{filtered ? 'No matching expenses' : 'No expenses yet'}</h2>
          <p>{filtered ? 'Try changing or clearing your filters.' : 'Add your first expense to get started.'}</p>
        </div>
      ) : data ? (
        <>
          <div className="card">
            <ExpenseList items={data.items} onDelete={setToDelete} />
          </div>
          <nav className="row-actions" aria-label="Pagination" style={{ alignItems: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {data.page} of {totalPages} · {data.total} results
            </span>
            <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </nav>
        </>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          title="Delete this expense?"
          confirmLabel="Delete"
          submitting={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        >
          <p>
            {toDelete.title} · {formatAmount(toDelete.amount)} · {toDelete.date}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}