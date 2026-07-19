import { create } from 'zustand'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { AssetMeta, BrandKit, Design, ID, Layer, Note, Post, PostStatus, Project } from './types'

export const uid = (): ID => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const defaultBrand = (): BrandKit => ({
  colors: ['#22223b', '#4a4e69', '#c9ada7', '#f2e9e4'],
  headingFont: 'Helvetica Neue',
  bodyFont: 'Helvetica Neue',
  elementAssetIds: [],
  voice: '',
})

interface Data {
  projects: Project[]
  designs: Design[]
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

  addDesign: (d: Omit<Design, 'id' | 'updatedAt'>) => Design
  updateDesign: (id: ID, patch: Partial<Design>) => void
  setLayers: (id: ID, layers: Layer[]) => void
  removeDesign: (id: ID) => void

  addPost: (p: Omit<Post, 'id' | 'createdAt'>) => Post
  updatePost: (id: ID, patch: Partial<Post>) => void
  removePost: (id: ID) => void

  addNote: (n: Partial<Note> & { projectId: ID }) => Note
  updateNote: (id: ID, patch: Partial<Note>) => void
  removeNote: (id: ID) => void

  addAsset: (meta: Omit<AssetMeta, 'id' | 'createdAt'>, dataUrl: string) => Promise<AssetMeta>
  removeAsset: (id: ID) => void
}

const KEY = 'mysocial-data-v1'

let saveTimer: number | undefined
function scheduleSave(state: Store) {
  clearTimeout(saveTimer)
  const data: Data = {
    projects: state.projects,
    designs: state.designs,
    posts: state.posts,
    notes: state.notes,
    assets: state.assets,
  }
  saveTimer = window.setTimeout(() => {
    idbSet(KEY, data).catch(err => console.error('Falha ao salvar dados', err))
  }, 400)
}

// cache de dataURLs de assets em memória (o binário fica no IndexedDB)
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
    designs: [],
    posts: [],
    notes: [],
    assets: [],
    hydrated: false,

    hydrate: async () => {
      const data = await idbGet<Data>(KEY)
      if (data) {
        await preloadAssets(data.assets.map(a => a.id))
        set({ ...data, hydrated: true })
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
        designs: get().designs.filter(d => d.projectId !== id),
        posts: get().posts.filter(p => p.projectId !== id),
        notes: get().notes.filter(n => n.projectId !== id),
      }),

    addDesign: d => {
      const design: Design = { ...d, id: uid(), updatedAt: Date.now() }
      commit({ designs: [...get().designs, design] })
      return design
    },
    updateDesign: (id, patch) =>
      commit({
        designs: get().designs.map(d =>
          d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d,
        ),
      }),
    setLayers: (id, layers) =>
      commit({
        designs: get().designs.map(d =>
          d.id === id ? { ...d, layers, updatedAt: Date.now() } : d,
        ),
      }),
    removeDesign: id =>
      commit({
        designs: get().designs.filter(d => d.id !== id),
        posts: get().posts.map(p => (p.designId === id ? { ...p, designId: undefined } : p)),
        notes: get().notes.map(n => (n.designId === id ? { ...n, designId: undefined } : n)),
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

export function fileToDataUrl(file: File, maxDim = 2048): Promise<string> {
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
