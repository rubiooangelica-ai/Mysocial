import { create } from 'zustand'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { AssetMeta, BrandKit, ID, Note, Post, PostStatus, Project } from './types'

export const uid = (): ID => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const defaultBrand = (): BrandKit => ({
  colors: ['#e07a9f', '#a183d9', '#e5926f', '#fbf6f4'],
  headingFont: 'Georgia',
  bodyFont: 'Helvetica Neue',
  elementAssetIds: [],
  voice: '',
})

interface Data {
  projects: Project[]
  posts: Post[]
  notes: Note[]
  assets: AssetMeta[]
}

interface Store extends Data {
  hydrated: boolean
  hydrate: () => Promise<void>

  addProject: (name: string, accent: string) => Project
  updateProject: (id: ID, patch: Partial<Project>) => void
  updateBrand: (projectId: ID, patch: Partial<BrandKit>) => void
  removeProject: (id: ID) => void

  addPost: (p: Omit<Post, 'id' | 'createdAt'>) => Post
  updatePost: (id: ID, patch: Partial<Post>) => void
  removePost: (id: ID) => void

  addNote: (n: Partial<Note> & { projectId: ID }) => Note
  updateNote: (id: ID, patch: Partial<Note>) => void
  removeNote: (id: ID) => void

  addAsset: (meta: Omit<AssetMeta, 'id' | 'createdAt'>, dataUrl: string) => Promise<AssetMeta>
  updateAsset: (id: ID, patch: Partial<AssetMeta>) => void
  removeAsset: (id: ID) => void
}

const KEY = 'mysocial-data-v1'

// Chaves gravadas por versões anteriores do app (ex: designs do editor antigo).
// São mantidas intactas no armazenamento em vez de sobrescritas.
let legacyKeys: Record<string, unknown> = {}

let saveTimer: number | undefined
function scheduleSave(state: Store) {
  clearTimeout(saveTimer)
  const data: Data = {
    projects: state.projects,
    posts: state.posts,
    notes: state.notes,
    assets: state.assets,
  }
  saveTimer = window.setTimeout(() => {
    idbSet(KEY, { ...legacyKeys, ...data }).catch(err => console.error('Falha ao salvar dados', err))
  }, 400)
}

// cache de dataURLs de arquivos em memória (o binário fica no IndexedDB)
const assetCache = new Map<string, string>()

export async function getAssetUrl(id: ID): Promise<string | undefined> {
  if (assetCache.has(id)) return assetCache.get(id)
  const url = await idbGet<string>('asset:' + id)
  if (url) assetCache.set(id, url)
  return url
}

export function getAssetUrlSync(id: ID): string | undefined {
  return assetCache.get(id)
}

export async function preloadAssets(ids: ID[]) {
  await Promise.all(ids.map(id => getAssetUrl(id)))
}

export const useStore = create<Store>((set, get) => {
  const commit = (patch: Partial<Data>) => {
    set(patch)
    scheduleSave(get())
  }

  return {
    projects: [],
    posts: [],
    notes: [],
    assets: [],
    hydrated: false,

    hydrate: async () => {
      const stored = await idbGet<Record<string, unknown>>(KEY)
      if (stored) {
        const { projects, posts, notes, assets, ...rest } = stored as Record<string, never> & Data
        legacyKeys = rest
        await preloadAssets((assets ?? []).map(a => a.id))
        set({
          projects: projects ?? [],
          posts: posts ?? [],
          notes: notes ?? [],
          assets: assets ?? [],
          hydrated: true,
        })
      } else {
        set({ hydrated: true })
      }
    },

    addProject: (name, accent) => {
      const p: Project = { id: uid(), name, accent, brand: defaultBrand(), createdAt: Date.now() }
      commit({ projects: [...get().projects, p] })
      return p
    },
    updateProject: (id, patch) =>
      commit({ projects: get().projects.map(p => (p.id === id ? { ...p, ...patch } : p)) }),
    updateBrand: (projectId, patch) =>
      commit({
        projects: get().projects.map(p =>
          p.id === projectId ? { ...p, brand: { ...p.brand, ...patch } } : p,
        ),
      }),
    removeProject: id =>
      commit({
        projects: get().projects.filter(p => p.id !== id),
        posts: get().posts.filter(p => p.projectId !== id),
        notes: get().notes.filter(n => n.projectId !== id),
      }),

    addPost: p => {
      const post: Post = { ...p, id: uid(), createdAt: Date.now() }
      commit({ posts: [...get().posts, post] })
      return post
    },
    updatePost: (id, patch) =>
      commit({ posts: get().posts.map(p => (p.id === id ? { ...p, ...patch } : p)) }),
    removePost: id =>
      commit({
        posts: get().posts.filter(p => p.id !== id),
        notes: get().notes.map(n => (n.postId === id ? { ...n, postId: undefined } : n)),
      }),

    addNote: n => {
      const note: Note = {
        kind: 'nota',
        title: '',
        body: '',
        hook: '',
        dev: '',
        cta: '',
        updatedAt: Date.now(),
        ...n,
        id: uid(),
      }
      commit({ notes: [...get().notes, note] })
      return note
    },
    updateNote: (id, patch) =>
      commit({
        notes: get().notes.map(n =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
        ),
      }),
    removeNote: id => commit({ notes: get().notes.filter(n => n.id !== id) }),

    addAsset: async (meta, dataUrl) => {
      const asset: AssetMeta = { ...meta, id: uid(), createdAt: Date.now() }
      await idbSet('asset:' + asset.id, dataUrl)
      assetCache.set(asset.id, dataUrl)
      commit({ assets: [...get().assets, asset] })
      return asset
    },
    updateAsset: (id, patch) =>
      commit({ assets: get().assets.map(a => (a.id === id ? { ...a, ...patch } : a)) }),
    removeAsset: id => {
      idbDel('asset:' + id)
      assetCache.delete(id)
      commit({ assets: get().assets.filter(a => a.id !== id) })
    },
  }
})

// ─── Status de posts ───────────────────────────────────────────────────────

export const nextStatus: Record<PostStatus, PostStatus | undefined> = {
  rascunho: 'aprovado',
  aprovado: 'agendado',
  agendado: 'publicado',
  publicado: undefined,
}

// ─── Utilidades de arquivo ─────────────────────────────────────────────────

export function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = reader.result as string
      if (!file.type.startsWith('image/')) return resolve(url)
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        if (scale === 1) return resolve(url)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.onerror = () => resolve(url)
      img.src = url
    }
    reader.readAsDataURL(file)
  })
}

/** Miniatura leve, guardada junto do post para os cards do cronograma. */
export function makeThumb(dataUrl: string, max = 240): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => resolve('')
    img.src = dataUrl
  })
}

// ─── Datas ─────────────────────────────────────────────────────────────────

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayIso = () => isoDate(new Date())

export const shortDate = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`
