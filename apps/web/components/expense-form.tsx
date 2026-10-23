'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { CATEGORIES, CATEGORY_LABELS, localToday } from '../lib/api'
import type { CategoryName, ExpenseInput } from '../lib/api'
import { InlineAlert, TextField } from './ui'

export interface ExpenseFormValues {
  title: string
  amount: string
  date: string
  category: string
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>

const AMOUNT_RE = /^\d{1,7}(\.\d{1,2})?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validateExpense(values: ExpenseFormValues): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {}
  if (!values.title.trim()) errors.title = 'Title is required.'
  const amount = values.amount.trim()
  if (!amount) errors.amount = 'Amount is required.'
  else if (!AMOUNT_RE.test(amount) || Number(amount) <= 0) errors.amount = 'Enter an amount greater than 0 with up to 2 decimals.'
  if (!values.date) errors.date = 'Date is required.'
  else if (!DATE_RE.test(values.date)) errors.date = 'Enter a valid date.'
  if (!values.category) errors.category = 'Select a category.'
  else if (!(CATEGORIES as readonly string[]).includes(values.category)) errors.category = 'Select a valid category.'
  return errors
}

function normalizeAmount(amount: string): string {
  const [whole, frac = ''] = amount.trim().split('.')
  return `${whole}.${frac.padEnd(2, '0')}`
}

interface ExpenseFormProps {
  initial?: ExpenseFormValues
  submitLabel: string
  /** Throws when the request fails; the form shows the message. */
  onSubmit: (input: ExpenseInput) => Promise<void>
  onCancel?: () => void
}

export function ExpenseForm({ initial, submitLabel, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(initial ?? { title: '', amount: '', date: localToday(), category: '' })
  const [errors, setErrors] = useState<ExpenseFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof ExpenseFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const found = validateExpense(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        amount: normalizeAmount(values.amount),
        date: values.date,
        category: values.category as CategoryName,
      })
    } catch (err) {
      setFormError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      {formError ? <InlineAlert>{formError}</InlineAlert> : null}
      <TextField label="Title" name="title" value={values.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
      <TextField
        label="Amount"
        name="amount"
        inputMode="decimal"
        value={values.amount}
        error={errors.amount}
        onChange={(e) => set('amount', e.target.value)}
      />
      <TextField label="Date" name="date" type="date" value={values.date} error={errors.date} onChange={(e) => set('date', e.target.value)} />
      <div className="field">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          value={values.category}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? 'category-error' : undefined}
          onChange={(e) => set('category', e.target.value)}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {errors.category ? (
          <span id="category-error" className="field-error">
            {errors.category}
          </span>
        ) : null}
      </div>
      <div className="row-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}