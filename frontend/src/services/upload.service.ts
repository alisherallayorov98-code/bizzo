import { api } from '@config/api'

export interface UploadedImage {
  url:      string
  size:     number
  mimetype: string
}

export interface UploadedDocument {
  url:      string
  name:     string
  size:     number
  mimetype: string
}

export const uploadService = {
  async uploadImage(file: File): Promise<UploadedImage> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },

  async uploadDocument(file: File): Promise<UploadedDocument> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
}
