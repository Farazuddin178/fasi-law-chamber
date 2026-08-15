/**
 * RecordCard — the phone-sized counterpart to a table row.
 *
 * Wide data tables are unreadable under ~768px: seven or eight columns either
 * squash into unreadable slivers or push the page sideways. Every list screen
 * therefore renders its table for `md` and up, and a stack of RecordCards
 * below that.
 *
 * Styling follows the shadcn/ui conventions already used in this folder
 * (neutral surface, muted labels, subtle dividers) so the cards sit alongside
 * the existing Card/Badge/Button components without a Tailwind 4 upgrade.
 *
 *   <RecordCardList>
 *     {rows.map(r => (
 *       <RecordCard
 *         key={r.id}
 *         title={r.case_number}
 *         subtitle={r.petitioner}
 *         badge={<StatusBadge status={r.status} />}
 *         fields={[{ label: 'Court', value: r.court }]}
 *         actions={<button …>Edit</button>}
 *       />
 *     ))}
 *   </RecordCardList>
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RecordCardField {
  label: string;
  value: ReactNode;
  /** Let the value span both columns — use for long text. */
  wide?: boolean;
}

export interface RecordCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Status pill or similar, pinned top-right. */
  badge?: ReactNode;
  /** Secondary details, rendered as a compact two-column list. */
  fields?: RecordCardField[];
  /** Row of buttons/links along the bottom. */
  actions?: ReactNode;
  /** Accent stripe down the left edge, e.g. to flag urgency. */
  accentClassName?: string;
  onClick?: () => void;
  className?: string;
}

/** Container for a stack of RecordCards. Hidden at `md` and above. */
export function RecordCardList({
  children,
  className,
  emptyMessage = 'Nothing to show',
  isEmpty = false,
}: {
  children?: ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className={cn('md:hidden divide-y divide-gray-200', className)}>
      {isEmpty ? (
        <p className="p-6 text-center text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  );
}

export function RecordCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  accentClassName,
  onClick,
  className,
}: RecordCardProps) {
  const interactive = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'relative p-4 space-y-2.5',
        accentClassName && 'pl-5',
        interactive && 'cursor-pointer active:bg-gray-50',
        className
      )}
    >
      {accentClassName && (
        <span
          aria-hidden
          className={cn('absolute left-0 top-0 bottom-0 w-1.5', accentClassName)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 break-words">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 break-words mt-0.5">{subtitle}</div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {fields && fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {fields.map((f, i) => (
            <div key={i} className={cn('min-w-0', f.wide && 'col-span-2')}>
              <dt className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">
                {f.label}
              </dt>
              <dd className="text-gray-700 break-words">{f.value ?? '-'}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && (
        <div className="flex flex-wrap items-center gap-4 pt-1">{actions}</div>
      )}
    </div>
  );
}
