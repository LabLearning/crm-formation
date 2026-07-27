'use client'

import { useState } from 'react'
import { SearchSelect } from './SearchSelect'

interface Option { value: string; label: string }

/**
 * Version « champ de formulaire » de SearchSelect : gère son état interne et
 * expose la valeur via un input caché nommé, pour être lue dans un FormData
 * comme un <select name="…"> classique — mais avec barre de recherche.
 */
export function SearchSelectField({
  name, options, defaultValue = '', label, placeholder, error, clearable, onValueChange,
}: {
  name: string
  options: Option[]
  defaultValue?: string
  label?: string
  placeholder?: string
  error?: string
  clearable?: boolean
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <div>
      <SearchSelect
        label={label}
        options={options}
        value={value}
        onChange={(v) => { setValue(v); onValueChange?.(v) }}
        placeholder={placeholder}
        error={error}
        clearable={clearable}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
