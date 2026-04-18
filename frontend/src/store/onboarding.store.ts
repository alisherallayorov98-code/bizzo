import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingStep {
  id:          string
  title:       string
  description: string
  isCompleted: boolean
  isSkipped:   boolean
}

interface OnboardingState {
  isActive:    boolean
  currentStep: number
  isCompleted: boolean
  isDismissed: boolean
  steps:       OnboardingStep[]

  startOnboarding:    () => void
  completeStep:       (stepId: string) => void
  skipStep:           (stepId: string) => void
  nextStep:           () => void
  prevStep:           () => void
  completeOnboarding: () => void
  dismissOnboarding:  () => void
  resetOnboarding:    () => void
}

const INITIAL_STEPS: OnboardingStep[] = [
  { id: 'welcome', title: 'Xush kelibsiz',       description: 'BIZZO bilan tanishish',                       isCompleted: false, isSkipped: false },
  { id: 'company', title: 'Kompaniya sozlamalari', description: 'Kompaniya nomini va STIR ni kiriting',      isCompleted: false, isSkipped: false },
  { id: 'product', title: 'Birinchi mahsulot',   description: 'Katalogga birinchi mahsulotni qo\'shing',     isCompleted: false, isSkipped: false },
  { id: 'contact', title: 'Birinchi mijoz',      description: 'Kontakt bazasiga birinchi kontaktni qo\'shing', isCompleted: false, isSkipped: false },
  { id: 'demo',    title: 'Demo ma\'lumotlar',   description: 'Tizimni sinash uchun demo yuklab oling',      isCompleted: false, isSkipped: false },
  { id: 'finish',  title: 'Tayyor',              description: 'Dashboardga o\'tish',                         isCompleted: false, isSkipped: false },
]

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isActive:    false,
      currentStep: 0,
      isCompleted: false,
      isDismissed: false,
      steps:       INITIAL_STEPS,

      startOnboarding: () => set({
        isActive: true, currentStep: 0, isCompleted: false, isDismissed: false, steps: INITIAL_STEPS,
      }),

      completeStep: (stepId) => set(state => ({
        steps: state.steps.map(s => s.id === stepId ? { ...s, isCompleted: true } : s),
      })),

      skipStep: (stepId) => set(state => ({
        steps: state.steps.map(s => s.id === stepId ? { ...s, isSkipped: true } : s),
      })),

      nextStep: () => set(state => ({
        currentStep: Math.min(state.currentStep + 1, state.steps.length - 1),
      })),

      prevStep: () => set(state => ({
        currentStep: Math.max(state.currentStep - 1, 0),
      })),

      completeOnboarding: () => set({ isCompleted: true, isActive: false }),
      dismissOnboarding:  () => set({ isDismissed: true, isActive: false }),

      resetOnboarding: () => set({
        isActive: false, currentStep: 0, isCompleted: false, isDismissed: false, steps: INITIAL_STEPS,
      }),
    }),
    {
      name: 'bizzo-onboarding',
      partialize: (s) => ({
        isCompleted: s.isCompleted,
        isDismissed: s.isDismissed,
        steps:       s.steps,
      }),
    },
  ),
)
