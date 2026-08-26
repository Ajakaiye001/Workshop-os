import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'

export { Icon }
export type { IconName }

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ============================ Button ============================ */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'hv' | 'quiet'
type BtnSize = 'xs' | 'sm' | 'md' | 'lg'

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
  'disabled:opacity-45 disabled:pointer-events-none active:scale-[0.985]'

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:bg-[var(--btn-bg-hover)] shadow-xs',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong hover:bg-surface shadow-xs',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunken',
  quiet: 'text-ink-3 hover:text-ink hover:bg-sunken',
  danger: 'bg-bad text-white hover:brightness-110 shadow-xs',
  hv: 'bg-hv text-hv-ink hover:brightness-105 shadow-xs font-semibold',
}

const BTN_SIZE: Record<BtnSize, string> = {
  xs: 'h-6 px-2 text-2xs',
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  icon?: IconName
  iconRight?: IconName
  loading?: boolean
  full?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, loading, full, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], full && 'w-full', className)}
      {...rest}
      disabled={rest.disabled || loading}
    >
      {loading ? <Spinner size={size === 'lg' ? 16 : 13} /> : icon ? <Icon name={icon} size={size === 'lg' ? 17 : size === 'xs' ? 12 : 14} /> : null}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 17 : 14} />}
    </button>
  )
}

