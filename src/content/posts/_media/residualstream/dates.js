// 3D PCA of how a base LLM represents the 365 calendar dates, layer by layer,
// from data precomputed by widget-src/residualstream/{extract,pca}.py. Each
// marker is one date (its residual-stream vector at the final token, averaged
// over ~20 prompt templates), colored around the hue wheel by day of year.
// The cloud turns slowly; drag to look around (it springs back on release).
// The slider picks the layer; play sweeps through depth on a loop. Buttons
// switch between prompt styles (how the date is written), morphing between
// them. The faint lines are fixed PC1-3 axes: each layer is drawn in its own
// PC basis (signs matched to the neighboring layer), so as the principal
// directions change through depth, the cloud rotates within fixed axes.
//
// Embed with: <div data-dates-widget data-src={url of dates-pca.json}></div>
// plus a module <script> pointing here.

const MAX_PX = 560       // max widget width
const SPIN = 0.12        // idle rotation speed (rad/s)
const PITCH = 0.32       // resting camera elevation (rad)
const DRAG_RAD = 0.008   // camera rotation per dragged pixel (rad)
const SPRING_S = 0.15    // time constant of the snap back after a drag (s)
const LAYER_RATE = 2.5   // layers per second while playing
const EASE_S = 0.12      // time constant for slider-driven layer changes (s)
const HOLD_S = 1.2       // pause on the last layer before looping
const CAMERA = 4         // camera distance, in units of the cloud's radius
const ASPECT = 0.75      // canvas height / width (the spin is horizontal, so extra height is wasted)
const FILL = 0.56        // the cloud's radius as a fraction of the canvas height
const MORPH_S = 0.7      // duration of the morph between prompt styles (s)
const AXIS_LEN = 1.1     // PC axis half-length, in units of the cloud's radius
const HIT_PX = 14        // hover radius for the date tooltip
const HUE_JAN = 250      // OKLCH hue of January 1; hue decreases through the year
const TW = 16            // slider knob diameter (px)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const DATES = MONTHS.flatMap((m, i) => Array.from({ length: MONTH_DAYS[i] }, (_, d) => `${m} ${d + 1}`))

