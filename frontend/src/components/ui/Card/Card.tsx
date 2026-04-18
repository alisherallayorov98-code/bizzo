import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@utils/cn'

// ============================================
// CARD
// ============================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?:   'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  bordered?:  boolean
  glow?:      boolean
}

const paddingStyles = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

export function Card({
  padding   = 'md',
  hoverable = false,
  bordered  = true,
  glow      = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)]',
        bordered && 'border border-[var(--color-border-primary)]',
        paddingStyles[padding],
        hoverable && [
          'transition-all duration-200 cursor-pointer',
          'hover:border-[var(--color-border-secondary)]',
          'hover:bg-[var(--color-bg-elevated)]',
          'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
        ],
        glow && 'shadow-[var(--shadow-glow)] animate-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// CARD SUB-KOMPONENTLARI
// ============================================

export function CardHeader({
  children, className, ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4',
        'border-b border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children, className, ...props
}: HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) {
  return (
    <h3
      className={cn(
        'font-display font-semibold text-[var(--color-text-primary)] text-base leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  children, className, ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--color-text-secondary)]', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardBody({
  children, className, ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  children, className, ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 mt-4',
        'border-t border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
