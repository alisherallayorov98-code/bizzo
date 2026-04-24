import { api }           from '@config/api'
import { uploadService } from './upload.service'

export interface Attachment {
  id:          string
  entityType:  string
  entityId:    string
  fileName:    string
  fileUrl:     string
  fileSize:    number
  mimeType:    string
  createdAt:   string
  uploadedBy:  { firstName: string; lastName: string }
}

export const attachmentsService = {
  async list(entityType: string, entityId: string): Promise<Attachment[]> {
    const { data } = await api.get('/attachments', { params: { entityType, entityId } })
    return data.data
  },

  async uploadAndLink(file: File, entityType: string, entityId: string): Promise<Attachment> {
    const uploaded = await uploadService.uploadDocument(file)
    const { data } = await api.post('/attachments', {
      entityType,
      entityId,
      fileName: uploaded.name,
      fileUrl:  uploaded.url,
      fileSize: uploaded.size,
      mimeType: uploaded.mimetype,
    })
    return data.data
  },

  async delete(id: string) {
    return api.delete(`/attachments/${id}`)
  },
}
