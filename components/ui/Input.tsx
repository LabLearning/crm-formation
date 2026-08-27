'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/** Collage dans un champ date natif : « 12/05/1985 », « 12-05-85 » ou ISO
 *  sont convertis — le navigateur refuse sinon tout copier-coller. */
function collerDate(e: React.ClipboardEvent<HTMLInputElement>) {
  const texte = e.clipboardData.getData('text').trim()
  let iso: string | null = null
  let m = texte.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/)
  if (m) {
    let [, j, mo, a] = m
    if (a.length === 2) a = (Number(a) > 30 ? '19' : '20') + a
    iso = `${a}-${mo.padStart(2, '0')}-${j.padStart(2, '0')}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(texte)) {
    iso = texte
  }
  if (!iso) return
  e.preventDefault()
  const input = e.currentTarget
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, iso)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-surface-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'input-base',
            error && 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
            className
          )}
          onPaste={props.type === 'date' ? collerDate : props.onPaste}
          {...props}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
