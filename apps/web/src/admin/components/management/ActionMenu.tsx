import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface ActionItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface ActionMenuProps {
  actions: ActionItem[]
  ariaLabel?: string
}

const ActionMenu = ({ actions, ariaLabel = 'Row actions' }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                a.onClick()
                setOpen(false)
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                a.variant === 'danger' ? 'text-red-600' : 'text-gray-900'
              }`}
              role="menuitem"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionMenu
