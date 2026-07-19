import type { Design, Layer, TextLayer } from './types'
import { getAssetUrl } from './store'

// ─── Renderizador de designs em canvas (miniaturas e exportação PNG/JPG) ──

const imgCache = new Map<string, HTMLImageElement>()

async function loadImage(assetId: string): Promise<HTMLImageElement | undefined> {
  if (imgCache.has(assetId)) return imgCache.get(assetId)
  const url = await getAssetUrl(assetId)
  if (!url) return undefined
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      imgCache.set(assetId, img)
      resolve(img)
    }
    img.onerror = () => resolve(undefined)
    img.src = url
  })
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line)
        line = word
      } else {
        line = test
      }
    }
    out.push(line)
  }
  return out
}

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer) {
  ctx.font = `${l.italic ? 'italic ' : ''}${l.bold ? '700' : '400'} ${l.size}px "${l.font}", sans-serif`
  ctx.fillStyle = l.color
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, l.text, l.w)
  const lineH = l.size * l.lineHeight
  lines.forEach((line, i) => {
    let x = 0
    if (l.align === 'center') x = (l.w - ctx.measureText(line).width) / 2
    if (l.align === 'right') x = l.w - ctx.measureText(line).width
    ctx.fillText(line, x, i * lineH)
  })
}

function roundRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(rad, 0)
  ctx.arcTo(w, 0, w, h, rad)
  ctx.arcTo(w, h, 0, h, rad)
  ctx.arcTo(0, h, 0, 0, rad)
  ctx.arcTo(0, 0, w, 0, rad)
  ctx.closePath()
}

async function drawLayer(ctx: CanvasRenderingContext2D, l: Layer) {
  ctx.save()
  ctx.globalAlpha = l.opacity
  ctx.translate(l.x + l.w / 2, l.y + l.h / 2)
  ctx.rotate((l.rotation * Math.PI) / 180)
  ctx.translate(-l.w / 2, -l.h / 2)

  if (l.type === 'shape') {
    ctx.fillStyle = l.fill
    if (l.shape === 'rect') {
      roundRectPath(ctx, l.w, l.h, l.radius)
      ctx.fill()
    } else if (l.shape === 'circle') {
      ctx.beginPath()
      ctx.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (l.shape === 'triangle') {
      ctx.beginPath()
      ctx.moveTo(l.w / 2, 0)
      ctx.lineTo(l.w, l.h)
      ctx.lineTo(0, l.h)
      ctx.closePath()
      ctx.fill()
    } else {
      // linha
      ctx.fillRect(0, l.h / 2 - Math.max(2, l.h * 0.04), l.w, Math.max(4, l.h * 0.08))
    }
  } else if (l.type === 'image') {
    const img = await loadImage(l.assetId)
    if (img) {
      roundRectPath(ctx, l.w, l.h, l.radius)
      ctx.clip()
      // cover fit
      const scale = Math.max(l.w / img.width, l.h / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (l.w - dw) / 2, (l.h - dh) / 2, dw, dh)
    }
  } else if (l.type === 'icon') {
    ctx.font = `${Math.min(l.w, l.h) * 0.85}px sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(l.glyph, l.w / 2, l.h / 2 + Math.min(l.w, l.h) * 0.05)
  } else if (l.type === 'text') {
    drawText(ctx, l)
  }

  ctx.restore()
}

export async function renderDesign(design: Design, scale: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(design.w * scale)
  canvas.height = Math.round(design.h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = design.bg
  ctx.fillRect(0, 0, design.w, design.h)
  for (const layer of design.layers) {
    await drawLayer(ctx, layer)
  }
  return canvas
}

export async function makeThumb(design: Design): Promise<string> {
  const canvas = await renderDesign(design, 220 / Math.max(design.w, design.h))
  return canvas.toDataURL('image/jpeg', 0.75)
}

export async function exportDesign(
  design: Design,
  format: 'png' | 'jpg',
  scale: number,
): Promise<void> {
  const canvas = await renderDesign(design, scale)
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const url = canvas.toDataURL(mime, 0.92)
  const a = document.createElement('a')
  a.href = url
  a.download = `${design.name.replace(/[^\p{L}\p{N}\-_ ]/gu, '') || 'design'}.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
