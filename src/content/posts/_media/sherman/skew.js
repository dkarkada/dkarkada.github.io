// Interactive 2D illustration of the rank-one skew v' = (I + p̃ qᵀ) v.
// Drag the tips of p̃ and q to see how each
// lattice point v is pushed along p̃ by an amount qᵀv.
//
// Embed with: <div data-skew-widget></div> plus a module <script> pointing here.

const RANGE = 3          // world coords span [-RANGE, RANGE] on both axes
const LATTICE = 2        // lattice points span [-LATTICE, LATTICE]
const STEP = 0.5         // lattice spacing
const HIT_PX = 22        // pointer radius for grabbing a handle
const MAX_PX = 560       // max canvas width

const STYLE = `
.skew-widget { margin: 0 auto; max-width: ${MAX_PX}px; }
.skew-widget canvas { width: 100%; aspect-ratio: 1; touch-action: none; cursor: default; }
.skew-widget canvas.grab { cursor: grab; }
.skew-widget canvas.grabbing { cursor: grabbing; }
.skew-figure figcaption {
  max-width: ${MAX_PX}px; margin: 0.4em auto 0;
  font-size: 0.9rem; text-align: justify; color: oklch(var(--color-secondary-params) / 0.8);
}
.skew-figure figcaption p { font-size: inherit; margin: 0; }
`

function injectStyle() {
  if (document.getElementById('skew-widget-style')) return
  const el = document.createElement('style')
  el.id = 'skew-widget-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}


function setup(root) {
  if (root.dataset.skewReady) return
  root.dataset.skewReady = '1'
  root.classList.add('skew-widget')

  const state = { p: [1.2, 0.4], q: [0.3, 0.5] }

  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Lattice points and their images under the skew I + p̃ qᵀ. Drag the tips of p̃ and q to change them.')
  root.append(canvas)

  let ctx, size = 0
  const toPx = ([x, y]) => [(x + RANGE) / (2 * RANGE) * size, (RANGE - y) / (2 * RANGE) * size]
  const toWorld = (px, py) => [px / size * 2 * RANGE - RANGE, RANGE - py / size * 2 * RANGE]

  function resize() {
    const dpr = window.devicePixelRatio || 1
    size = canvas.clientWidth
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function arrow(from, to, color, width, head, alpha = 1) {
    const [x0, y0] = toPx(from), [x1, y1] = toPx(to)
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (len < 1) return
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len
    const h = Math.min(head, len * 0.5)
    ctx.globalAlpha = alpha
    ctx.strokeStyle = ctx.fillStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1 - ux * h * 0.8, y1 - uy * h * 0.8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 - ux * h - uy * h * 0.45, y1 - uy * h + ux * h * 0.45)
    ctx.lineTo(x1 - ux * h + uy * h * 0.45, y1 - uy * h - ux * h * 0.45)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }

  function draw() {
    if (!ctx || !size) return
    const fg = cssVar('--color-primary')
    const muted = cssVar('--color-secondary')
    const pColor = cssVar('--color-widget-accent')
    const qColor = cssVar('--color-caution')
    const [p, q] = [state.p, state.q]

    ctx.clearRect(0, 0, size, size)

    // Axes.
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = muted
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(...toPx([-RANGE, 0])); ctx.lineTo(...toPx([RANGE, 0]))
    ctx.moveTo(...toPx([0, -RANGE])); ctx.lineTo(...toPx([0, RANGE]))
    ctx.stroke()

    // Fixed line qᵀv = 0: these points don't move.
    const qn = Math.hypot(q[0], q[1])
    if (qn > 1e-9) {
      const d = [-q[1] / qn * 2 * RANGE, q[0] / qn * 2 * RANGE]
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = qColor
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.moveTo(...toPx([-d[0], -d[1]])); ctx.lineTo(...toPx(d))
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1

    // Lattice points v (hollow), their images v' (filled), and faint arrows v → v'.
    const r = Math.max(2, size / 180)
    for (let i = -LATTICE; i <= LATTICE + 1e-9; i += STEP) {
      for (let j = -LATTICE; j <= LATTICE + 1e-9; j += STEP) {
        const v = [i, j]
        const s = q[0] * i + q[1] * j
        const w = [i + s * p[0], j + s * p[1]]
        arrow(v, w, fg, 1, 6, 0.28)
        const [vx, vy] = toPx(v), [wx, wy] = toPx(w)
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = fg
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(vx, vy, r, 0, 2 * Math.PI); ctx.stroke()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = fg
        ctx.beginPath(); ctx.arc(wx, wy, r, 0, 2 * Math.PI); ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    // The vectors p̃ and q, with draggable tips.
    const font = `italic ${Math.round(Math.max(14, size / 26))}px ${cssVar('--font-serif') || 'serif'}`
    for (const [vec, color, name] of [[p, pColor, 'p̃'], [q, qColor, 'q']]) {
      arrow([0, 0], vec, color, 2.5, 11)
      const [x, y] = toPx(vec)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.stroke()
      const n = Math.hypot(vec[0], vec[1]) || 1
      ctx.fillStyle = color
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, x + vec[0] / n * 18, y - vec[1] / n * 18)
    }

  }

  // Dragging.
  let dragging = null, grabOffset = [0, 0]
  function pick(e) {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    let best = null, bestD = HIT_PX
    for (const key of ['q', 'p']) {
      const [x, y] = toPx(state[key])
      const d = Math.hypot(mx - x, my - y)
      if (d < bestD) { best = key; bestD = d }
    }
    return { key: best, mx, my }
  }
  canvas.addEventListener('pointerdown', e => {
    const { key, mx, my } = pick(e)
    if (!key) return
    dragging = key
    const [x, y] = toPx(state[key])
    grabOffset = [x - mx, y - my]
    canvas.setPointerCapture(e.pointerId)
    canvas.classList.add('grabbing')
    e.preventDefault()
  })
  canvas.addEventListener('pointermove', e => {
    const { key, mx, my } = pick(e)
    if (!dragging) { canvas.classList.toggle('grab', !!key); return }
    const [x, y] = toWorld(mx + grabOffset[0], my + grabOffset[1])
    const lim = RANGE - 0.2
    state[dragging] = [Math.max(-lim, Math.min(lim, x)), Math.max(-lim, Math.min(lim, y))]
    draw()
  })
  const release = () => { dragging = null; canvas.classList.remove('grabbing') }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)

  // Redraw on resize and on light/dark theme switches; stop once the page navigates away.
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  const mo = new MutationObserver(() => {
    if (!canvas.isConnected) { mo.disconnect(); ro.disconnect(); return }
    draw()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

function init() {
  injectStyle()
  document.querySelectorAll('[data-skew-widget]').forEach(setup)
}

init()
// The site uses Astro's ClientRouter, so module scripts run once; re-init after each navigation.
document.addEventListener('astro:page-load', init)
