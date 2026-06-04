import { type ReactNode, useRef } from 'react'

type SelectControlProps = {
  icon: ReactNode
  label: string
  children: ReactNode
  value: string
  onChange: (value: string) => void
}

export function SelectControl({ icon, label, children, value, onChange }: SelectControlProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  function openSelect() {
    const select = selectRef.current

    if (!select) {
      return
    }

    select.focus()
    select.showPicker?.()
  }

  return (
    <label
      className="select-control"
      onMouseDown={(event) => {
        if (event.target === selectRef.current) {
          return
        }

        event.preventDefault()
        openSelect()
      }}
    >
      {icon}
      <span>{label}</span>
      <select ref={selectRef} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}
