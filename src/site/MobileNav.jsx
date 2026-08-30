import { useEffect, useState } from 'react'

/*
 * The narrow-viewport nav.
 *
 * Below the breakpoint the inline links are dropped — they are positioned at
 * the frame's own x, which stops meaning anything once the frame is a phone —
 * so this takes over. The trigger is two rules that become a cross, which is
 * the same hairline vocabulary the rest of the page is drawn in rather than a
 * borrowed icon.
 */
export default function MobileNav({ items, current }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        className={`mnav__trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {open ? (
        <nav className="mnav__sheet">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`mnav__link${item.label === current ? ' is-active' : ''}`}
              onClick={() => {
                setOpen(false)
                item.onSelect?.()
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}
    </>
  )
}
