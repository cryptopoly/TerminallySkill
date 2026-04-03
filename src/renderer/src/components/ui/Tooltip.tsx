import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  /** Optional extra classes for the tooltip bubble (e.g. custom width) */
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0, flipBelow: false })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setVisible(false), 200)
  }, [])

  const show = useCallback(() => {
    cancelHide()
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    showTimerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const flipBelow = rect.top < 120
      setCoords({
        x: rect.left + rect.width / 2,
        y: flipBelow ? rect.bottom + 8 : rect.top - 8,
        flipBelow
      })
      setVisible(true)
    }, 150)
  }, [cancelHide])

  // After the tooltip renders, clamp it so it never overflows the viewport edges
  useEffect(() => {
    if (!visible || !tooltipRef.current) return
    const tip = tooltipRef.current.getBoundingClientRect()
    const pad = 8
    let dx = 0
    if (tip.right > window.innerWidth - pad) dx = window.innerWidth - pad - tip.right
    if (tip.left + dx < pad) dx = pad - tip.left
    if (dx !== 0) {
      tooltipRef.current.style.transform = `translateX(calc(-50% + ${dx}px))${coords.flipBelow ? '' : ' translateY(-100%)'}`
    }
  }, [visible, coords])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        className="inline-flex"
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[100]"
            style={{
              left: coords.x,
              top: coords.y,
              transform: coords.flipBelow
                ? 'translateX(-50%)'
                : 'translateX(-50%) translateY(-100%)'
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <div className={`bg-surface-light border border-surface-border rounded-lg shadow-xl shadow-black/40 px-3 py-2 text-xs text-gray-300 w-[18rem] max-w-[min(18rem,calc(100vw-1rem))] whitespace-normal break-words select-text cursor-text ${className ?? ''}`}>
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
