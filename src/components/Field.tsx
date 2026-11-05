import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: ReactNode
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  wide?: boolean
  hint?: string
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  inputMode = 'decimal',
  wide,
  hint,
}: FieldProps) {
  return (
    <label className={wide ? 'field field-wide' : 'field'}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}
