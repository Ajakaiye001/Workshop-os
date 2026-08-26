import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Badge, EmptyState, Icon, Segmented, cx, Dot } from '../../components/ui'
import { PriorityTag, Reg, StatusBadge } from '../../components/Bits'
import { num, time } from '../../lib/format'

export default function TechJobs() {
  const shop = useShop()
  const nav = useNavigate()
  const [view, setView] = useState<'mine' | 'today' | 'done'>('mine')

  const me = shop.me
  const jobs = useMemo(() => {
    const all = shop.jobs.filter((j) => new Date(j.bookedFor).toDateString() === new Date().toDateString())
    if (view === 'mine') return shop.jobs.filter((j) => j.technicianId === me.id && j.status !== 'completed')
    if (view === 'done') return shop.jobs.filter((j) => j.technicianId === me.id && j.status === 'completed')
    return all
  }, [shop.jobs, view, me.id])

  const mineOpen = shop.jobs.filter((j) => j.technicianId === me.id && j.status !== 'completed')
  const hours = mineOpen.reduce((t, j) => t + j.labour.reduce((x, l) => x + l.hours, 0), 0)
  const active = mineOpen.find((j) => j.status === 'in-progress' || j.status === 'diagnosing')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {me.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          {mineOpen.length} jobs on your list · {num(hours, 1)} hours booked · shift ends {me.shift.end}
        </p>
      </div>

      {active && (
        <button
          onClick={() => nav(`/tech/${active.id}`)}
          className="mb-5 flex w-full items-center gap-3 rounded-xl border border-[var(--hv-40)] bg-hv-dim p-4 text-left transition-transform active:scale-[0.995]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hv text-hv-ink">
            <Icon name="wrench" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-3">Currently working on</span>
              <Dot tone="hv" pulse />
            </span>
            <span className="mt-0.5 block truncate text-lg font-semibold">{shop.vehicleLabel(active.vehicleId)}</span>
            <span className="mt-0.5 block text-xs text-ink-3">{active.number} · {shop.getBay(active.bayId)?.name ?? 'no bay'} · {active.serviceType}</span>
          </span>
          <Icon name="chevronRight" size={20} className="shrink-0 text-ink-3" />
        </button>
      )}

      <div className="mb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'mine', label: 'My jobs', count: mineOpen.length },
            { value: 'today', label: 'Workshop today', count: shop.jobs.filter((j) => new Date(j.bookedFor).toDateString() === new Date().toDateString()).length },
            { value: 'done', label: 'Completed', count: shop.jobs.filter((j) => j.technicianId === me.id && j.status === 'completed').length },
          ]}
        />
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon="clipboard" title="Nothing on your list" body="New work appears here the moment a manager assigns it to you." />
      ) : (
        <ul className="space-y-2.5">
          {jobs.map((j) => {
            const v = shop.getVehicle(j.vehicleId)!
            const c = shop.getCustomer(j.customerId)!
            const bay = shop.getBay(j.bayId)
            const blocked = j.parts.some((p) => p.status === 'out' || p.status === 'ordered')
            const codes = shop.getDiag(j.diagnosticSessionId)?.codes.length ?? 0
            const mine = j.technicianId === me.id
            return (
              <li key={j.id}>
                <button
                  onClick={() => nav(`/tech/${j.id}`)}
                  className="flex w-full items-start gap-3.5 rounded-xl border border-line bg-surface p-4 text-left transition-all duration-150 hover:border-line-strong active:scale-[0.995]"
                >
                  <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold',
                    bay ? 'bg-raised text-ink' : 'bg-sunken text-ink-4')}>
                    {bay ? bay.name.replace('Bay ', '') : '—'}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-lg font-semibold tracking-[-0.015em]">{v.make} {v.model}</span>
                      <Reg value={v.reg} size="md" />
                      <PriorityTag priority={j.priority} compact />
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink-3">{j.serviceType} · {c.name}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={j.status} live />
                      {blocked && <Badge tone="warn" icon="box">Parts on order</Badge>}
                      {codes > 0 && <Badge tone="purple" icon="scan">{codes} fault codes</Badge>}
                      {!mine && <Badge tone="neutral">{shop.getStaff(j.technicianId)?.name ?? 'Unassigned'}</Badge>}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="num block font-mono text-xs text-ink-4">{j.number}</span>
                    <span className="mt-1 block text-xs text-ink-3">due {time(j.promisedFor)}</span>
                    <span className="num mt-1 block text-xs text-ink-4">{num(j.labour.reduce((t, l) => t + l.hours, 0), 1)} h</span>
                  </span>

                  <Icon name="chevronRight" size={18} className="mt-1 shrink-0 text-ink-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