export function IconButton({ icon, label, size = 'md', variant = 'ghost', className, ...rest }: { icon: IconName; label: string; size?: BtnSize; variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const dim = size === 'sm' ? 'h-7 w-7' : size === 'xs' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  return (
    <button type="button" aria-label={label} title={label} className={cx(BTN_BASE, BTN_VARIANT[variant], dim, className)} {...rest}>
      <Icon name={icon} size={size === 'lg' ? 18 : 15} />
    </button>
  )
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ============================ Badge ============================ */

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'purple' | 'hv'

const TONE_BG: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2 border-line',
  ok: 'bg-ok-bg text-ok border-transparent',
  warn: 'bg-warn-bg text-warn border-transparent',
  bad: 'bg-bad-bg text-bad border-transparent',
  info: 'bg-info-bg text-info border-transparent',
  purple: 'bg-purple-bg text-purple border-transparent',
  hv: 'bg-hv text-hv-ink border-transparent',
}

export function Badge({ tone = 'neutral', icon, children, className, mono }: { tone?: Tone; icon?: IconName; children: React.ReactNode; className?: string; mono?: boolean }) {
  // fixed height, so the label must never wrap out of the pill
  return (
    <span className={cx('inline-flex h-[20px] shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 text-2xs font-medium', mono && 'font-mono', TONE_BG[tone], className)}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

export function Dot({ tone = 'neutral', pulse }: { tone?: Tone; pulse?: boolean }) {
  const c: Record<Tone, string> = {
    neutral: 'bg-ink-4', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad',
    info: 'bg-info', purple: 'bg-purple', hv: 'bg-hv',
  }
  return <span className={cx('inline-block h-1.5 w-1.5 shrink-0 rounded-full', c[tone], pulse && 'animate-pulse-dot')} />
}

/* ============================ Layout ============================ */

export function Panel({ title, subtitle, actions, children, className, bodyClass, dense }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode
  children: React.ReactNode; className?: string; bodyClass?: string; dense?: boolean
}) {
  return (
    <section className={cx('rounded-lg border border-line bg-raised shadow-xs', className)}>
      {(title || actions) && (
        <header className={cx('flex items-center justify-between gap-3 border-b border-line', dense ? 'px-3 py-2' : 'px-4 py-3')}>
          <div className="min-w-0">
            {title && <h2 className="text-md font-semibold tracking-[-0.014em] truncate">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-3 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cx(bodyClass ?? (dense ? 'p-3' : 'p-4'))}>{children}</div>
    </section>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('mkt-eyebrow text-ink-4', className)} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{children}</div>
}

export function PageHeader({ title, sub, children, back }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        {sub && <div className="text-sm text-ink-3 mt-1">{sub}</div>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

/* ============================ Metric strip ============================ */
/* An instrument cluster, not a row of cards. Hairline-divided cells. */

export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('grid gap-px overflow-hidden rounded-lg border border-line bg-line shadow-xs', className)}>
      {children}
    </div>
  )
}

export function Metric({ label, value, unit, delta, hint, tone, spark }: {
  label: string; value: React.ReactNode; unit?: string; delta?: { v: string; up: boolean; good?: boolean }
  hint?: React.ReactNode; tone?: Tone; spark?: number[]
}) {
  return (
    <div className="min-w-0 bg-raised px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {tone && <Dot tone={tone} />}
        <span className="text-2xs uppercase tracking-[0.09em] text-ink-4 font-medium truncate">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="num text-[1.6rem] leading-none font-semibold tracking-[-0.03em]">{value}</span>
        {unit && <span className="text-sm text-ink-3 font-medium">{unit}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2 h-4">
        {delta && (
          <span className={cx('text-2xs num font-medium inline-flex items-center gap-0.5',
            (delta.good ?? delta.up) ? 'text-ok' : 'text-bad')}>
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden className={delta.up ? '' : 'rotate-180'}>
              <path d="M5 1.5 9 8H1z" fill="currentColor" />
            </svg>
            {delta.v}
          </span>
        )}
        {hint && <span className="text-2xs text-ink-4 truncate">{hint}</span>}
        {spark && <Sparkline values={spark} className="ml-auto" />}
      </div>
    </div>
  )
}

export function Sparkline({ values, className, w = 56, h = 16 }: { values: number[]; className?: string; w?: number; h?: number }) {
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(' ')
  const rising = values[values.length - 1] >= values[0]
  return (
    <svg width={w} height={h} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={rising ? 'var(--ok)' : 'var(--bad)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  )
}

/* ============================ Table ============================ */

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  )
}

export function Th({ children, className, align, sortable, onClick, active, dir }: {
  children?: React.ReactNode; className?: string; align?: 'right' | 'center'
  sortable?: boolean; onClick?: () => void; active?: boolean; dir?: 'asc' | 'desc'
}) {
  return (
    <th
      onClick={onClick}
      className={cx(
        'sticky top-0 z-[1] bg-raised/95 backdrop-blur-[2px] border-b border-line px-3 py-2 text-2xs font-medium uppercase tracking-[0.07em] text-ink-4 whitespace-nowrap',
        align === 'right' && 'text-right', align === 'center' && 'text-center',
        sortable && 'cursor-pointer select-none hover:text-ink-2', className,
      )}
    >
      <span className={cx('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {children}
        {sortable && active && <Icon name="chevronDown" size={11} className={cx('transition-transform', dir === 'asc' && 'rotate-180')} />}
      </span>
    </th>
  )
}

export function Td({ children, className, align, mono }: { children?: React.ReactNode; className?: string; align?: 'right' | 'center'; mono?: boolean }) {
  return (
    <td className={cx('px-3 py-2.5 border-b border-line align-middle', align === 'right' && 'text-right', align === 'center' && 'text-center', mono && 'font-mono text-xs', className)}>
      {children}
    </td>
  )
}

export function Tr({ children, onClick, className, selected }: { children: React.ReactNode; onClick?: () => void; className?: string; selected?: boolean }) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      className={cx(
        'transition-colors duration-100',
        onClick && 'cursor-pointer hover:bg-sunken',
        selected && 'bg-sunken',
        className,
      )}
    >
      {children}
    </tr>
  )
}

/* ============================ Form ============================ */

export function Field({ label, hint, error, children, className, required }: {
  label?: string; hint?: string; error?: string; children: React.ReactNode; className?: string; required?: boolean
}) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-2">
          {label}{required && <span className="text-bad">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-2xs text-ink-4">{hint}</span>}
      {error && <span className="mt-1 flex items-center gap-1 text-2xs text-bad"><Icon name="alert" size={11} />{error}</span>}
    </label>
  )
}

const CONTROL =
  'w-full rounded border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-ink-4 ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-line-strong ' +
  'focus:outline-none focus:border-[color:var(--hv)] focus:ring-2 focus:ring-[var(--hv-30)] ' +
  'disabled:bg-sunken disabled:text-ink-4'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cx(CONTROL, 'h-8', invalid && 'border-bad', className)} {...rest} />
  },
)

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, 'py-2 resize-y min-h-[72px] leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(CONTROL, 'h-8 appearance-none pr-7 cursor-pointer', className)} {...rest}>{children}</select>
      <Icon name="chevronDown" size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-4" />
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(CONTROL, 'h-8 pl-8 pr-7')}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink p-0.5 rounded">
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  )
}

export function Checkbox({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; hint?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex items-start gap-2.5 cursor-pointer group', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className="relative flex h-4 w-4 shrink-0 mt-px">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className={cx(
          'h-4 w-4 rounded-xs border transition-all duration-150 ease-out flex items-center justify-center',
          checked ? 'bg-hv border-hv' : 'border-line-strong bg-surface group-hover:border-ink-4',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--hv-40)] peer-focus-visible:ring-offset-1',
        )}>
          {checked && <Icon name="check" size={11} className="text-hv-ink" strokeWidth={2.6} />}
        </span>
      </span>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-sm leading-tight">{label}</span>}
          {hint && <span className="block text-2xs text-ink-4 mt-0.5">{hint}</span>}
        </span>
      )}
    </label>
  )
}

/**
 * `label` draws visibly beside the track. `srLabel` names the control for
 * assistive tech without rendering anything — use it wherever the surrounding
 * row or column header already says what the switch does.
 */
export function Switch({ checked, onChange, label, srLabel, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; srLabel?: string; disabled?: boolean
}) {
  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : srLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative block h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200 ease-out',
        checked ? 'bg-hv' : 'bg-line-strong',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
    >
      {/*
        left-0 is load-bearing: without it the knob takes its static position,
        which centres inside a text-align:center cell and pushes it out of the
        track. White on hi-vis is nearly invisible, so the knob flips to hv-ink
        when on.
      */}
      <span className={cx('absolute left-0 top-[2px] h-[14px] w-[14px] rounded-full shadow-xs transition-transform duration-200 ease-out',
        checked ? 'translate-x-[16px] bg-[var(--hv-ink)]' : 'translate-x-[2px] bg-white')} />
    </button>
  )

  if (!label) return <span className={cx('inline-flex align-middle', disabled && 'opacity-50')}>{track}</span>

  return (
    <label className={cx('inline-flex items-center gap-2', disabled ? 'opacity-50' : 'cursor-pointer')}>
      {track}
      <span className="text-sm">{label}</span>
    </label>
  )
}

/* ============================ Tabs / segmented ============================ */

export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; count?: number }[]; size?: 'sm' | 'md'
}) {
  // scrolls sideways rather than wrapping when the options outrun the width
  return (
    <div className={cx('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-sunken p-0.5')}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-all duration-150 ease-out',
            size === 'sm' ? 'h-6 px-2 text-2xs' : 'h-7 px-2.5 text-xs',
            value === o.value ? 'bg-raised text-ink shadow-xs' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cx('num text-2xs tabular-nums', value === o.value ? 'text-ink-3' : 'text-ink-4')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Tabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; count?: number }[] }) {
  return (
    <div className="flex items-end gap-4 border-b border-line overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors duration-150',
            value === o.value ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 num text-xs text-ink-4">{o.count}</span>}
          <span className={cx('absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-all duration-200 ease-out',
            value === o.value ? 'bg-ink' : 'bg-transparent')} />
        </button>
      ))}
    </div>
  )
}

