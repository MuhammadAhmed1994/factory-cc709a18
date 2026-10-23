import type { InputHTMLAttributes, ReactNode } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, id, ...rest }: TextFieldProps) {
  const fieldId = id ?? rest.name ?? label
  const errorId = `${fieldId}-error`
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...rest} />
      {error ? (
        <span id={errorId} className="field-error">
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function InlineAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="alert">
      {children}
    </div>
  )
}