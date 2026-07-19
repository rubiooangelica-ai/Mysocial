import { uid, useStore } from './store'
import { FORMATS, type Design, type Layer, type Project, type TextLayer } from './types'

export function blankDesign(projectId: string, formatId: string, name: string): Omit<Design, 'id' | 'updatedAt'> {
  const f = FORMATS.find(x => x.id === formatId) ?? FORMATS[0]
  return {
    projectId,
    name,
    formatId: f.id,
    w: f.w,
    h: f.h,
    bg: '#ffffff',
    layers: [],
    isTemplate: false,
  }
}

// Redimensionamento automático: escala proporcional pela largura e centraliza
// verticalmente; a usuária ajusta manualmente depois se quiser.
export function resizeLayers(layers: Layer[], oldW: number, oldH: number, newW: number, newH: number): Layer[] {
  const s = newW / oldW
  const dy = (newH - oldH * s) / 2
  return layers.map(l => {
    const nl: Layer = {
      ...l,
      id: uid(),
      x: l.x * s,
      y: l.y * s + dy,
      w: l.w * s,
      h: l.h * s,
    }
    if (nl.type === 'text') nl.size = Math.round((l as TextLayer).size * s)
    return nl
  })
}

// Rascunho visual inicial gerado a partir do Kit de Marca (usado pela IA e
// pelo botão "criar design a partir da nota").
export function draftFromBrand(
  project: Project,
  formatId: string,
  title: string,
  subtitle?: string,
): Omit<Design, 'id' | 'updatedAt'> {
  const f = FORMATS.find(x => x.id === formatId) ?? FORMATS[0]
  const brand = project.brand
  const [c1, c2, c3] = [
    brand.colors[0] ?? '#22223b',
    brand.colors[1] ?? '#4a4e69',
    brand.colors[brand.colors.length - 1] ?? '#f2e9e4',
  ]
  const layers: Layer[] = [
    {
      id: uid(), type: 'shape', shape: 'rect', fill: c2, radius: 0,
      x: 0, y: f.h - f.h * 0.24, w: f.w, h: f.h * 0.24, rotation: 0, opacity: 0.25,
    },
    {
      id: uid(), type: 'text',
      text: title || 'Título do post',
      font: brand.headingFont, size: Math.round(f.w * 0.074), color: c3,
      align: 'center', lineHeight: 1.15, bold: true, italic: false,
      x: f.w * 0.08, y: f.h * 0.3, w: f.w * 0.84, h: f.h * 0.3, rotation: 0, opacity: 1,
    },
  ]
  if (subtitle) {
    layers.push({
      id: uid(), type: 'text', text: subtitle,
      font: brand.bodyFont, size: Math.round(f.w * 0.034), color: c3,
      align: 'center', lineHeight: 1.4, bold: false, italic: false,
      x: f.w * 0.1, y: f.h * 0.62, w: f.w * 0.8, h: f.h * 0.2, rotation: 0, opacity: 0.92,
    })
  }
  if (brand.logoAssetId) {
    const s = f.w * 0.12
    layers.push({
      id: uid(), type: 'image', assetId: brand.logoAssetId, radius: 12,
      x: f.w / 2 - s / 2, y: f.h * 0.06, w: s, h: s, rotation: 0, opacity: 1,
    })
  }
  return { projectId: project.id, name: title || 'Rascunho', formatId: f.id, w: f.w, h: f.h, bg: c1, layers, isTemplate: false }
}

export function instantiateTemplate(tpl: Design, name: string): Omit<Design, 'id' | 'updatedAt'> {
  return {
    projectId: tpl.projectId,
    name,
    formatId: tpl.formatId,
    w: tpl.w,
    h: tpl.h,
    bg: tpl.bg,
    layers: tpl.layers.map(l => ({ ...l, id: uid() })),
    category: tpl.category,
    isTemplate: false,
    thumb: tpl.thumb,
  }
}

export function useCreateDesign() {
  return useStore(s => s.addDesign)
}
