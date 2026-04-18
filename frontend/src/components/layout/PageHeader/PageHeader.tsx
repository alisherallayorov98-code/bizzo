import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { cn } from '@utils/cn'
import { Button } from '@components/ui/Button/Button'

// ============================================
// TYPES
// ============================================
export interface BreadcrumbItem {
  label: string
  path?: string
}

export interface PageHeaderProps {
  title:        string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?:     ReactNode
  backPath?:    string
  tabs?:        ReactNode
  className?:   string
}

// ============================================
// PAGE HEADER
// ============================================
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backPath,
  tabs,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('mb-6', className)}>

      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-3">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
              {crumb.path ? (
                <button
                  onClick={() => navigate(crumb.path!)}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-xs text-text-secondary font-medium">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Sarlavha qatori */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backPath)}
              className="-ml-1 shrink-0"
            >
              <ArrowLeft size={16} />
            </Button>
          )}

          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl text-text-primary truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-text-secondary mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Tablar */}
      {tabs && (
        <div className="mt-4 border-b border-border-primary">
          {tabs}
        </div>
      )}
    </div>
  )
}

export default PageHeader
