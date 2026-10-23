'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Expense, ExpenseInput } from '../lib/api'
import { ConfirmDialog } from './confirm-dialog'
import { ExpenseForm } from './expense-form'
import { useToast } from './toast'
import { formatAmount } from '../lib/api'

export function AddExpense() {
  const router = useRouter()
  const toast = useToast()

  async function submit(input: ExpenseInput) {
    try {
      await api.createExpense(input)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Could not add the expense.')
      throw err
    }
    toast.success('Expense added')
    router.push('/expenses')
  }

  return (
    <div>
      <h1>Add expense</h1>
      <ExpenseForm submitLabel="Add expense" onSubmit={submit} onCancel={() => router.push('/expenses')} />
    </div>
  )
}

export function EditExpense({ id }: { id: string }) {
  const router = useRouter()
  const toast = useToast()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .getExpense(id)
      .then((e) => {
        if (active) setExpense(e)
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
    return () => {
      active = false
    }
  }, [id])

  async function submit(input: ExpenseInput) {
    try {
      await api.updateExpense(id, input)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Could not update the expense.')
      throw err
    }
    toast.success('Expense updated')
    router.push('/expenses')
  }

  async function remove() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteExpense(id)
      toast.success('Expense deleted')
      router.push('/expenses')
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Could not delete the expense.'
      setDeleteError(message)
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  if (notFound)
    return (
      <div className="empty">
        <h2>Expense not found</h2>
        <p>It may have been deleted.</p>
      </div>
    )
  if (!expense) return <p className="muted">Loading expense…</p>

  return (
    <div>
      <h1>Edit expense</h1>
      <ExpenseForm
        initial={{ title: expense.title, amount: expense.amount, date: expense.date, category: expense.category }}
        submitLabel="Save changes"
        onSubmit={submit}
        onCancel={() => router.push('/expenses')}
      />
      <p>
        <button type="button" className="btn btn-destructive" onClick={() => setConfirming(true)}>
          Delete expense
        </button>
      </p>
      {confirming ? (
        <ConfirmDialog
          title="Delete this expense?"
          confirmLabel="Delete"
          submitting={deleting}
          error={deleteError}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        >
          <p>
            {expense.title} · {formatAmount(expense.amount)} · {expense.date}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}