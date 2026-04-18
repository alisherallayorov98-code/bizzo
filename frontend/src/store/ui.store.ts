import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarCollapsed:   boolean
  sidebarMobileOpen:  boolean
  toggleSidebar:      () => void
  setSidebarCollapsed:(v: boolean) => void
  openMobileSidebar:  () => void
  closeMobileSidebar: () => void

  // Tema
  theme:        'dark' | 'light'
  toggleTheme:  () => void

  // Aktiv bo'lim
  activeSection:    string | null
  setActiveSection: (section: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed:  false,
      sidebarMobileOpen: false,
      theme:             'dark',
      activeSection:     null,

      toggleSidebar:       () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      openMobileSidebar:  () => set({ sidebarMobileOpen: true }),
      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),

      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      setActiveSection: (activeSection) => set({ activeSection }),
    }),
    {
      name: 'erp-ui-settings',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme:            s.theme,
      }),
    },
  ),
)
