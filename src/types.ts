// ─── Modelos de dados do painel ────────────────────────────────────────────

export type ID = string

/** Referência visual do cliente: cores, fontes e tom de voz da marca. */
export interface BrandKit {
  colors: string[]
  headingFont: string
  bodyFont: string
  logoAssetId?: string
  elementAssetIds: string[]
  voice: string
}

export interface Project {
  id: ID
  name: string
  accent: string // cor do cliente (usada no painel e no cronograma consolidado)
  brand: BrandKit
  inspirationLinks?: string[]
  createdAt: number
}

// ─── Cronograma ────────────────────────────────────────────────────────────

export const POST_FORMATS = ['Feed', 'Carrossel', 'Stories', 'Reels'] as const
export type PostFormat = (typeof POST_FORMATS)[number]

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
  date?: string // YYYY-MM-DD (sem data = ainda no backlog)
  time?: string // HH:MM
  status: PostStatus
  format?: PostFormat
  caption?: string // legenda pronta para copiar na hora de postar
  imageAssetId?: ID // arte final, feita em outro app e anexada aqui
  thumb?: string // miniatura da arte, para os cards
  noteId?: ID
  createdAt: number
}

// ─── Roteiros, notas e ideias ──────────────────────────────────────────────

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
  fromAI?: boolean // ideia gerada pela IA
  updatedAt: number
}

// ─── Arquivos guardados no dispositivo ─────────────────────────────────────

export interface AssetMeta {
  id: ID
  projectId?: ID
  name: string
  kind: 'arte' | 'logo' | 'element' | 'inspiration'
  note?: string // anotação da inspiração ("gostei da paleta")
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
  '#e07a9f', '#a183d9', '#e5926f', '#5fb8a5', '#f2c9d4',
  '#4a3b45', '#9a8892', '#fbf6f4', '#22223b', '#ffbe0b',
  '#fb5607', '#ff006e', '#8338ec', '#3a86ff', '#06d6a0',
  '#118ab2', '#073b4c', '#ef476f', '#ffd166', '#ffffff', '#000000',
]
