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
    const { data } = await api.post('/ai/query', { question })
    return data.data as string
  },

  async getRecommendations(): Promise<AIRecommendation[]> {
    const { data } = await api.get('/ai/recommendations')
    return data.data
  },

  async getDashboardInsights(): Promise<any> {
    const { data } = await api.get('/ai/dashboard')
    return data.data
  },
}
