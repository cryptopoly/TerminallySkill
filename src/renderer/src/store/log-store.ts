import { create } from 'zustand'
import type { SessionLogMeta } from '../../../shared/log-schema'

interface LogStore {
  logs: SessionLogMeta[]
  loading: boolean
  selectedLog: SessionLogMeta | null
  selectedLogContent: string | null
  searchQuery: string
  setLogs: (logs: SessionLogMeta[]) => void
  setLoading: (loading: boolean) => void
  setSelectedLog: (log: SessionLogMeta | null) => void
  setSelectedLogContent: (content: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  loading: false,
  selectedLog: null,
  selectedLogContent: null,
  searchQuery: '',
  setLogs: (logs) => set({ logs }),
  setLoading: (loading) => set({ loading }),
  setSelectedLog: (log) => set({ selectedLog: log }),
  setSelectedLogContent: (content) => set({ selectedLogContent: content }),
  setSearchQuery: (query) => set({ searchQuery: query })
}))
