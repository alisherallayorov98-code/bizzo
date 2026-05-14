import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardWidget {
  id:      string
  label:   string
  visible: boolean
  order:   number
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'kpi',     label: 'KPI kartalar',        visible: true, order: 0 },
  { id: 'cashRec', label: 'Kassa va takroriy',   visible: true, order: 1 },
  { id: 'smart',   label: 'Smart tahlil',         visible: true, order: 2 },
  { id: 'charts',  label: 'Grafiklar va AI',      visible: true, order: 3 },
  { id: 'stats',   label: 'Statistika bloki',     visible: true, order: 4 },
  { id: 'quick',   label: 'Tezkor havolalar',     visible: true, order: 5 },
]

interface DashboardState {
  widgets:       DashboardWidget[]
  editMode:      boolean
  setEditMode:   (v: boolean) => void
  toggleWidget:  (id: string) => void
  moveWidget:    (id: string, direction: 'up' | 'down') => void
  reorderWidget: (fromId: string, toId: string) => void
  resetWidgets:  () => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets:  DEFAULT_WIDGETS,
      editMode: false,

      setEditMode: (v) => set({ editMode: v }),

      toggleWidget: (id) =>
        set(s => ({
          widgets: s.widgets.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w,
          ),
        })),

      moveWidget: (id, direction) =>
        set(s => {
          const sorted = [...s.widgets].sort((a, b) => a.order - b.order)
          const idx    = sorted.findIndex(w => w.id === id)
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= sorted.length) return {}

          const newWidgets = sorted.map(w => ({ ...w }))
          const tmp                    = newWidgets[idx].order
          newWidgets[idx].order        = newWidgets[swapIdx].order
          newWidgets[swapIdx].order    = tmp

          return { widgets: newWidgets }
        }),

      reorderWidget: (fromId, toId) =>
        set(s => {
          if (fromId === toId) return {}
          const sorted = [...s.widgets].sort((a, b) => a.order - b.order)
          const fromIdx = sorted.findIndex(w => w.id === fromId)
          const toIdx   = sorted.findIndex(w => w.id === toId)
          if (fromIdx === -1 || toIdx === -1) return {}
          const newWidgets = sorted.map(w => ({ ...w }))
          const [moved]    = newWidgets.splice(fromIdx, 1)
          newWidgets.splice(toIdx, 0, moved)
          return { widgets: newWidgets.map((w, i) => ({ ...w, order: i })) }
        }),

      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),
    }),
    { name: 'bizzo-dashboard' },
  ),
)
