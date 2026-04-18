import { create } from 'zustand'
import type { ModuleType } from '@/types/auth.types'

interface ModuleState {
  activeModules: ModuleType[]
  isModuleActive: (module: ModuleType) => boolean
  setModules: (modules: ModuleType[]) => void
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  activeModules: [],

  isModuleActive: (module) => {
    return get().activeModules.includes(module)
  },

  setModules: (modules) => set({ activeModules: modules }),
}))
