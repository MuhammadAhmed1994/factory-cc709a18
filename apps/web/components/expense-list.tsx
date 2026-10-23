import Link from 'next/link'
import { CATEGORY_LABELS, formatAmount } from '../lib/api'
import type { Expense } from '../lib/api'

interface ExpenseListProps {
  items: Expense[]
  /** Edit and delete actions; omitted for the compact dashboard variant. */
  onDelete?: (expense: Expense) => void
}

export function CategoryBadge({ category }: { category: Expense['category'] }) {
  return <span className="badge">{CATEGORY_LABELS[category] ?? category}</span>
}

/** One responsive list: rows wrap into stacked cards on narrow screens. */
export function ExpenseList({ items, onDelete }: ExpenseListProps) {
  return (
    <ul className="list" aria-label="Expenses">
      {items.map((expense) => (
        <li key={expense.id} data-testid="expense-row">
          <div className="expense-main">
            <strong>{expense.title}</strong>
            <div className="muted">
              <span>{expense.date}</span> <CategoryBadge category={expense.category} />
            </div>
          </div>
          <div className="expense-side">
            <span className="expense-amount">{formatAmount(expense.amount)}</span>
            {onDelete ? (
              <div className="row-actions">
                <Link className="btn btn-secondary" href={`/expenses/${expense.id}/edit`} aria-label={`Edit ${expense.title}`}>
                  Edit
                </Link>
                <button type="button" className="btn btn-destructive" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense)}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
