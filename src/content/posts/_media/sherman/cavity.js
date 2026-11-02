// Animation of the cavity method on a random network, from data precomputed by
// widget-src/sherman/cavity-gen.py. Left: a window into the full system, cavity
// site ringed (solid) and its most strongly coupled neighbor ringed (dashed).
// Right, top: the cavity site alone, obeying the single-site equation, with a
// plot of its recent history. Right, bottom: the same for the neighbor, its
// true trajectory against its cavity field (its trajectory with the cavity site
// removed). Node color is activity h (signed), halo size is drive |j|.
//
// Embed with: <div data-cavity-anim data-src={url of cavity.json}></div>
// plus a module <script> pointing here. Click to pause.

const MAX_PX = 720       // max canvas width
const STACK_PX = 520     // below this width, stack the panels vertically
const SPEED = 1.5        // simulation time units per second
const LAG_SHOWN = 10     // history shown in the plot (time units)
const NODE_INSET = 0.8   // nodes sit within this fraction of the viewport radius
const FADE_START = 0.86  // outgoing edges turn dashed and fade beyond this radius

// Panel legends: [text, colors key (null = memory-kernel band), dash]
const SITE_LEGEND = [['true', 'fg', []], ['single-site eq.', 'accent', [5, 4]], ['memory kernel', null, null]]
const NEIGHBOR_LEGEND = [['true', 'fg', []], ['cavity field', 'field', [5, 4]]]

const STYLE = `
.cavity-anim { margin: 0 auto; max-width: ${MAX_PX}px; }
.cavity-anim canvas { width: 100%; display: block; cursor: pointer; }
.cavity-figure figcaption {
  max-width: ${MAX_PX}px; margin: 0.4em auto 0;
  font-size: 0.9rem; text-align: justify; color: oklch(var(--color-secondary-params) / 0.8);
}
.cavity-figure figcaption p { font-size: inherit; margin: 0; }
`

function injectStyle() {
  if (document.getElementById('cavity-anim-style')) return
  const el = document.createElement('style')
  el.id = 'cavity-anim-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function unpack({ scale, shape, data }) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  const q = new Int8Array(bytes.buffer)
  const [rows, cols] = shape
  return Array.from({ length: rows }, (_, i) => Float32Array.from(q.subarray(i * cols, (i + 1) * cols), v => v / 127 * scale))
}

// Linear interpolation into a periodic series sampled every dt.
function sample(series, dt, t) {
  const n = series.length
  const x = (((t / dt) % n) + n) % n
  const i = Math.floor(x), f = x - i
  return series[i] * (1 - f) + series[(i + 1) % n] * f
}

