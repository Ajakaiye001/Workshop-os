import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Badge, Button, Callout, cx, Dot, Icon, Metric, MetricStrip, Panel, SectionLabel, Meter } from '../../components/ui'
import { PriorityTag, Reg } from '../../components/Bits'
import { dateLong, eur, eur0, num, relative, time } from '../../lib/format'
import { invoiceTotals } from '../../lib/money'
import type { Job } from '../../data/types'

const isSameDay = (iso: string, d = new Date()) => new Date(iso).toDateString() === d.toDateString()

export default function Overview() {
  const shop = useShop()
  const nav = useNavigate()

  const m = useMemo(() => {
    const todays = shop.jobs.filter((j) => isSameDay(j.bookedFor))
    const active = shop.jobs.filter((j) => !['completed'].includes(j.status))
    const inProgress = shop.jobs.filter((j) => ['in-progress', 'diagnosing', 'quality-check'].includes(j.status))
    const awaitingParts = shop.jobs.filter((j) => j.status === 'awaiting-parts')
    const awaitingApproval = shop.jobs.filter((j) => j.status === 'awaiting-approval')
    const ready = shop.jobs.filter((j) => j.status === 'ready')
    const completedToday = shop.jobs.filter((j) => j.status === 'completed' && isSameDay(j.bookedFor))

    const revenueToday = shop.invoices
      .filter((i) => isSameDay(i.issuedAt))
      .reduce((t, i) => t + invoiceTotals(i).total, 0)

    const partsSpend = shop.purchaseOrders
      .filter((p) => isSameDay(p.createdAt) && p.status !== 'rejected' && p.status !== 'draft')
      .reduce((t, p) => t + p.lines.reduce((s, l) => s + l.qty * l.unitCost, 0) + p.shipping, 0)

    const bayCount = shop.bays.filter((b) => b.status !== 'blocked').length
    const occupied = shop.bays.filter((b) => b.status === 'occupied').length
    const techsOn = shop.staff.filter((s) => s.roleId === 'technician' && s.onDuty)
    const bookedHours = inProgress.reduce((t, j) => t + j.labour.reduce((s, l) => s + l.hours, 0), 0)

    return {
      todays, active, inProgress, awaitingParts, awaitingApproval, ready, completedToday,
      revenueToday, partsSpend, utilisation: occupied / Math.max(1, bayCount), occupied, bayCount,
      techsOn, bookedHours,
    }
  }, [shop])

  const attention = useMemo(() => {
    const out: { job: Job; reason: string; tone: 'warn' | 'bad' | 'info' | 'ok'; cta: string; to: string }[] = []
    shop.jobs.forEach((j) => {
      const v = shop.getVehicle(j.vehicleId)
      if (!v) return
      if (j.status === 'awaiting-parts') {
        const blocked = j.parts.find((p) => p.status === 'ordered' || p.status === 'out')
        const part = shop.getPart(blocked?.partId)
        out.push({ job: j, reason: part ? `Waiting on ${part.name}` : 'Waiting on parts', tone: 'warn', cta: 'View parts', to: `/app/jobs/${j.id}` })
      } else if (j.status === 'awaiting-approval') {
        out.push({ job: j, reason: `Estimate sent ${j.estimateSentAt ? relative(j.estimateSentAt) : 'today'}, no answer`, tone: 'warn', cta: 'Chase customer', to: `/app/jobs/${j.id}` })
      } else if (j.status === 'ready') {
        out.push({ job: j, reason: 'Ready for collection, customer not yet called', tone: 'ok', cta: 'Call customer', to: `/app/jobs/${j.id}` })
      } else if (j.status === 'checked-in' && !j.technicianId) {
        out.push({ job: j, reason: 'Checked in with no technician assigned', tone: 'bad', cta: 'Assign', to: `/app/jobs/${j.id}` })
      } else if (j.status === 'diagnosing') {
        out.push({ job: j, reason: 'Diagnosis in progress', tone: 'info', cta: 'Follow', to: `/app/jobs/${j.id}` })
      }
    })
    const order = { bad: 0, warn: 1, ok: 2, info: 3 }
    return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 7)
  }, [shop])

  const pendingPOs = shop.purchaseOrders.filter((p) => p.status === 'pending-approval')
  const lowStock = shop.parts.filter((p) => p.qty - p.reserved <= p.reorderAt).sort((a, b) => (a.qty - a.reserved) - (b.qty - b.reserved))

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionLabel>{dateLong(new Date())}</SectionLabel>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.025em]">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {shop.me.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {m.todays.length} vehicles booked in · {m.techsOn.length} technicians on duty · {m.occupied} of {m.bayCount} bays working
          </p>
        </div>
        <div className="flex gap-2">
          {shop.can('jobs.create') && <Button variant="primary" icon="plus" onClick={() => nav('/app/bookings')}>New booking</Button>}
          <Button icon="scan" onClick={() => nav('/app/jobs?view=diagnosing')}>Diagnostics</Button>
        </div>
      </div>

      <MetricStrip className="mb-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Jobs today" value={m.todays.length} hint={`${m.active.length} open overall`} spark={[18, 22, 19, 24, 21, 26, m.todays.length]} />
        <Metric label="In progress" value={m.inProgress.length} tone="info" hint={`${num(m.bookedHours, 1)} h booked`} />
        <Metric label="Awaiting parts" value={m.awaitingParts.length} tone="warn" hint={`${pendingPOs.length} POs to approve`} />
        <Metric label="Completed" value={m.completedToday.length} tone="ok" hint={`${m.ready.length} ready for collection`} />
        {shop.can('finance.view') ? (
          <>
            <Metric label="Invoiced today" value={eur0(m.revenueToday)} delta={{ v: '12%', up: true }} spark={[3100, 3600, 3200, 4100, 3900, 4400, m.revenueToday]} />
            <Metric label="Parts spend" value={eur0(m.partsSpend)} delta={{ v: '4%', up: true, good: false }} hint="today" />
          </>
        ) : (
          <>
            <Metric label="Bay utilisation" value={Math.round(m.utilisation * 100)} unit="%" tone={m.utilisation > 0.8 ? 'ok' : 'warn'} />
            <Metric label="Low stock lines" value={lowStock.length} tone="warn" hint="at or below reorder point" />
          </>
        )}
      </MetricStrip>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* -------- needs attention -------- */}
        <div className="lg:col-span-2 space-y-5">
          <Panel
            title="Jobs that need a decision"
            subtitle="Sorted by what is blocking the floor right now"
            bodyClass="p-0"
            actions={<Link to="/app/jobs" className="text-xs text-ink-3 hover:text-ink">All jobs →</Link>}
          >
            <ul>
              {attention.map(({ job, reason, tone, cta, to }) => {
                const v = shop.getVehicle(job.vehicleId)!
                const c = shop.getCustomer(job.customerId)!
                return (
                  <li key={job.id}>
                    <Link to={to} className="group flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-sunken">
                      <Dot tone={tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : 'info'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{v.year} {v.make} {v.model}</span>
                          <Reg value={v.reg} />
                          <PriorityTag priority={job.priority} compact />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-ink-3">{reason}</div>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <div className="font-mono text-2xs text-ink-4">{job.number}</div>
                        <div className="mt-0.5 text-2xs text-ink-4">{c.name}</div>
                      </div>
                      <span className="ml-1 hidden shrink-0 items-center gap-1 text-xs font-medium text-ink-3 transition-colors group-hover:text-ink md:flex">
                        {cta}<Icon name="chevronRight" size={13} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Workshop floor" subtitle={`${m.occupied} of ${m.bayCount} bays working`} bodyClass="p-3"
            actions={<Link to="/app/bays" className="text-xs text-ink-3 hover:text-ink">Manage bays →</Link>}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shop.bays.map((b) => {
                const job = shop.getJob(b.jobId)
                const v = shop.getVehicle(job?.vehicleId)
                const tech = shop.getStaff(job?.technicianId)
                return (
                  <Link
                    key={b.id}
                    to={job ? `/app/jobs/${job.id}` : '/app/bays'}
                    className={cx('block rounded-md border p-2.5 transition-all duration-150 hover:shadow-sm',
                      b.status === 'occupied' ? 'border-line bg-surface' : b.status === 'blocked' ? 'border-dashed border-line bg-sunken' : 'border-dashed border-line')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xs font-medium text-ink-3">{b.name}</span>
                      {b.status === 'occupied' ? <Dot tone="ok" pulse /> : b.status === 'blocked' ? <Dot tone="bad" /> : null}
                    </div>
                    {v ? (
                      <>
                        <div className="mt-1.5 truncate text-xs font-medium">{v.make} {v.model}</div>
                        <div className="mt-0.5 truncate text-2xs text-ink-4">{tech?.name ?? 'Unassigned'}</div>
                      </>
                    ) : (
                      <div className="mt-1.5 text-xs text-ink-4">{b.status === 'blocked' ? b.note ?? 'Blocked' : 'Free'}</div>
                    )}
                  </Link>
                )
              })}
            </div>
          </Panel>
        </div>

        {/* -------- right rail -------- */}
        <div className="space-y-5">
          {shop.can('po.approve') && pendingPOs.length > 0 && (
            <Panel title="Waiting on you" bodyClass="p-0" dense>
              {pendingPOs.map((po) => {
                const sup = shop.getSupplier(po.supplierId)!
                const total = po.lines.reduce((t, l) => t + l.qty * l.unitCost, 0) + po.shipping
                return (
                  <div key={po.id} className="border-b border-line p-3 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium">{po.number}</span>
                          <Badge tone="warn">Approval</Badge>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-ink-3">{sup.name}</div>
                      </div>
                      <span className="num shrink-0 text-sm font-semibold">{eur(total)}</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="xs" variant="primary" onClick={() => { shop.dispatch({ t: 'poStatus', poId: po.id, status: 'approved' }); shop.toast({ title: `${po.number} approved`, body: `Sent to ${sup.name}`, tone: 'ok' }) }}>Approve</Button>
                      <Button size="xs" onClick={() => nav(`/app/purchasing/${po.id}`)}>Review</Button>
                    </div>
                  </div>
                )
              })}
            </Panel>
          )}

          <Panel title="Technician load" subtitle="Today" bodyClass="p-3" dense>
            <ul className="space-y-2.5">
              {m.techsOn.slice(0, 7).map((t) => {
                const jobs = shop.jobs.filter((j) => j.technicianId === t.id && !['completed'].includes(j.status))
                const hours = jobs.reduce((s, j) => s + j.labour.reduce((x, l) => x + l.hours, 0), 0)
                const cap = 8
                return (
                  <li key={t.id}>
                    <Link to={`/app/staff/${t.id}`} className="block group">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs group-hover:text-ink text-ink-2">{t.name}</span>
                        <span className="num shrink-0 text-2xs text-ink-4">{num(hours, 1)}/{cap} h</span>
                      </div>
                      <Meter className="mt-1" value={hours} max={cap} tone={hours > cap ? 'bad' : hours > cap * 0.85 ? 'warn' : 'hv'} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          {shop.can('inventory.edit') && (
            <Panel title="Stock alerts" bodyClass="p-0" dense
              actions={<Link to="/app/parts?view=low" className="text-xs text-ink-3 hover:text-ink">All →</Link>}>
              {lowStock.slice(0, 5).map((p) => (
                <Link key={p.id} to={`/app/parts/${p.id}`} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0 hover:bg-sunken">
                  <Dot tone={p.qty - p.reserved <= 0 ? 'bad' : 'warn'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{p.name}</span>
                    <span className="block truncate font-mono text-2xs text-ink-4">{p.partNumber}</span>
                  </span>
                  <span className="num shrink-0 text-xs">
                    <span className={p.qty - p.reserved <= 0 ? 'text-bad font-medium' : ''}>{p.qty - p.reserved}</span>
                    <span className="text-ink-4"> / {p.reorderAt}</span>
                  </span>
                </Link>
              ))}
            </Panel>
          )}

          <Panel title="Next in" subtitle="Later today and tomorrow" bodyClass="p-0" dense>
            {shop.bookings
              .filter((b) => new Date(b.at) > new Date())
              .sort((a, b) => a.at.localeCompare(b.at))
              .slice(0, 5)
              .map((b) => {
                const v = shop.getVehicle(b.vehicleId)!
                const c = shop.getCustomer(b.customerId)!
                return (
                  <div key={b.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0">
                    <span className="num w-10 shrink-0 font-mono text-2xs text-ink-3">{time(b.at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{v.make} {v.model}</span>
                      <span className="block truncate text-2xs text-ink-4">{c.name} · {b.serviceType}</span>
                    </span>
                    {isSameDay(b.at) ? <Badge tone="info">Today</Badge> : <span className="text-2xs text-ink-4">{relative(b.at)}</span>}
                  </div>
                )
              })}
          </Panel>

          {!shop.can('finance.view') && (
            <Callout tone="neutral" icon="lock" title="Financial data hidden">
              Your role ({shop.myRole.name}) cannot see revenue, margin or invoices. An Owner can change this in role settings.
            </Callout>
          )}
        </div>
      </div>
    </div>
  )
}
