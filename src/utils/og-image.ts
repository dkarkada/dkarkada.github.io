// Renders a post's Open Graph card (the preview image Slack, iMessage, Twitter,
// etc. show when a post is linked): 1200x630, the site's dark-mode palette,
// Spectral title and description, and an EB Garamond "dkarkada.xyz" footer.
// Drawn directly with CanvasKit so the layout isn't limited to what
// astro-og-canvas supports. Fonts live in src/assets/og/ (OFL; licenses alongside).
import type { CanvasKit, FontMgr } from 'canvaskit-wasm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Buffer } from 'node:buffer'

const W = 1200
const H = 630
const PAD_X = 88
const PAD_TOP = 92
const FOOTER_H = 120 // band at the bottom holding the rule and the domain

// Dark-mode tokens from src/styles/theme.css (html.dark), as "L C H" params.
const PALETTE = {
  background: '0.18 0.032 280',
  text: '0.85 0.024 75',
  heading: '0.95 0.014 65',
  link: '0.91 0.03 100',
}
const FOOTER_TEXT = 'dkarkada.xyz'

// EB Garamond upright doubles as the fallback for glyphs Spectral lacks (e.g. ⁻).
const FONT_FILES = ['Spectral-Light.ttf', 'Spectral-Medium.ttf', 'EBGaramond-Regular.ttf', 'EBGaramond-Italic.ttf']

/** OKLCH params string ("L C H") to sRGB 0-255. */
function oklchToRgb(params: string): [number, number, number] {
  const [L, C, h] = params.trim().split(/\s+/).map(Number)
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lin.map((x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
  }) as [number, number, number]
}

let ready: Promise<{ ck: CanvasKit, fonts: FontMgr }> | undefined

function init() {
  ready ??= (async () => {
    const require = createRequire(import.meta.url)
    const { default: CanvasKitInit } = await import('canvaskit-wasm/full')
    const ck = await CanvasKitInit({
      locateFile: (file: string) => require.resolve(`canvaskit-wasm/bin/full/${file}`),
    })
    const data = FONT_FILES.map((f) => {
      const buf = readFileSync(path.resolve('src/assets/og', f))
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    })
    const fonts = ck.FontMgr.FromData(...data)
    if (!fonts) throw new Error('og-image: failed to load fonts')
    return { ck, fonts }
  })()
  return ready
}

export async function renderOgImage(title: string, description = ''): Promise<Buffer> {
  const { ck, fonts } = await init()
  const color = (params: string, alpha = 1) => ck.Color(...oklchToRgb(params), alpha)

  const surface = ck.MakeSurface(W, H)
  if (!surface) throw new Error('og-image: failed to create surface')
  const canvas = surface.getCanvas()

  // Ground: the page's night blue, a touch lighter toward the top.
  const bg = new ck.Paint()
  bg.setShader(ck.Shader.MakeLinearGradient(
    [0, 0],
    [0, H],
    [color('0.205 0.036 280'), color(PALETTE.background)],
    null,
    ck.TileMode.Clamp,
  ))
  canvas.drawRect(ck.XYWHRect(0, 0, W, H), bg)

  const contentW = W - 2 * PAD_X
  const paragraph = (
    text: string,
    style: { size: number, colour: string, alpha?: number, weight: 'Light' | 'Medium' | 'Normal', italic?: boolean, lineHeight: number, family: string },
    maxLines?: number,
  ) => {
    const ps = new ck.ParagraphStyle({
      textStyle: {
        color: color(style.colour, style.alpha),
        fontFamilies: [style.family, 'Spectral', 'EB Garamond'],
        fontSize: style.size,
        fontStyle: {
          weight: ck.FontWeight[style.weight],
          slant: style.italic ? ck.FontSlant.Italic : ck.FontSlant.Upright,
        },
        heightMultiplier: style.lineHeight,
      },
      maxLines,
      ellipsis: maxLines ? '…' : undefined,
    })
    const builder = ck.ParagraphBuilder.Make(ps, fonts)
    builder.addText(text)
    const p = builder.build()
    p.layout(contentW)
    builder.delete()
    return p
  }

  // Description: up to three lines, ellipsized.
  const desc = description
    ? paragraph(description, { size: 34, colour: PALETTE.text, alpha: 0.82, weight: 'Light', lineHeight: 1.4, family: 'Spectral' }, 3)
    : undefined
  const descH = desc ? desc.getHeight() : 0
  const gap = desc ? 30 : 0

  // Title: largest size (down to 48) that fits the space left above the footer.
  const avail = H - FOOTER_H - PAD_TOP - 24 - descH - gap
  let titleP
  for (let size = 76; size >= 48; size -= 4) {
    titleP?.delete()
    titleP = paragraph(title, { size, colour: PALETTE.heading, weight: 'Medium', lineHeight: 1.15, family: 'Spectral' })
    if (titleP.getHeight() <= avail)
      break
  }
  canvas.drawParagraph(titleP!, PAD_X, PAD_TOP)
  if (desc)
    canvas.drawParagraph(desc, PAD_X, PAD_TOP + titleP!.getHeight() + gap)
  titleP!.delete()
  desc?.delete()

  // Footer: hairline rule, short amber accent at its start, then the domain.
  const ruleY = H - FOOTER_H
  const rule = new ck.Paint()
  rule.setAntiAlias(true)
  rule.setColor(color(PALETTE.text, 0.18))
  canvas.drawRect(ck.XYWHRect(PAD_X, ruleY, contentW, 1.5), rule)
  rule.setColor(color(PALETTE.link, 0.9))
  canvas.drawRect(ck.XYWHRect(PAD_X, ruleY - 1, 72, 3.5), rule)

  const foot = paragraph(FOOTER_TEXT, { size: 36, colour: PALETTE.link, alpha: 0.9, weight: 'Normal', italic: true, lineHeight: 1, family: 'EB Garamond' })
  canvas.drawParagraph(foot, PAD_X, ruleY + (FOOTER_H - foot.getHeight()) / 2 - 4)
  foot.delete()

  const img = surface.makeImageSnapshot()
  const bytes = img.encodeToBytes(ck.ImageFormat.PNG, 100)
  img.delete()
  surface.dispose()
  if (!bytes) throw new Error('og-image: PNG encoding failed')
  return Buffer.from(bytes)
}