function setup(root, data) {
  root.classList.add('cavity-anim')
  const hFull = unpack(data.hFull)
  const jAll = unpack(data.j)
  const hScale = data.hFull.scale
  const jScale = data.j.scale
  const nodes = data.nodes

  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'A random network of driven sites. Left: the full system with the cavity site and one neighbor ringed. Right: the cavity site alone, with a plot of its true and predicted trajectories, and below it the neighbor, with its true trajectory and its cavity field. Click to pause.')
  root.append(canvas)

  let ctx, W = 0, H = 0, layout
  let t = 0, playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let visible = false, last = null, raf = null

  // Two trace panels stacked in the right column (below the network when
  // narrow). Each panel is a title, its legend on its own line, then the plot.
  function computeLayout() {
    const gap = W * 0.04
    const wide = W >= STACK_PX
    const left = wide ? (W - gap) / 2 : W
    const panelW = wide ? W - left - gap : W
    const siteLegend = legendLayout(SITE_LEGEND, panelW)
    const neighborLegend = legendLayout(NEIGHBOR_LEGEND, panelW, siteLegend.fs)
    const x = wide ? left + gap : 0
    const y = wide ? 0 : W + gap
    const plotH = wide ? (left - gap - siteLegend.h - neighborLegend.h) / 2 : W * 0.34
    const site = { x, y, w: panelW, h: siteLegend.h + plotH, legend: siteLegend }
    const neighbor = { x, y: y + site.h + gap, w: panelW, h: neighborLegend.h + plotH, legend: neighborLegend }
    return {
      H: wide ? left : neighbor.y + neighbor.h,
      full: { cx: left / 2, cy: left / 2, R: left / 2 },
      site,
      neighbor,
    }
  }

  // Legend entries placed left to right from the panel's left edge, wrapping
  // at maxW. The font shrinks by up to 2px to fit one line before wrapping;
  // pass fs to fix the size instead. Positions are relative to the panel's
  // top-left corner.
  function legendLayout(entries, maxW, fs) {
    const titleFs = Math.round(Math.max(11, W / 52))
    const m = canvas.getContext('2d')
    const place = (fs) => {
      m.font = `${fs}px ${cssVar('--font-widget') || 'monospace'}`
      const items = []
      let lx = 0, row = 0
      for (const [text, key, dash] of entries) {
        const w = fs * 2 + m.measureText(text).width
        if (lx > 0 && lx + w > maxW) { lx = 0; row++ }
        items.push({ text, key, dash, x: lx, y: titleFs * 1.4 + fs * 0.6 + row * fs * 1.5 })
        lx += w + fs
      }
      return { fs, items, rows: row + 1, h: (row + 1) * fs * 1.5 + fs * 0.5 }
    }
    if (fs) return place(fs)
    const fs0 = Math.round(Math.max(10, W / 60))
    let lay = place(fs0)
    for (let f = fs0 - 1; lay.rows > 1 && f >= Math.max(9, fs0 - 2); f--) lay = place(f)
    return lay
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1
    W = canvas.clientWidth
    if (!W) return
    layout = computeLayout()
    H = layout.H
    canvas.style.height = `${H}px`
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function label(text, x, y, colors, align = 'left') {
    ctx.globalAlpha = 0.75
    ctx.fillStyle = colors.text
    ctx.font = `${Math.round(Math.max(11, W / 52))}px ${colors.font}`
    ctx.textAlign = align
    ctx.textBaseline = 'top'
    ctx.fillText(text, x, y)
    ctx.globalAlpha = 1
  }

  // A driven node: halo radius from |j|, fill color and strength from h.
  function node(x, y, r, h, j, colors) {
    const halo = r * (1.25 + 1.6 * Math.min(1, Math.abs(j) / jScale))
    ctx.globalAlpha = 0.13
    ctx.fillStyle = colors.fg
    ctx.beginPath(); ctx.arc(x, y, halo, 0, 2 * Math.PI); ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.bg
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill()
    ctx.globalAlpha = Math.min(1, 1.6 * Math.abs(h) / hScale)
    ctx.fillStyle = h > 0 ? colors.pos : colors.neg
    ctx.fill()
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = colors.muted
    ctx.lineWidth = 0.75
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Window into the network. `series(k)` gives node k's activity.
  function graph({ cx, cy, R }, series, colors) {
    const s = R * NODE_INSET
    const px = ([x, y]) => [cx + x * s, cy - y * s]
    const rNode = Math.max(3, R * 0.045)

    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip()
    ctx.strokeStyle = colors.muted
    ctx.lineCap = 'round'
    for (const [a, b, w] of data.edges) {
      ctx.globalAlpha = 0.15 + 0.4 * Math.abs(w)
      ctx.lineWidth = 0.5 + 1.5 * Math.abs(w)
      ctx.beginPath(); ctx.moveTo(...px(nodes[a])); ctx.lineTo(...px(nodes[b])); ctx.stroke()
    }
    // Edges leaving the window: solid, then dashed and fading toward the rim.
    for (const [a, x, y, w] of data.outEdges) {
      const [x0, y0] = px(nodes[a]), [x1, y1] = px([x, y])
      const dx = x1 - x0, dy = y1 - y0
      const hit = (rad) => {
        // Exit point of the ray from (x0, y0) through the circle of radius `rad`.
        const ox = x0 - cx, oy = y0 - cy
        const A = dx * dx + dy * dy, B = 2 * (ox * dx + oy * dy), C = ox * ox + oy * oy - rad * rad
        const u = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A)
        return [x0 + dx * u, y0 + dy * u]
      }
      const [fx, fy] = hit(R * FADE_START), [ex, ey] = hit(R)
      const alpha = 0.15 + 0.4 * Math.abs(w)
      ctx.lineWidth = 0.5 + 1.5 * Math.abs(w)
      ctx.globalAlpha = alpha
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(fx, fy); ctx.stroke()
      const grad = ctx.createLinearGradient(fx, fy, ex, ey)
      grad.addColorStop(0, colors.muted)
      grad.addColorStop(1, 'transparent')
      ctx.strokeStyle = grad
      ctx.setLineDash([3, 4])
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = colors.muted
    }
    ctx.restore()

    for (let k = nodes.length - 1; k >= 0; k--) {
      const [x, y] = px(nodes[k])
      node(x, y, rNode, series(k), sample(jAll[k], data.dtGraph, t), colors)
      if (k === 0 || k === data.neighbor) {
        ctx.globalAlpha = 0.8
        ctx.strokeStyle = colors.fg
        ctx.lineWidth = k === 0 ? 1.5 : 1.25
        ctx.setLineDash(k === 0 ? [] : [3, 3])
        ctx.beginPath(); ctx.arc(x, y, rNode * 1.9, 0, 2 * Math.PI); ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }
    }
  }

  // One site alone, next to a plot of its history (lag from present). The node
  // shows nodeSeries; traces are [series, color, dash]; kernel adds the
  // memory-kernel band; timeArrow labels the lag axis.
  function tracePanel({ x, y: top, w, h: fullH, legend }, k, nodeSeries, traces, colors, { kernel = false, timeArrow = false } = {}) {
    const y = top + legend.h, h = fullH - legend.h
    const pad = h * 0.12
    const rNode = Math.max(5, h * 0.11)
    const nx = x + rNode * 3, ny = y + h / 2 + pad / 2
    const hNow = sample(nodeSeries, data.dtSite, t)
    node(nx, ny, rNode, hNow, sample(jAll[k], data.dtGraph, t), colors)

    const x0 = nx + rNode * 3, x1 = x + w
    const yMid = ny, half = (h - pad * 2) / 2
    const toX = lag => x0 + (lag / LAG_SHOWN) * (x1 - x0)
    const toY = v => yMid - (v / hScale) * half

    // Memory kernel: a faint band whose width is r(lag) / r(0).
    if (kernel) {
      ctx.globalAlpha = 0.1
      ctx.fillStyle = colors.fg
      ctx.beginPath()
      const kDt = data.dtSite
      for (let i = 0; i < data.kernel.length && i * kDt <= LAG_SHOWN; i++) ctx.lineTo(toX(i * kDt), yMid - data.kernel[i] * half)
      for (let i = Math.min(data.kernel.length - 1, Math.floor(LAG_SHOWN / kDt)); i >= 0; i--) ctx.lineTo(toX(i * kDt), yMid + data.kernel[i] * half)
      ctx.closePath(); ctx.fill()
    }

    ctx.globalAlpha = 0.3
    ctx.strokeStyle = colors.muted
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x0, yMid); ctx.lineTo(x1, yMid); ctx.stroke()
    ctx.globalAlpha = 1

    // Faint link from the node to the present end of the plot.
    ctx.globalAlpha = 0.3
    ctx.setLineDash([2, 3])
    ctx.beginPath(); ctx.moveTo(nx + rNode * 1.4, ny); ctx.lineTo(x0, toY(hNow)); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    const steps = Math.ceil(LAG_SHOWN / data.dtSite)
    const trace = (series, color, width, dash) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.setLineDash(dash)
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const lag = i * data.dtSite
        ctx.lineTo(toX(lag), toY(sample(series, data.dtSite, t - lag)))
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    for (const [series, color, dash] of traces) trace(series, color, 1.75, dash)

    // Legend, on its own line(s) under the panel title.
    const { fs } = legend
    ctx.font = `${fs}px ${colors.font}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    for (const { text, key, dash, x: dx, y: dy } of legend.items) {
      const color = key && colors[key], lx = x + dx, ly = top + dy
      if (color) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.75
        ctx.setLineDash(dash)
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + fs * 1.6, ly); ctx.stroke()
        ctx.setLineDash([])
      }
      else {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = colors.fg
        ctx.fillRect(lx, ly - fs * 0.35, fs * 1.6, fs * 0.7)
        ctx.globalAlpha = 1
      }
      ctx.globalAlpha = 0.75
      ctx.fillStyle = colors.text
      ctx.fillText(text, lx + fs * 2, ly)
      ctx.globalAlpha = 1
    }
    if (timeArrow) {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.globalAlpha = 0.6
      ctx.fillStyle = colors.text
      ctx.fillText('← now · past →', x1, y + h - fs * 1.1)
      ctx.globalAlpha = 1
    }
  }

  function draw() {
    if (!ctx || !W) return
    const colors = {
      fg: cssVar('--color-primary'),
      muted: cssVar('--color-secondary'),
      text: cssVar('--color-widget-text'),
      bg: cssVar('--color-background'),
      pos: cssVar('--color-caution'),
      neg: cssVar('--color-note'),
      accent: cssVar('--color-important'),
      field: cssVar('--color-widget-accent'),
      font: cssVar('--font-widget') || 'monospace',
    }
    ctx.clearRect(0, 0, W, H)
    const { full, site, neighbor } = layout
    graph(full, k => sample(hFull[k], data.dtGraph, t), colors)
    tracePanel(site, 0, data.hCavity, [[data.hTrue, colors.fg, []], [data.hCavity, colors.accent, [5, 4]]], colors, { kernel: true, timeArrow: true })
    tracePanel(neighbor, data.neighbor, data.hNeighbor, [[data.hNeighbor, colors.fg, []], [data.hNeighborCavity, colors.field, [5, 4]]], colors)
    label('full system', full.cx - full.R, full.cy - full.R, colors)
    label('cavity site', site.x, site.y, colors)
    label('neighbor site', neighbor.x, neighbor.y, colors)
  }

  function frame(now) {
    raf = null
    if (!canvas.isConnected) return
    if (last !== null) t = (t + (now - last) / 1000 * SPEED) % data.period
    last = now
    draw()
    schedule()
  }

  function schedule() {
    if (playing && visible && raf === null) raf = requestAnimationFrame(frame)
    if (!(playing && visible)) last = null
  }

  canvas.addEventListener('click', () => {
    playing = !playing
    last = null
    schedule()
  })

  // Redraw on resize and theme switches; animate only while on screen.
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  // Canvas text doesn't reflow when a web font arrives, and the legend's line
  // breaks depend on text width, so re-lay out once the widget font has loaded.
  const font = cssVar('--font-widget')
  if (font && document.fonts) Promise.all([`1em ${font}`].map(f => document.fonts.load(f))).then(() => { if (canvas.isConnected) resize() })
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    schedule()
  })
  io.observe(canvas)
  const mo = new MutationObserver(() => {
    if (!canvas.isConnected) { mo.disconnect(); ro.disconnect(); io.disconnect(); return }
    draw()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

function init() {
  injectStyle()
  document.querySelectorAll('[data-cavity-anim]').forEach(async (root) => {
    if (root.dataset.cavityReady) return
    root.dataset.cavityReady = '1'
    const data = await (await fetch(root.dataset.src)).json()
    setup(root, data)
  })
}

init()
// The site uses Astro's ClientRouter, so module scripts run once; re-init after each navigation.
document.addEventListener('astro:page-load', init)
