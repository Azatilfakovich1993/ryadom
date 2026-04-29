import { useState, useRef } from 'react'

export function useSwipeDown(onClose, { threshold = 280, velocityThreshold = 0.9 } = {}) {
  const [ty, setTy] = useState(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const dragging = useRef(false)

  const onTouchStart = (e) => {
    if (e.target.closest('button,a,input,textarea,select,canvas,video')) return
    startY.current = e.touches[0].clientY
    startTime.current = Date.now()
    dragging.current = true
  }

  const onTouchMove = (e) => {
    if (!dragging.current) return
    const d = e.touches[0].clientY - startY.current
    if (d > 0) setTy(d)
  }

  const onTouchEnd = () => {
    if (!dragging.current) return
    dragging.current = false
    const elapsed = Date.now() - startTime.current
    const velocity = elapsed > 0 ? ty / elapsed : 0
    if (ty > threshold || (ty > 120 && velocity > velocityThreshold)) {
      onClose()
    } else {
      setTy(0)
    }
  }

  const handlers = { onTouchStart, onTouchMove, onTouchEnd }
  const style = {
    transform: `translateY(${ty}px)`,
    transition: ty === 0 ? 'transform 0.3s ease' : 'none',
  }

  return { handlers, style, ty }
}
