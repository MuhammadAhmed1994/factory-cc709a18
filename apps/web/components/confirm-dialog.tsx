'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  submitting?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Modal confirmation: initial focus on Cancel, Esc cancels. */
export function ConfirmDialog({ title, children, confirmLabel, submitting, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <div>{children}</div>
        {error ? (
          <div role="alert" className="alert">
            {error}
          </div>
        ) : null}
        <div className="dialog-actions">
          <button type="button" ref={cancelRef} className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-destructive" onClick={onConfirm} disabled={submitting}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}