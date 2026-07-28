import { create } from 'zustand'
import type { ID } from './types'

export type Tab = 'cronograma' | 'roteiros' | 'inspiracoes' | 'ia'

export type Route =
  | { screen: 'home' }
  | { screen: 'global-cal' }
  | { screen: 'project'; projectId: ID; tab: Tab; noteId?: ID; postId?: ID }

interface Nav {
  route: Route
  go: (r: Route) => void
}

export const useNav = create<Nav>(set => ({
  route: { screen: 'home' },
  go: route => set({ route }),
}))
