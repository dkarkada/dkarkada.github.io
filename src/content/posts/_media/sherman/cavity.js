// Animation of the cavity method on a random network, from data precomputed by
// widget-src/sherman/cavity-gen.py. Left: a window into the full system, cavity
// site ringed (solid) and its most strongly coupled neighbor ringed (dashed).
// Right, top: the cavity site alone, obeying the single-site equation, with a
// plot of its recent history. Right, bottom: the same for the neighbor, its
// true trajectory against its counterfactual field (its trajectory with the
// cavity site removed). Node color is activity h (dark cerulean negative, bright
// positive), halo size is drive |j|.
//
// With data-view="system" (and cavity-system.json, a wide rectangular window onto
// the same system), it draws only the network in a rounded-rectangle window,
// cavity site ringed, under the equation
// dh/dt = -Ah + j with each symbol in its color in the animation: h in the site
// ramp, A in the edge color, j in the halo color.
//
// Embed with: <div data-cavity-anim data-src={url of cavity.json}></div>
//         or: <div data-cavity-anim data-view="system" data-src={url of cavity-system.json}></div>
// plus a module <script> pointing here.

const MAX_PX = 720       // max canvas width
const STACK_PX = 520     // below this width, stack the panels vertically
const SPEED = 1.5        // simulation time units per second
const LAG_SHOWN = 10     // history shown in the plot (time units)
const NODE_INSET = 0.8   // nodes sit within this fraction of the viewport radius
const FADE_START = 0.86  // outgoing edges turn dashed and fade beyond this radius
const SITE_R = 0.21      // system view: site radius as a fraction of the minimum site spacing
const RECT_MARGIN = 4    // system view: gap between outermost sites and the window edge (site radii)
const RECT_FADE = 5      // system view: outgoing edges fade over this many site radii at the edge
const RECT_CORNER = 4    // system view: window corner radius (site radii)
const TRACE_PX = 1.75    // solid (true) trace width
const DOT_PX = 3.5       // dotted traces (single-site eq., counterfactual field): dot diameter
const DOTS = [0, 7]      // dash pattern for round dots: zero-length dashes, 7px apart

// Panel legends: [text, colors key (null = memory-kernel band), dash]
const SITE_LEGEND = [['true', 'fg', []], ['single-site eq.', 'accent', DOTS], ['memory kernel', null, null]]
const NEIGHBOR_LEGEND = [['true', 'fg', []], ['counterfactual field', 'field', DOTS]]

// The tidepool palette (see the blog-widget skill), OKLCH [L, C, H] per theme.
// Sites ramp from deepwater (neg, h < 0) to shallows (pos, h > 0); halos are
// anemone at haloAlpha.
const PALETTE = {
  dark: { neg: [0.36, 0.08, 240], pos: [0.86, 0.12, 220], halo: [0.78, 0.105, 352], haloAlpha: 0.28 },
  light: { neg: [0.32, 0.08, 240], pos: [0.78, 0.13, 220], halo: [0.65, 0.14, 356], haloAlpha: 0.3 },
}

