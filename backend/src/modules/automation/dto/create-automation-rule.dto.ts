import {
  IsString, IsEnum, IsBoolean, IsOptional,
  IsArray, IsNumber, Min, MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum AutomationTrigger {
  INVOICE_OVERDUE    = 'INVOICE_OVERDUE',
  INVOICE_DUE_SOON   = 'INVOICE_DUE_SOON',
  STOCK_LOW          = 'STOCK_LOW',
  DEAL_WON           = 'DEAL_WON',
  DEAL_STAGE_CHANGED = 'DEAL_STAGE_CHANGED',
  DEAL_STALE         = 'DEAL_STALE',
  CONTRACT_EXPIRING  = 'CONTRACT_EXPIRING',
  PAYMENT_RECEIVED   = 'PAYMENT_RECEIVED',
  DEBT_OVERDUE       = 'DEBT_OVERDUE',
  CONTACT_CREATED    = 'CONTACT_CREATED',
  CUSTOMER_INACTIVE  = 'CUSTOMER_INACTIVE',
  SALARY_DUE         = 'SALARY_DUE',
  STOCK_MOVEMENT     = 'STOCK_MOVEMENT',
  MANUAL             = 'MANUAL',
  QUOTATION_APPROVED = 'QUOTATION_APPROVED',
  QUOTATION_EXPIRED  = 'QUOTATION_EXPIRED',
  PURCHASE_RECEIVED  = 'PURCHASE_RECEIVED',
  DAILY_MORNING      = 'DAILY_MORNING',
  WEEKLY_MONDAY      = 'WEEKLY_MONDAY',
  MONTHLY_FIRST      = 'MONTHLY_FIRST',
  WEBHOOK_INBOUND    = 'WEBHOOK_INBOUND',
}

export enum ConditionOperator {
  GT  = 'gt',   // katta
  GTE = 'gte',  // katta yoki teng
  LT  = 'lt',   // kichik
  LTE = 'lte',  // kichik yoki teng
  EQ  = 'eq',   // teng
  NEQ = 'neq',  // teng emas
  IN  = 'in',   // ichida
  CONTAINS = 'contains',
}

export enum ActionType {
  SEND_SMS            = 'SEND_SMS',
  SEND_TELEGRAM       = 'SEND_TELEGRAM',
  SEND_EMAIL          = 'SEND_EMAIL',
  CREATE_NOTIFICATION = 'CREATE_NOTIFICATION',
  CREATE_TASK         = 'CREATE_TASK',
  WEBHOOK             = 'WEBHOOK',
  CREATE_INVOICE      = 'CREATE_INVOICE',
  DELAY               = 'DELAY',
  UPDATE_DEAL_STAGE   = 'UPDATE_DEAL_STAGE',
  ASSIGN_USER         = 'ASSIGN_USER',
}

export class CreateAutomationRuleDto {
  @ApiProperty({ example: 'Muddati o\'tgan schyotlar uchun SMS' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiProperty({ enum: AutomationTrigger })
  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger

  @ApiPropertyOptional({
    description: 'Shartlar massivi',
    example: [{ field: 'daysOverdue', operator: 'gte', value: 3 }],
  })
  @IsOptional()
  @IsArray()
  conditions?: Array<{
    field: string
    operator: ConditionOperator
    value: any
  }>

  @ApiProperty({
    description: 'Harakatlar massivi',
    example: [{
      type: 'SEND_SMS',
      config: { template: 'Hurmatli {{contact.name}}, schyotingiz muddati o\'tdi.' },
    }],
  })
  @IsArray()
  actions: Array<{
    type: ActionType
    config: Record<string, any>
  }>

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: 'Qayta ishlamaslik oralig\'i (daqiqa)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldownMin?: number
}