/* ============================ Overlays ============================ */

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
}

export function Modal({ open, onClose, title, sub, children, footer, width = 'md' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; sub?: React.ReactNode
  children: React.ReactNode; footer?: React.ReactNode; width?: 'sm' | 'md' | 'lg'
}) {
  useLockBody(open)
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[width]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-[oklch(0.2_0.02_260/0.42)] animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal className={cx('relative w-full mt-[6vh] rounded-xl border border-line bg-raised shadow-lg animate-slide-up', w)}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.018em]">{title}</h2>
            {sub && <p className="text-sm text-ink-3 mt-0.5">{sub}</p>}
          </div>
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </header>
        <div className="px-5 py-4 max-h-[62vh] overflow-y-auto">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 bg-surface rounded-b-xl">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, sub, children, footer, width = 'lg' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; sub?: React.ReactNode
  children: React.ReactNode; footer?: React.ReactNode; width?: 'md' | 'lg' | 'xl'
}) {
  useLockBody(open)
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[width]
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[oklch(0.2_0.02_260/0.38)] animate-fade-in" onClick={onClose} />
      <aside className={cx('relative flex h-full w-full flex-col bg-paper border-l border-line shadow-lg animate-slide-in-right', w)}>
        <header className="flex items-start justify-between gap-4 border-b border-line bg-raised px-5 py-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.018em] truncate">{title}</h2>
            {sub && <div className="text-sm text-ink-3 mt-0.5">{sub}</div>}
          </div>
          <IconButton icon="x" label="Close panel" size="sm" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="shrink-0 border-t border-line bg-raised px-5 py-3 flex items-center justify-end gap-2">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

/* ============================ Popover ============================ */

export function Popover({ trigger, children, align = 'right', width = 260 }: {
  trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'; width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          style={{ width }}
          className={cx('absolute z-40 mt-1.5 rounded-lg border border-line bg-raised shadow-pop animate-slide-up overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0')}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, children, onClick, tone, disabled, shortcut }: {
  icon?: IconName; children: React.ReactNode; onClick?: () => void; tone?: 'bad'; disabled?: boolean; shortcut?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx('flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors duration-100',
        'hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none',
        tone === 'bad' ? 'text-bad' : 'text-ink-2 hover:text-ink')}
    >
      {icon && <Icon name={icon} size={14} className="shrink-0 text-ink-4" />}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <kbd className="text-2xs text-ink-4 font-mono">{shortcut}</kbd>}
    </button>
  )
}

/* ============================ Feedback ============================ */

export function EmptyState({ icon = 'box', title, body, action }: { icon?: IconName; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-sunken text-ink-4">
        <Icon name={icon} size={19} />
      </div>
      <h3 className="text-md font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-[46ch] text-sm text-ink-3 leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-3 space-y-2.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cx('h-4', c === 0 ? 'w-[22%]' : c === cols - 1 ? 'w-[12%] ml-auto' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Callout({ tone = 'info', icon, title, children, action, className }: { tone?: Tone; icon?: IconName; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const map: Record<Tone, string> = {
    info: 'bg-info-bg text-info', ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn',
    bad: 'bg-bad-bg text-bad', neutral: 'bg-sunken text-ink-2', purple: 'bg-purple-bg text-purple', hv: 'bg-hv-dim text-hv-ink',
  }
  return (
    <div className={cx('rounded-md border border-line px-3 py-2.5 flex items-start gap-2.5', map[tone], className)}>
      <Icon name={icon ?? (tone === 'bad' || tone === 'warn' ? 'alert' : 'info')} size={15} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-medium">{title}</div>}
        {children && <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ============================ Misc ============================ */

export function Avatar({ name, size = 28, tone }: { name: string; size?: number; tone?: 'hv' | 'neutral' }) {
  const init = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = (name.charCodeAt(0) * 37 + name.length * 13) % 360
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: tone === 'hv' ? 'var(--hv)' : `oklch(0.92 0.045 ${hue})`,
        color: tone === 'hv' ? 'var(--hv-ink)' : `oklch(0.36 0.09 ${hue})`,
      }}
      title={name}
    >
      {init}
    </span>
  )
}