const STYLE = `
.cavity-anim { margin: 0 auto; max-width: ${MAX_PX}px; }
.cavity-anim canvas { width: 100%; display: block; }
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
  const system = root.dataset.view === 'system'

  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', system
    ? 'A random network of driven sites evolving under dh/dt = -Ah + j. Site color is its activity h, edges are the couplings A, and halo size is the drive j. One site in the middle is ringed.'
    : 'A random network of driven sites. Left: the full system with the cavity site and one neighbor ringed. Right: the cavity site alone, with a plot of its true and predicted trajectories, and below it the neighbor, with its true trajectory and its counterfactual field.')
  root.append(canvas)

  let ctx, W = 0, H = 0, layout
  // Under reduced motion, show a still frame.
  const playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let t = 0
  let visible = false, last = null, raf = null

  // Two trace panels stacked in the right column (below the network when
  // narrow). Each panel is a title, its legend on its own line, then the plot.
  function computeLayout() {
    if (system) {
      const eqSize = Math.round(Math.min(21, Math.max(15, W / 28)))
      const eqH = eqSize * 1.95 // the fraction spans ~0.05-1.87 eqSize below the top
      // Fit the window's width to the canvas, with a margin of RECT_MARGIN site
      // radii around the sites; its height follows from the data's aspect.
      const [halfW, halfH] = data.window
      const k = SITE_R * data.spacing
      const s = W / 2 / (halfW + RECT_MARGIN * k)
      const rNode = k * s
      const hh = (halfH + RECT_MARGIN * k) * s
      const view = { rect: true, cx: W / 2, cy: eqH + hh, hw: W / 2, hh, s, rNode: Math.max(3, rNode), fade: RECT_FADE * rNode, corner: RECT_CORNER * rNode }
      return { H: eqH + 2 * hh, eqSize, eqY: eqSize * 1.2, full: view }
    }
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

  // Site fill: OKLCH ramp from pal.neg to pal.pos as h goes negative to positive.
  function siteColor(h, pal) {
    const s = (Math.max(-1, Math.min(1, 1.6 * h / hScale)) + 1) / 2
    return `oklch(${pal.neg.map((a, i) => a + (pal.pos[i] - a) * s).join(' ')})`
  }

  // A driven node: halo radius from |j|, fill color from h.
  function node(x, y, r, h, j, colors) {
    const { pal } = colors
    const halo = r * (1.25 + 1.6 * Math.min(1, Math.abs(j) / jScale))
    ctx.globalAlpha = pal.haloAlpha
    ctx.fillStyle = `oklch(${pal.halo.join(' ')})`
    ctx.beginPath(); ctx.arc(x, y, halo, 0, 2 * Math.PI); ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = siteColor(h, pal)
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill()
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = colors.muted
    ctx.lineWidth = 0.75
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Window into the network: a circle { cx, cy, R } in the cavity view, a
  // rounded rectangle { rect, cx, cy, hw, hh, s, rNode, fade, corner } in the
  // system view. `series(k)` gives node k's activity.
  function graph(view, series, colors) {
    const { cx, cy, R } = view
    const s = view.rect ? view.s : R * NODE_INSET
    const px = ([x, y]) => [cx + x * s, cy - y * s]
    const rNode = view.rect ? view.rNode : Math.max(3, R * 0.045)

    ctx.save()
    ctx.beginPath()
    if (!view.rect) ctx.arc(cx, cy, R, 0, 2 * Math.PI)
    else if (ctx.roundRect) ctx.roundRect(cx - view.hw, cy - view.hh, 2 * view.hw, 2 * view.hh, view.corner)
    else ctx.rect(cx - view.hw, cy - view.hh, 2 * view.hw, 2 * view.hh)
    ctx.clip()
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
      const hitRect = (inset) => {
        // Exit point of the ray from (x0, y0) through the window inset by `inset`.
        const ox = x0 - cx, oy = y0 - cy, bx = view.hw - inset, by = view.hh - inset
        const u = Math.max(0, Math.min(dx ? (Math.sign(dx) * bx - ox) / dx : Infinity, dy ? (Math.sign(dy) * by - oy) / dy : Infinity))
        return [x0 + dx * u, y0 + dy * u]
      }
      const [fx, fy] = view.rect ? hitRect(view.fade) : hit(R * FADE_START)
      const [ex, ey] = view.rect ? hitRect(0) : hit(R)
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
      if (k === 0 || (!system && k === data.neighbor)) {
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
      ctx.lineCap = dash.length ? 'round' : 'butt'
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const lag = i * data.dtSite
        ctx.lineTo(toX(lag), toY(sample(series, data.dtSite, t - lag)))
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineCap = 'butt'
    }
    for (const [series, color, dash] of traces) trace(series, color, dash.length ? DOT_PX : TRACE_PX, dash)

    // Legend, on its own line(s) under the panel title.
    const { fs } = legend
    ctx.font = `${fs}px ${colors.font}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    for (const { text, key, dash, x: dx, y: dy } of legend.items) {
      const color = key && colors[key], lx = x + dx, ly = top + dy
      if (color) {
        ctx.strokeStyle = color
        ctx.lineWidth = dash.length ? DOT_PX : TRACE_PX
        ctx.setLineDash(dash)
        ctx.lineCap = dash.length ? 'round' : 'butt'
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + fs * 1.6, ly); ctx.stroke()
        ctx.setLineDash([])
        ctx.lineCap = 'butt'
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

  // dh/dt = -Ah + j, centered at x = cx with its baseline at y, in the post's
  // KaTeX fonts. Symbols take their colors from the animation.
  function equation(cx, y, size, colors) {
    const serif = cssVar('--font-serif') || 'serif'
    const math = `italic ${size}px KaTeX_Math, ${serif}`
    const main = `${size}px KaTeX_Main, ${serif}`
    const { pal } = colors
    // h: a diagonal sweep through the site ramp, deepwater to shallows.
    const hFill = (x, w) => {
      const g = ctx.createLinearGradient(x, y, x + w, y - size * 0.7)
      g.addColorStop(0, `oklch(${pal.neg.join(' ')})`)
      g.addColorStop(1, `oklch(${pal.pos.join(' ')})`)
      return g
    }
    const sp = size * 0.28 // space around = and binary operators
    const tokens = [
      ['frac'],
      [math, 'h', hFill, size * 0.12],
      [main, '=', colors.fg, sp, sp],
      [main, '−', colors.fg],
      [math, 'A', colors.muted],
      [math, 'h', hFill],
      [main, '+', colors.fg, sp, sp],
      [math, 'j', `oklch(${pal.halo.join(' ')})`],
    ]
    ctx.font = math
    const wD = ctx.measureText('d').width, wDt = ctx.measureText('dt').width
    const fracW = Math.max(wD, wDt) + size * 0.24
    const widths = tokens.map(([font, text, , before = 0, after = 0]) => {
      if (font === 'frac') return fracW
      ctx.font = font
      return before + ctx.measureText(text).width + after
    })
    let x = cx - widths.reduce((a, b) => a + b, 0) / 2
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    const axis = y - size * 0.25
    tokens.forEach(([font, text, fill, before = 0], i) => {
      if (font === 'frac') {
        ctx.font = math
        ctx.fillStyle = colors.fg
        ctx.fillText('d', x + (fracW - wD) / 2, axis - size * 0.22)
        ctx.fillText('dt', x + (fracW - wDt) / 2, axis + size * 0.92)
        ctx.fillRect(x + size * 0.06, axis - size * 0.02, fracW - size * 0.12, Math.max(1, size * 0.04))
      }
      else {
        ctx.font = font
        const w = ctx.measureText(text).width
        ctx.fillStyle = typeof fill === 'function' ? fill(x + before, w) : fill
        ctx.fillText(text, x + before, y)
      }
      x += widths[i]
    })
  }

  function draw() {
    if (!ctx || !W) return
    const colors = {
      fg: cssVar('--color-primary'),
      muted: cssVar('--color-secondary'),
      text: cssVar('--color-widget-text'),
      pal: PALETTE[document.documentElement.classList.contains('dark') ? 'dark' : 'light'],
      accent: cssVar('--color-important'),
      field: cssVar('--color-widget-accent'),
      font: cssVar('--font-widget') || 'monospace',
    }
    ctx.clearRect(0, 0, W, H)
    if (system) {
      graph(layout.full, k => sample(hFull[k], data.dtGraph, t), colors)
      equation(W / 2, layout.eqY, layout.eqSize, colors)
      return
    }
    const { full, site, neighbor } = layout
    graph(full, k => sample(hFull[k], data.dtGraph, t), colors)
    tracePanel(site, 0, data.hCavity, [[data.hTrue, colors.fg, []], [data.hCavity, colors.accent, DOTS]], colors, { kernel: true, timeArrow: true })
    tracePanel(neighbor, data.neighbor, data.hNeighbor, [[data.hNeighbor, colors.fg, []], [data.hNeighborCavity, colors.field, DOTS]], colors)
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

  // Redraw on resize and theme switches; animate only while on screen.
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  // Canvas text doesn't reflow when a web font arrives, and the legend's line
  // breaks (and the equation's spacing) depend on text width, so re-lay out
  // once the fonts have loaded.
  const font = cssVar('--font-widget')
  const fonts = system ? ['italic 1em KaTeX_Math', '1em KaTeX_Main'] : [`1em ${font}`]
  if (document.fonts) Promise.all(fonts.map(f => document.fonts.load(f))).then(() => { if (canvas.isConnected) resize() }).catch(() => {})
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
