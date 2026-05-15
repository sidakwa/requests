import { create } from 'zustand'

interface ApprovalsStore {
  selectedRequests: string[]
  filter: 'pending' | 'actioned'
  setSelectedRequests: (requests: string[]) => void
  toggleRequest: (id: string) => void
  setFilter: (filter: 'pending' | 'actioned') => void
  clearSelected: () => void
}

export const useApprovalsStore = create<ApprovalsStore>((set) => ({
  selectedRequests: [],
  filter: 'pending',
  
  setSelectedRequests: (requests) => set({ selectedRequests: requests }),
  
  toggleRequest: (id) =>
    set((state) => ({
      selectedRequests: state.selectedRequests.includes(id)
        ? state.selectedRequests.filter(i => i !== id)
        : [...state.selectedRequests, id]
    })),
    
  setFilter: (filter) => set({ filter }),
  
  clearSelected: () => set({ selectedRequests: [] })
}))
