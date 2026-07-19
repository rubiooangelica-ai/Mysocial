import { create } from 'zustand'
import type { ID } from './types'

export type Tab = 'editor' | 'calendario' | 'notas' | 'ia'

export type Route =
  | { screen: 'home' }
  | { screen: 'global-cal' }
  | { screen: 'project'; projectId: ID; tab: Tab; noteId?: ID }
  | { screen: 'design'; projectId: ID; designId: ID }

interface Nav {
  route: Route
  go: (r: Route) => void
}

export const useNav = create<Nav>(set => ({
  route: { screen: 'home' },
  go: route => set({ route }),
}))