const STYLE = `
.dates-widget { margin: 0 auto; max-width: ${MAX_PX}px; position: relative; }
.dates-widget canvas { width: 100%; display: block; touch-action: none; cursor: grab; }
.dates-widget canvas.grabbing { cursor: grabbing; }
.dates-widget .dates-controls {
  display: flex; align-items: center; gap: 0.6em; margin-top: 0.2em;
  color: oklch(var(--color-widget-text-params) / 0.8); font-family: var(--font-widget); font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.dates-widget .dates-play, .dates-widget .dates-formats button {
  border: 1px solid; border-color: var(--widget-rim-hi) var(--widget-rim-lo) var(--widget-rim-lo) var(--widget-rim-hi);
  background: var(--color-background); box-shadow: var(--widget-raise);
  color: inherit; font: inherit; cursor: pointer;
  transition: color 150ms, box-shadow 150ms;
}
.dates-widget .dates-play {
  flex: none; width: 2em; height: 2em; padding: 0; border-radius: 50%;
  display: grid; place-items: center;
}
.dates-widget .dates-play svg { width: 0.8em; height: 0.8em; fill: currentColor; }
.dates-widget .dates-formats { flex-wrap: wrap; justify-content: center; gap: 0.3em 0.4em; margin-top: 0.55em; }
.dates-widget .dates-formats button { padding: 0.15em 0.65em; border-radius: 0.45em; }
.dates-widget .dates-play:hover, .dates-widget .dates-formats button:hover { color: var(--color-widget-text); }
.dates-widget .dates-play:active, .dates-widget .dates-play[aria-pressed=true],
.dates-widget .dates-formats button[aria-pressed=true] {
  color: var(--color-widget-text); box-shadow: var(--widget-sink);
  border-color: var(--widget-rim-lo) var(--widget-rim-hi) var(--widget-rim-hi) var(--widget-rim-lo);
}
/* Slider: a sunken groove that fills with the accent up to a raised knob. --p
   (0..1) is set from the value in syncControls(); TW is the knob width. */
.dates-widget input[type=range] {
  flex: 1; min-width: 0; margin: 0; height: 26px; cursor: pointer;
  -webkit-appearance: none; appearance: none; background: transparent;
}
.dates-widget input[type=range]::-webkit-slider-runnable-track {
  height: 6px; border-radius: 3px; box-shadow: var(--widget-groove);
  background: linear-gradient(to right, oklch(var(--color-widget-accent-params) / 0.7) calc(${TW / 2}px + (100% - ${TW}px) * var(--p, 0.5)), var(--color-background) 0);
}
.dates-widget input[type=range]::-moz-range-track { height: 6px; border-radius: 3px; background: var(--color-background); box-shadow: var(--widget-groove); }
.dates-widget input[type=range]::-moz-range-progress { height: 6px; border-radius: 3px; background: oklch(var(--color-widget-accent-params) / 0.7); }
.dates-widget input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: ${TW}px; height: ${TW}px; margin-top: ${(6 - TW) / 2}px; border-radius: 50%;
  background: radial-gradient(circle, var(--color-widget-accent) 0 2.5px, transparent 3px), linear-gradient(135deg, oklch(1 0 0 / 0.05), oklch(0 0 0 / 0.12)), var(--color-background);
  box-shadow: var(--widget-knob-rim), var(--widget-raise);
}
.dates-widget input[type=range]::-moz-range-thumb {
  width: ${TW}px; height: ${TW}px; border: 0; border-radius: 50%;
  background: radial-gradient(circle, var(--color-widget-accent) 0 2.5px, transparent 3px), linear-gradient(135deg, oklch(1 0 0 / 0.05), oklch(0 0 0 / 0.12)), var(--color-background);
  box-shadow: var(--widget-knob-rim), var(--widget-raise);
}
.dates-widget input[type=range]:focus-visible { outline: 2px solid oklch(var(--color-widget-text-params) / 0.6); outline-offset: 2px; }
.dates-widget .dates-layer { flex: none; min-width: 5.2em; }
.dates-widget .dates-tip {
  position: absolute; pointer-events: none; white-space: nowrap; display: none;
  padding: 0.15em 0.5em; border-radius: 0.3em; font-family: var(--font-widget); font-size: 0.8rem;
  background: var(--color-background); color: var(--color-widget-text);
  border: 1px solid oklch(var(--color-widget-text-params) / 0.3);
  transform: translate(-50%, calc(-100% - 10px));
}
figure.dates-figure { margin-top: 3rem; margin-bottom: 3rem; }
.dates-figure figcaption {
  max-width: ${MAX_PX}px; margin: 0.4em auto 0;
  font-size: 0.9rem; text-align: justify; color: oklch(var(--color-text-params) / 0.8);
}
.dates-figure figcaption p { font-size: inherit; margin: 0; }
`

const PLAY_ICON = '<svg viewBox="0 0 10 10"><path d="M2 1 L9 5 L2 9 Z"/></svg>'
const PAUSE_ICON = '<svg viewBox="0 0 10 10"><path d="M2 1 H4 V9 H2 Z M6 1 H8 V9 H6 Z"/></svg>'

function injectStyle() {
  if (document.getElementById('dates-widget-style')) return
  const el = document.createElement('style')
  el.id = 'dates-widget-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function unpack({ scale, data }) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  return Float32Array.from(new Int8Array(bytes.buffer), v => v / 127 * scale)
}

// Hue wheel through the year: blue in January, orange in July, red in September.
function dateColors() {
  const dark = document.documentElement.classList.contains('dark')
  const [L, C] = dark ? [0.74, 0.14] : [0.6, 0.16]
  return DATES.map((_, i) => `oklch(${L} ${C} ${(HUE_JAN - 360 * i / DATES.length + 360) % 360})`)
}

