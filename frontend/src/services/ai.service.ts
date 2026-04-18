import api from '@config/api'

export interface AIRecommendation {
  type:    'warning' | 'info' | 'success' | 'danger'
  title:   string
  message: string
  action?: string
  link?:   string
}

export const aiService = {
  async query(question: string): Promise<string> {
    const { data } = await api.post<string>('/ai/query', { question })
    return data as string
  },

  async getRecommendations(): Promise<AIRecommendation[]> {
    const { data } = await api.get<{ data: AIRecommendation[] }>('/ai/recommendations')
    return data.data
  },

  async getDashboardInsights(): Promise<any> {
    const { data } = await api.get<{ data: any }>('/ai/dashboard')
    return data
  },
}
