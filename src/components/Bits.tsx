import { Link } from 'react-router-dom'
import type { InvoiceStatus, Job, JobStatus, Part, POStatus, Priority, Severity, Vehicle } from '../data/types'
import { Badge, cx, Dot, Icon, type Tone } from './ui'
import { STATUS_LABEL, useShop } from '../data/store'
import { stockStatus } from '../lib/money'
import { eur } from '../lib/format'

/* ---------- job status ---------- */

export const STATUS_TONE: Record<JobStatus, Tone> = {
  booked: 'neutral',
  'checked-in': 'neutral',
  assigned: 'info',
  diagnosing: 'purple',
  'awaiting-approval': 'warn',
  'awaiting-parts': 'warn',
  'in-progress': 'info',
  'quality-check': 'purple',
  ready: 'ok',
  completed: 'neutral',
}

export function StatusBadge({ status, live }: { status: JobStatus; live?: boolean }) {
  const tone = STATUS_TONE[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-sm border px-1.5 h-[21px] text-2xs font-medium whitespace-nowrap',
      tone === 'neutral' ? 'bg-sunken text-ink-2 border-line' : 'border-transparent',
      tone === 'ok' && 'bg-ok-bg text-ok', tone === 'warn' && 'bg-warn-bg text-warn',
      tone === 'info' && 'bg-info-bg text-info', tone === 'purple' && 'bg-purple-bg text-purple')}>
      <Dot tone={tone} pulse={live && (status === 'in-progress' || status === 'diagnosing')} />
      {STATUS_LABEL[status]}
    </span>
  )
}

const PRIORITY_MAP: Record<Priority, { tone: Tone; label: string }> = {
  low: { tone: 'neutral', label: 'Low' },
  normal: { tone: 'neutral', label: 'Normal' },
  high: { tone: 'warn', label: 'High' },
  urgent: { tone: 'bad', label: 'Urgent' },
}

export function PriorityTag({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const p = PRIORITY_MAP[priority]
  if (priority === 'normal' || priority === 'low') {
    return compact ? null : <span className="text-2xs text-ink-4">{p.label}</span>
  }
  return <Badge tone={p.tone} icon={priority === 'urgent' ? 'alert' : undefined}>{p.label}</Badge>
}

/* ---------- stock ---------- */

const STOCK_MAP = {
  'in-stock': { tone: 'ok' as Tone, label: 'In stock' },
  low: { tone: 'warn' as Tone, label: 'Low stock' },
  out: { tone: 'bad' as Tone, label: 'Out of stock' },
  ordered: { tone: 'info' as Tone, label: 'On order' },
  reserved: { tone: 'purple' as Tone, label: 'Reserved' },
}

export function StockBadge({ part, status }: { part?: Part; status?: keyof typeof STOCK_MAP }) {
  const s = status ?? (part ? stockStatus(part) : 'in-stock')
  const m = STOCK_MAP[s]
  return <Badge tone={m.tone}>{m.label}</Badge>
}

/* ---------- purchase orders ---------- */

export const PO_TONE: Record<POStatus, Tone> = {
  draft: 'neutral', 'pending-approval': 'warn', approved: 'info', ordered: 'info',
  partial: 'purple', received: 'ok', rejected: 'bad',
}
export const PO_LABEL: Record<POStatus, string> = {
  draft: 'Draft', 'pending-approval': 'Pending approval', approved: 'Approved', ordered: 'Ordered',
  partial: 'Part received', received: 'Received', rejected: 'Rejected',
}
export const POStatusBadge = ({ status }: { status: POStatus }) => <Badge tone={PO_TONE[status]}>{PO_LABEL[status]}</Badge>

/* ---------- invoices ---------- */

export const INV_TONE: Record<InvoiceStatus, Tone> = {
  draft: 'neutral', sent: 'info', 'part-paid': 'purple', paid: 'ok', overdue: 'bad', void: 'neutral',
}
export const INV_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', 'part-paid': 'Part paid', paid: 'Paid', overdue: 'Overdue', void: 'Void',
}
export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => <Badge tone={INV_TONE[status]}>{INV_LABEL[status]}</Badge>

/* ---------- severity ---------- */

export const SEVERITY_TONE: Record<Severity, Tone> = { low: 'info', medium: 'warn', high: 'bad' }
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge tone={SEVERITY_TONE[severity]}>
      <span className="capitalize">{severity}</span>
    </Badge>
  )
}

/* ---------- identifiers ---------- */

/**
 * A registration plate is an atomic token: it has a fixed height, so it must
 * never wrap (the second line would spill out of the border) and never shrink
 * below its own width. Neighbours in the same row are what should truncate.
 */
export function Reg({ value, size = 'sm' }: { value: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx(
      'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border border-line-strong bg-surface font-mono font-medium tracking-[0.04em] uppercase',
      size === 'md' ? 'h-6 px-1.5 text-xs' : 'h-[18px] px-1 text-2xs',
    )}>
      <span className="my-[2px] w-[3px] shrink-0 self-stretch rounded-[1px] bg-info" aria-hidden />
      {value}
    </span>
  )
}

export function VehicleCell({ vehicle, sub }: { vehicle?: Vehicle; sub?: React.ReactNode }) {
  if (!vehicle) return <span className="text-ink-4">—</span>
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Reg value={vehicle.reg} />
        {sub && <span className="text-2xs text-ink-4 truncate">{sub}</span>}
      </div>
    </div>
  )
}

export function TechCell({ id, fallback = 'Unassigned' }: { id?: string; fallback?: string }) {
  const { getStaff } = useShop()
  const s = getStaff(id)
  if (!s) return <span className="text-xs text-ink-4">{fallback}</span>
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={cx('h-1.5 w-1.5 rounded-full shrink-0', s.onDuty ? 'bg-ok' : 'bg-ink-4')} />
      <span className="truncate text-sm">{s.name}</span>
    </span>
  )
}

export function JobLink({ job, className }: { job: Job; className?: string }) {
  return (
    <Link to={`/app/jobs/${job.id}`} className={cx('font-mono text-xs font-medium hover:underline underline-offset-2', className)}>
      {job.number}
    </Link>
  )
}

export function Money({ value, className, strong, muted }: { value: number; className?: string; strong?: boolean; muted?: boolean }) {
  return (
    <span className={cx('num tabular-nums', strong && 'font-semibold', muted && 'text-ink-3', className)}>
      {eur(value)}
    </span>
  )
}

export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="mb-1.5 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors">
      <Icon name="chevronLeft" size={13} />
      {children}
    </Link>
  )
}

export function FuelGauge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-sunken">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', level < 0.2 ? 'bg-bad' : level < 0.35 ? 'bg-warn' : 'bg-ok')} style={{ width: `${level * 100}%` }} />
      </span>
      <span className="num text-2xs text-ink-3">{Math.round(level * 100)}%</span>
    </span>
  )
}
