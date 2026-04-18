import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') return this.sanitizeString(value)
    if (typeof value === 'object' && value !== null) return this.sanitizeObject(value)
    return value
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/gi, '')
      .replace(/\0/g, '')
      .trim()
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.sanitizeString(value)
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'string'
            ? this.sanitizeString(item)
            : typeof item === 'object' && item !== null
            ? this.sanitizeObject(item)
            : item,
        )
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
}
