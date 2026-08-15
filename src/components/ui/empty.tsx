/**
 * Empty — empty-state primitive.
 *
 * Adopted from the Watermelon platform component registry
 * (https://github.com/WatermelonCorp/watermelon-platform, MIT), which builds on
 * shadcn/ui. Copied rather than installed: Watermelon targets Tailwind 4 and
 * this project is on Tailwind 3.4, so components are vendored in one at a time
 * and checked against our config.
 *
 * This one needed no changes — it depends only on `cva` and `cn`, and every
 * utility it uses (size-*, text-balance, bg-muted, text-muted-foreground)
 * exists in Tailwind 3.4 with the design tokens now defined in index.css.
 *
 *   <Empty className="border">
 *     <EmptyHeader>
 *       <EmptyMedia variant="icon"><FileText /></EmptyMedia>
 *       <EmptyTitle>No documents yet</EmptyTitle>
 *       <EmptyDescription>Upload a file to get started.</EmptyDescription>
 *     </EmptyHeader>
 *     <EmptyContent><Button>Upload</Button></EmptyContent>
 *   </Empty>
 */

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'gap-4 rounded-lg border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('gap-2 flex max-w-sm flex-col items-center', className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('text-sm font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