function setup(root, data) {
  root.classList.add('dates-widget')
  const [nLayers, nDates] = data.formats[0].coords.shape
  const formats = data.formats.map((f) => {
    const coords = unpack(f.coords)
    // Per-layer cloud radius (98th percentile, so a few outlying dates don't shrink the rest).
    const radius = Array.from({ length: nLayers }, (_, l) => {
      const r = Array.from({ length: nDates }, (_, i) => Math.hypot(...coords.subarray((l * nDates + i) * 3, (l * nDates + i) * 3 + 3))).sort((a, b) => a - b)
      return r[Math.floor(0.98 * (nDates - 1))]
    })
    return { ...f, coords, radius }
  })

  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'A slowly rotating 3D scatter plot of 365 points, one per calendar date, colored by time of year, with faint lines for the principal axes. Drag to rotate, hover to see dates; the controls below select the layer and the prompt style.')
  const tip = document.createElement('div')
  tip.className = 'dates-tip'
  const controls = document.createElement('div')
  controls.className = 'dates-controls'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dates-play'
  const slider = Object.assign(document.createElement('input'), { type: 'range', min: 1, max: nLayers, step: 1, value: data.defaultLayer })
  slider.setAttribute('aria-label', 'Layer')
  const layerLabel = document.createElement('span')
  layerLabel.className = 'dates-layer'
  controls.append(button, slider, layerLabel)
  const formatRow = document.createElement('div')
  formatRow.className = 'dates-controls dates-formats'
  formatRow.setAttribute('role', 'group')
  formatRow.setAttribute('aria-label', 'Prompt style')
  // formatRow.append('Date format:')
  const formatButtons = formats.map((f, k) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: `“${f.label}”` })
    b.addEventListener('click', () => setFormat(k))
    return b
  })
  formatRow.append(...formatButtons)
  root.append(canvas, tip, controls, formatRow)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let ctx, W = 0, H = 0, colors, palette
  let playing = false, hold = 0
  let layerPos = data.defaultLayer, layerTarget = data.defaultLayer
  let yaw = 0, dragYaw = 0, dragPitch = 0
  let drag = null, pointer = null
  // Morph from formats[fmtFrom] to formats[fmt]; morph runs 0 → 1.
  let fmt = Math.max(0, formats.findIndex(f => f.key === data.defaultFormat)), fmtFrom = fmt, morph = 1
  let visible = false, last = null, raf = null

  function refreshColors() {
    colors = { muted: cssVar('--color-text'), text: cssVar('--color-widget-text'), font: cssVar('--font-widget') || 'monospace' }
    palette = dateColors()
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1
    W = canvas.clientWidth
    if (!W) return
    H = Math.round(W * ASPECT)
    canvas.style.height = `${H}px`
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function setPlaying(p) {
    playing = p
    hold = 0
    button.innerHTML = playing ? PAUSE_ICON : PLAY_ICON
    button.setAttribute('aria-label', playing ? 'Pause depth animation' : 'Play depth animation')
    button.setAttribute('aria-pressed', String(playing))
    if (!playing) layerPos = layerTarget = Math.round(layerPos)
    syncControls()
  }

  function syncControls() {
    const l = Math.round(layerPos)
    slider.value = l
    slider.style.setProperty('--p', (l - 1) / (nLayers - 1))
    layerLabel.textContent = `layer ${l}/${nLayers}`
    formatButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === fmt)))
  }

  function setFormat(k) {
    if (k === fmt) return
    fmtFrom = fmt
    fmt = k
    morph = 0
    syncControls()
  }

  // Screen positions of every date (and the PC axis tips) at the current layer,
  // prompt-style morph, and camera angle.
  const px = new Float32Array(nDates), py = new Float32Array(nDates), pz = new Float32Array(nDates)
  const order = Array.from({ length: nDates }, (_, i) => i)
  let axes = []
  function project() {
    const x = Math.min(Math.max(layerPos - 1, 0), nLayers - 1)
    const i0 = Math.floor(x), i1 = Math.min(i0 + 1, nLayers - 1), f = x - i0
    const m = morph * morph * (3 - 2 * morph)
    const [A, B] = [formats[fmtFrom], formats[fmt]]
    // Interpolate a per-layer quantity across layers, then across prompt styles.
    const mix = get => m >= 1 ? get(B, i0) * (1 - f) + get(B, i1) * f : (get(A, i0) * (1 - f) + get(A, i1) * f) * (1 - m) + (get(B, i0) * (1 - f) + get(B, i1) * f) * m
    const a = yaw + dragYaw, b = PITCH + dragPitch
    const [ca, sa, cb, sb] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)]
    const R = mix((F, l) => F.radius[l])
    const s = H * FILL / R * (CAMERA - 1) / CAMERA
    // PC1 → right, PC2 → up, PC3 → toward the viewer; yaw about the vertical, then pitch.
    const toScreen = ([u, v, w]) => {
      const x1 = ca * u + sa * w, z1 = -sa * u + ca * w
      const y2 = cb * v - sb * z1, z2 = sb * v + cb * z1
      const persp = CAMERA / Math.max(1, CAMERA - z2 / R)
      return [W / 2 + s * persp * x1, H / 2 - s * persp * y2, z2 / R]
    }
    for (let i = 0; i < nDates; i++) {
      [px[i], py[i], pz[i]] = toScreen([0, 1, 2].map(k => mix((F, l) => F.coords[(l * nDates + i) * 3 + k])))
    }
    order.sort((p, q) => pz[p] - pz[q])
    axes = [0, 1, 2].map((k) => {
      const dir = [0, 1, 2].map(j => (j === k ? AXIS_LEN * R : 0))
      return [toScreen(dir), toScreen(dir.map(c => -c))]
    })
  }

  function hovered() {
    if (!pointer || drag) return -1
    let best = -1, bestD = HIT_PX
    // Front-most first, so overlapping markers resolve to the visible one.
    for (let k = nDates - 1; k >= 0; k--) {
      const i = order[k]
      const d = Math.hypot(px[i] - pointer[0], py[i] - pointer[1])
      if (d < bestD - 2) { best = i; bestD = d }
    }
    return best
  }

  function draw() {
    if (!ctx || !W) return
    project()
    ctx.clearRect(0, 0, W, H)
    const r = Math.max(2.2, W / 150)
    const fs = Math.round(Math.max(11, W / 40))

    // PC axes: faint lines through the centroid, labeled at the positive end.
    ctx.strokeStyle = colors.muted
    ctx.fillStyle = colors.text
    ctx.lineWidth = 1
    ctx.font = `italic ${Math.round(fs * 0.85)}px ${colors.font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    axes.forEach(([[x0, y0], [x1, y1]], k) => {
      ctx.globalAlpha = 0.28
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
      const len = Math.hypot(x0 - x1, y0 - y1) || 1
      ctx.globalAlpha = 0.5
      const lx = Math.max(1.5 * fs, Math.min(W - 1.5 * fs, x0 + (x0 - x1) / len * fs))
      const ly = Math.max(1.8 * fs, Math.min(H - 0.7 * fs, y0 + (y0 - y1) / len * fs))
      ctx.fillText(`PC${k + 1}`, lx, ly)
    })
    ctx.globalAlpha = 1
    for (const i of order) {
      const depth = Math.max(0, Math.min(1, (pz[i] + 1) / 2))   // 0 at the back, 1 at the front
      ctx.globalAlpha = 0.45 + 0.5 * depth
      ctx.fillStyle = palette[i]
      ctx.beginPath(); ctx.arc(px[i], py[i], r * (0.8 + 0.4 * depth), 0, 2 * Math.PI); ctx.fill()
    }
    ctx.globalAlpha = 1

    const h = hovered()
    if (h >= 0) {
      ctx.strokeStyle = colors.muted
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(px[h], py[h], r * 2.2, 0, 2 * Math.PI); ctx.stroke()
      tip.style.display = 'block'
      tip.style.left = `${px[h]}px`
      tip.style.top = `${py[h]}px`
      tip.textContent = DATES[h]
    }
    else {
      tip.style.display = 'none'
    }

    // Month key: initials in each month's color.
    ctx.font = `${fs}px ${colors.font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let day = 0
    MONTHS.forEach((m, k) => {
      ctx.fillStyle = palette[day + 14]
      ctx.fillText(m[0], fs * (0.6 + 1.05 * k), fs * 0.3)
      day += MONTH_DAYS[k]
    })
    ctx.globalAlpha = 0.6
    ctx.fillStyle = colors.text
    ctx.textAlign = 'right'
    const l = Math.round(layerPos)
    ctx.fillText(`PC 1–3: ${Math.round(100 * formats[fmt].evr[l - 1].reduce((a, b) => a + b, 0))}% var.`, W - fs * 0.3, fs * 0.3)
    ctx.globalAlpha = 1
  }

  function step(dt) {
    morph = Math.min(1, morph + dt / MORPH_S)
    if (!drag) {
      yaw += (reduceMotion ? 0 : SPIN) * dt
      const k = Math.exp(-dt / SPRING_S)
      dragYaw *= k
      dragPitch *= k
    }
    const before = Math.round(layerPos)
    if (playing) {
      if (layerPos >= nLayers) {
        hold += dt
        if (hold >= HOLD_S) { layerPos = 1; hold = 0 }
      }
      else {
        layerPos = Math.min(nLayers, layerPos + LAYER_RATE * dt)
      }
    }
    else {
      layerPos = layerTarget + (layerPos - layerTarget) * Math.exp(-dt / EASE_S)
      if (Math.abs(layerPos - layerTarget) < 1e-3) layerPos = layerTarget
    }
    if (Math.round(layerPos) !== before) syncControls()
  }

  function frame(now) {
    raf = null
    if (!canvas.isConnected) return
    if (last !== null) step(Math.min(0.1, (now - last) / 1000))
    last = now
    draw()
    schedule()
  }

  function schedule() {
    if (visible && raf === null) raf = requestAnimationFrame(frame)
    if (!visible) last = null
  }

  button.addEventListener('click', () => setPlaying(!playing))
  slider.addEventListener('input', () => {
    layerTarget = Number(slider.value)
    if (playing) { layerPos = layerTarget; hold = 0 }
    syncControls()
    draw()
  })

  // Drag rotates the camera; release lets it spring back to the idle orbit.
  const local = e => {
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  canvas.addEventListener('pointerdown', (e) => {
    pointer = local(e)
    drag = { x: e.clientX, y: e.clientY, yaw: dragYaw, pitch: dragPitch, moved: false }
    canvas.setPointerCapture(e.pointerId)
    canvas.classList.add('grabbing')
    e.preventDefault()
  })
  canvas.addEventListener('pointermove', (e) => {
    pointer = local(e)
    if (!drag) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    if (Math.hypot(dx, dy) > 3) drag.moved = true
    dragYaw = drag.yaw + dx * DRAG_RAD
    dragPitch = Math.max(-1.4 - PITCH, Math.min(1.4 - PITCH, drag.pitch + dy * DRAG_RAD))
  })
  const release = (e) => {
    // A tap (no drag) on touch keeps the tooltip at the tapped point.
    if (drag && !drag.moved && e.pointerType !== 'mouse') pointer = local(e)
    else if (e.pointerType !== 'mouse') pointer = null
    drag = null
    canvas.classList.remove('grabbing')
  }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) pointer = null })

  refreshColors()
  setPlaying(false)

  // Redraw on resize and theme switches; animate only while on screen.
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  // Canvas text doesn't reflow when a web font arrives, so redraw once the widget font has loaded.
  const font = cssVar('--font-widget')
  if (font && document.fonts) Promise.all([`1em ${font}`, `italic 1em ${font}`].map(f => document.fonts.load(f))).then(() => { if (canvas.isConnected) draw() })
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    schedule()
  })
  io.observe(canvas)
  const mo = new MutationObserver(() => {
    if (!canvas.isConnected) { mo.disconnect(); ro.disconnect(); io.disconnect(); return }
    refreshColors()
    draw()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

function init() {
  injectStyle()
  document.querySelectorAll('[data-dates-widget]').forEach(async (root) => {
    if (root.dataset.datesReady) return
    root.dataset.datesReady = '1'
    const data = await (await fetch(root.dataset.src)).json()
    setup(root, data)
  })
}

init()
// The site uses Astro's ClientRouter, so module scripts run once; re-init after each navigation.
document.addEventListener('astro:page-load', init)