export function Meter({ value, max = 1, tone = 'hv', height = 4, className }: { value: number; max?: number; tone?: Tone; height?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const c: Record<Tone, string> = { hv: 'bg-hv', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', purple: 'bg-purple', neutral: 'bg-ink-4' }
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-sunken', className)} style={{ height }}>
      <div className={cx('h-full rounded-full transition-[width] duration-500 ease-out', c[tone])} style={{ width: `${pct * 100}%` }} />
    </div>
  )
}

export function KV({ label, children, mono }: { label: React.ReactNode; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-ink-3 shrink-0">{label}</dt>
      <dd className={cx('text-sm text-right min-w-0 truncate', mono && 'font-mono text-xs')}>{children}</dd>
    </div>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border border-line bg-sunken px-1 font-mono text-2xs text-ink-3">{children}</kbd>
}

/* ============================ Toasts ============================ */

interface ToastShape { id: string; title: string; body?: string; tone?: 'default' | 'ok' | 'bad'; action?: { label: string; to: string } }

export function Toaster({ toasts, onDismiss, onNavigate }: { toasts: ToastShape[]; onDismiss: (id: string) => void; onNavigate?: (to: string) => void }) {
  if (!toasts.length) return null
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line bg-raised px-3.5 py-3 shadow-lg animate-toast-in">
          <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
            t.tone === 'bad' ? 'bg-bad-bg text-bad' : t.tone === 'ok' ? 'bg-hv text-hv-ink' : 'bg-sunken text-ink-3')}>
            <Icon name={t.tone === 'bad' ? 'alert' : t.tone === 'ok' ? 'check' : 'info'} size={11} strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium leading-snug">{t.title}</div>
            {t.body && <div className="mt-0.5 text-xs text-ink-3 leading-relaxed">{t.body}</div>}
            {t.action && onNavigate && (
              <button onClick={() => { onNavigate(t.action!.to); onDismiss(t.id) }} className="mt-1.5 text-xs font-medium text-ink underline underline-offset-2 hover:text-ink-2">
                {t.action.label}
              </button>
            )}
          </div>
          <button onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="text-ink-4 hover:text-ink -mr-1 -mt-0.5 p-1 rounded">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

/* ============================ Confirm ============================ */

const ConfirmCtx = createContext<(o: { title: string; body?: string; confirmLabel?: string; tone?: 'bad' }) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<{ title: string; body?: string; confirmLabel?: string; tone?: 'bad'; resolve: (v: boolean) => void } | null>(null)
  const ask = React.useCallback((o: { title: string; body?: string; confirmLabel?: string; tone?: 'bad' }) =>
    new Promise<boolean>((resolve) => setReq({ ...o, resolve })), [])
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal
        open={!!req}
        onClose={() => { req?.resolve(false); setReq(null) }}
        title={req?.title ?? ''}
        width="sm"
        footer={
          <>
            <Button size="sm" onClick={() => { req?.resolve(false); setReq(null) }}>Cancel</Button>
            <Button size="sm" variant={req?.tone === 'bad' ? 'danger' : 'primary'} onClick={() => { req?.resolve(true); setReq(null) }}>
              {req?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2 leading-relaxed">{req?.body}</p>
      </Modal>
    </ConfirmCtx.Provider>
  )
}

/* ============================ misc hooks ============================ */

export function useDelayedReady(ms = 320) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), ms); return () => clearTimeout(t) }, [ms])
  return ready
}

export function useAutoId(prefix: string) {
  const id = useId()
  return `${prefix}${id.replace(/:/g, '')}`
}
