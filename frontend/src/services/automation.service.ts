import { api } from '@config/api'
import type {
  AutomationRule, AutomationStats,
  TriggerMeta, ActionMeta,
} from '@/types/automation'

const BASE = '/automation'

export const automationService = {
  async getAll(): Promise<AutomationRule[]> {
    const { data } = await api.get(BASE)
    return data
  },

  async getOne(id: string): Promise<AutomationRule> {
    const { data } = await api.get(`${BASE}/${id}`)
    return data
  },

  async create(payload: Omit<AutomationRule, 'id' | 'runCount' | 'lastRunAt' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule> {
    const { data } = await api.post(BASE, payload)
    return data
  },

  async update(id: string, payload: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data } = await api.put(`${BASE}/${id}`, payload)
    return data
  },

  async toggle(id: string): Promise<AutomationRule> {
    const { data } = await api.patch(`${BASE}/${id}/toggle`)
    return data
  },

  async runManually(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`${BASE}/${id}/run`)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`)
  },

  async getStats(): Promise<AutomationStats> {
    const { data } = await api.get(`${BASE}/stats`)
    return data
  },

  async getTriggers(): Promise<TriggerMeta[]> {
    const { data } = await api.get(`${BASE}/triggers`)
    return data
  },

  async getActions(): Promise<ActionMeta[]> {
    const { data } = await api.get(`${BASE}/actions`)
    return data
  },
}
