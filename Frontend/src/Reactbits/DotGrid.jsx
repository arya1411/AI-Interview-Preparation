import { useEffect, useRef } from 'react'

/**
 * Animated dot-grid canvas — inspired by the Frame wireframe template hero.
 * Dots pulse and ripple outward from a moving focal point, creating a
 * depth-field / particle-field effect on a pure black background.
 */
export default function DotGrid({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // ── config ────────────────────────────────────────────────────────────────
    const GAP        = 22          // px between dot centres
    const BASE_R     = 1.2         // base dot radius
    const MAX_R      = 5.5         // max dot radius at focal point
    const INFLUENCE  = 180         // px radius of the focal influence
    const SPEED      = 0.0004      // focal point orbit speed
    const PULSE      = 0.0008      // individual dot pulse speed
    const DOT_ALPHA  = 0.55        // base dot opacity

    let animId
    let W, H, cols, rows
    let dots = []
    let t = 0

    const buildGrid = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
      cols = Math.ceil(W / GAP) + 1
      rows = Math.ceil(H / GAP) + 1

      dots = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            x: c * GAP,
            y: r * GAP,
            phase: Math.random() * Math.PI * 2, // individual pulse offset
          })
        }
      }
    }

    const draw = () => {
      t += 1

      // Focal point orbits in a lazy figure-8 (Lissajous)
      const fxRaw = W * 0.5 + Math.sin(t * SPEED * 1.3) * W * 0.28
      const fyRaw = H * 0.5 + Math.sin(t * SPEED * 0.9) * H * 0.28
      const fx = fxRaw
      const fy = fyRaw

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, H)

      for (const d of dots) {
        const dx   = d.x - fx
        const dy   = d.y - fy
        const dist = Math.sqrt(dx * dx + dy * dy)

        // proximity factor 0–1
        const prox = Math.max(0, 1 - dist / INFLUENCE)

        // individual slow pulse
        const pulse = 0.5 + 0.5 * Math.sin(t * PULSE * 60 + d.phase)

        const r     = BASE_R + (MAX_R - BASE_R) * prox * (0.7 + 0.3 * pulse)
        const alpha = DOT_ALPHA + (1 - DOT_ALPHA) * prox * (0.8 + 0.2 * pulse)

        ctx.beginPath()
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    // ── resize observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      buildGrid()
    })
    ro.observe(canvas)

    buildGrid()
    draw()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      style={{ background: '#000' }}
    />
  )
}
