// ─── Modelos de dados do app ───────────────────────────────────────────────

export type ID = string

export interface BrandKit {
  colors: string[]
  headingFont: string
  bodyFont: string
  logoAssetId?: string
  elementAssetIds: string[]
  voice: string // resumo de tom de voz / personalidade da marca
}

export interface Project {
  id: ID
  name: string
  accent: string // cor do projeto (usada no calendário consolidado)
  brand: BrandKit
  inspirationLinks?: string[] // links de referência para o assistente de IA
  createdAt: number
}

// ─── Editor ────────────────────────────────────────────────────────────────

export interface FormatSpec {
  id: string
  label: string
  w: number
  h: number
}

export const FORMATS: FormatSpec[] = [
  { id: 'feed-1x1', label: 'Feed 1:1', w: 1080, h: 1080 },
  { id: 'feed-4x5', label: 'Feed 4:5', w: 1080, h: 1350 },
  { id: 'story-9x16', label: 'Story 9:16', w: 1080, h: 1920 },
  { id: 'reels-cover', label: 'Capa de Reels', w: 1080, h: 1920 },
]

export type LayerType = 'text' | 'image' | 'shape' | 'icon'

interface LayerBase {
  id: ID
  type: LayerType
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
}

export interface TextLayer extends LayerBase {
  type: 'text'
  text: string
  font: string
  size: number
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  bold: boolean
  italic: boolean
}

export interface ImageLayer extends LayerBase {
  type: 'image'
  assetId: string
  radius: number
}

export type ShapeKind = 'rect' | 'circle' | 'triangle' | 'line'

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  shape: ShapeKind
  fill: string
  radius: number
}

export interface IconLayer extends LayerBase {
  type: 'icon'
  glyph: string // emoji do banco de ícones
}

export type Layer = TextLayer | ImageLayer | ShapeLayer | IconLayer

export const CATEGORIES = ['Feed', 'Stories', 'Reels/Capas', 'Institucional'] as const

export interface Design {
  id: ID
  projectId: ID
  name: string
  formatId: string
  w: number
  h: number
  bg: string
  layers: Layer[]
  category?: string // subpasta opcional
  isTemplate: boolean // template personalizado salvo pela usuária
  thumb?: string // dataURL pequena para cards
  updatedAt: number
}

// ─── Calendário ────────────────────────────────────────────────────────────

export type PostStatus = 'rascunho' | 'aprovado' | 'agendado' | 'publicado'

export const STATUS_ORDER: PostStatus[] = ['rascunho', 'aprovado', 'agendado', 'publicado']

export const STATUS_LABEL: Record<PostStatus, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
}

export interface Post {
  id: ID
  projectId: ID
  title: string
  date?: string // YYYY-MM-DD (sem data = backlog)
  time?: string // HH:MM
  status: PostStatus
  designId?: ID
  noteId?: ID
  createdAt: number
}

// ─── Notas & Roteiros ──────────────────────────────────────────────────────

export type NoteKind = 'nota' | 'roteiro'

export interface Note {
  id: ID
  projectId: ID
  kind: NoteKind
  title: string
  body: string
  hook: string // gancho (roteiro)
  dev: string // desenvolvimento (roteiro)
  cta: string // chamada para ação (roteiro)
  postId?: ID
  designId?: ID
  fromAI?: boolean // ideia gerada pela IA (banco de ideias)
  updatedAt: number
}

// ─── Assets (imagens salvas no IndexedDB) ─────────────────────────────────

export interface AssetMeta {
  id: ID
  projectId?: ID // sem projeto = biblioteca geral
  name: string
  kind: 'image' | 'logo' | 'element' | 'inspiration'
  createdAt: number
}

export const FONTS = [
  'Helvetica Neue',
  'Georgia',
  'Futura',
  'Avenir Next',
  'Baskerville',
  'Gill Sans',
  'Palatino',
  'Courier New',
  'Marker Felt',
  'Snell Roundhand',
  'American Typewriter',
  'Arial Rounded MT Bold',
]

export const PALETTE_PRESETS = [
  '#1a1a2e', '#e94560', '#0f3460', '#f5f5f0', '#c9ada7',
  '#4a4e69', '#9a8c98', '#f2e9e4', '#22223b', '#ffbe0b',
  '#fb5607', '#ff006e', '#8338ec', '#3a86ff', '#06d6a0',
  '#118ab2', '#073b4c', '#ef476f', '#ffd166', '#ffffff', '#000000',
]

export const ICON_BANK = [
  '⭐', '❤️', '🔥', '✨', '💡', '📣', '🎯', '🚀', '📌', '✅',
  '➡️', '⬇️', '👇', '☝️', '💬', '📱', '📷', '🎥', '🎧', '🛍️',
  '💰', '📈', '🏆', '🎁', '☀️', '🌙', '🌿', '🌸', '💧', '⚡',
  '🍽️', '☕', '🥗', '💪', '🧘', '💄', '👗', '🏠', '🚗', '✈️',
]
