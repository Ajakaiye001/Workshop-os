import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { STATUS_LABEL, useShop } from '../../data/store'
import type { Job, JobStatus, Priority } from '../../data/types'
import {
  Button, Drawer, EmptyState, IconButton, KV, PageHeader, Panel, SearchInput,
  Segmented, Select, Table, Td, Th, Tr, cx, Field, Textarea,
} from '../../components/ui'
import { Money, PriorityTag, Reg, StatusBadge, TechCell } from '../../components/Bits'
import { dateShort, num, time } from '../../lib/format'

type View = 'all' | 'today' | 'mine' | 'in-progress' | 'awaiting-parts' | 'awaiting-approval' | 'ready' | 'completed'
type SortKey = 'promised' | 'status' | 'value' | 'vehicle'

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

export default function Jobs() {
  const shop = useShop()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) ?? 'today'
  const [q, setQ] = useState('')
  const [tech, setTech] = useState('')
  const [priority, setPriority] = useState('')
  const [sort, setSort] = useState<SortKey>('promised')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [peek, setPeek] = useState<Job | null>(null)

  const counts = useMemo(() => ({
    all: shop.jobs.length,
    today: shop.jobs.filter((j) => isToday(j.bookedFor)).length,
    mine: shop.jobs.filter((j) => j.technicianId === shop.currentStaffId || j.advisorId === shop.currentStaffId).length,
    'in-progress': shop.jobs.filter((j) => ['in-progress', 'diagnosing', 'quality-check'].includes(j.status)).length,
    'awaiting-parts': shop.jobs.filter((j) => j.status === 'awaiting-parts').length,
    'awaiting-approval': shop.jobs.filter((j) => j.status === 'awaiting-approval').length,
    ready: shop.jobs.filter((j) => j.status === 'ready').length,
    completed: shop.jobs.filter((j) => j.status === 'completed').length,
  }), [shop])

  const rows = useMemo(() => {
    let list = shop.jobs.filter((j) => {
      if (view === 'today') return isToday(j.bookedFor)
      if (view === 'mine') return j.technicianId === shop.currentStaffId || j.advisorId === shop.currentStaffId
      if (view === 'in-progress') return ['in-progress', 'diagnosing', 'quality-check'].includes(j.status)
      if (view === 'awaiting-parts') return j.status === 'awaiting-parts'
      if (view === 'awaiting-approval') return j.status === 'awaiting-approval'
      if (view === 'ready') return j.status === 'ready'
      if (view === 'completed') return j.status === 'completed'
      return true
    })
    if (tech) list = list.filter((j) => j.technicianId === tech)
    if (priority) list = list.filter((j) => j.priority === priority)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((j) => {
        const v = shop.getVehicle(j.vehicleId), c = shop.getCustomer(j.customerId)
        return `${j.number} ${j.serviceType} ${v?.make} ${v?.model} ${v?.reg} ${c?.name}`.toLowerCase().includes(t)
      })
    }
    const val = (j: Job) => shop.totalsFor(j).total
    const sorted = [...list].sort((a, b) => {
      if (sort === 'promised') return a.promisedFor.localeCompare(b.promisedFor)
      if (sort === 'status') return a.status.localeCompare(b.status)
      if (sort === 'value') return val(a) - val(b)
      const av = shop.getVehicle(a.vehicleId), bv = shop.getVehicle(b.vehicleId)
      return `${av?.make}${av?.model}`.localeCompare(`${bv?.make}${bv?.model}`)
    })
    return dir === 'asc' ? sorted : sorted.reverse()
  }, [shop, view, tech, priority, q, sort, dir])

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(k); setDir('asc') }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader title="Jobs" sub={`${rows.length} of ${shop.jobs.length} work orders`}>
        {shop.can('jobs.create') && <Button variant="primary" icon="plus" onClick={() => nav('/app/bookings')}>New job</Button>}
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={(v) => setParams(v === 'today' ? {} : { view: v })}
          options={[
            { value: 'today', label: 'Today', count: counts.today },
            { value: 'all', label: 'All', count: counts.all },
            { value: 'mine', label: 'Mine', count: counts.mine },
            { value: 'in-progress', label: 'In progress', count: counts['in-progress'] },
            { value: 'awaiting-parts', label: 'Awaiting parts', count: counts['awaiting-parts'] },
            { value: 'awaiting-approval', label: 'Approval', count: counts['awaiting-approval'] },
            { value: 'ready', label: 'Ready', count: counts.ready },
            { value: 'completed', label: 'Completed', count: counts.completed },
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={tech} onChange={(e) => setTech(e.target.value)} className="w-[150px]">
            <option value="">All technicians</option>
            {shop.staff.filter((s) => s.roleId === 'technician').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-[125px]">
            <option value="">Any priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search jobs" className="w-[210px]" />
        </div>
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No jobs match these filters"
            body="Try a different view, clear the search, or widen the technician and priority filters."
            action={<Button size="sm" onClick={() => { setQ(''); setTech(''); setPriority(''); setParams({}) }}>Reset filters</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Job</Th>
                <Th sortable active={sort === 'vehicle'} dir={dir} onClick={() => toggleSort('vehicle')}>Vehicle</Th>
                <Th>Customer</Th>
                <Th>Service</Th>
                <Th sortable active={sort === 'status'} dir={dir} onClick={() => toggleSort('status')}>Status</Th>
                <Th>Technician</Th>
                <Th>Bay</Th>
                <Th sortable active={sort === 'promised'} dir={dir} onClick={() => toggleSort('promised')}>Promised</Th>
                {shop.can('finance.view') && <Th align="right" sortable active={sort === 'value'} dir={dir} onClick={() => toggleSort('value')}>Value</Th>}
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => {
                const v = shop.getVehicle(j.vehicleId)!
                const c = shop.getCustomer(j.customerId)!
                const bay = shop.getBay(j.bayId)
                const late = new Date(j.promisedFor) < new Date() && !['completed', 'ready'].includes(j.status)
                return (
                  <Tr key={j.id} onClick={() => nav(`/app/jobs/${j.id}`)}>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium">{j.number}</span>
                        <PriorityTag priority={j.priority} compact />
                      </div>
                    </Td>
                    <Td>
                      <div className="min-w-[150px]">
                        <div className="truncate text-sm font-medium">{v.year} {v.make} {v.model}</div>
                        <div className="mt-0.5"><Reg value={v.reg} /></div>
                      </div>
                    </Td>
                    <Td><span className="truncate text-sm">{c.name}</span></Td>
                    <Td><span className="text-xs text-ink-3">{j.serviceType}</span></Td>
                    <Td><StatusBadge status={j.status} live /></Td>
                    <Td><TechCell id={j.technicianId} /></Td>
                    <Td><span className="font-mono text-2xs text-ink-3">{bay?.name ?? '—'}</span></Td>
                    <Td>
                      <span className={cx('num text-xs', late ? 'text-bad font-medium' : 'text-ink-3')}>
                        {isToday(j.promisedFor) ? time(j.promisedFor) : dateShort(j.promisedFor)}
                        {late && ' · late'}
                      </span>
                    </Td>
                    {shop.can('finance.view') && <Td align="right"><Money value={shop.totalsFor(j).total} className="text-sm" /></Td>}
                    <Td>
                      <IconButton
                        icon="layers" label="Quick view" size="xs"
                        onClick={(e) => { e.stopPropagation(); setPeek(j) }}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <JobPeek job={peek} onClose={() => setPeek(null)} />
    </div>
  )
}

/* ---------------- quick-look drawer with inline dispatch controls ---------------- */

function JobPeek({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const shop = useShop()
  const nav = useNavigate()
  const [note, setNote] = useState('')
  if (!job) return null
  const live = shop.getJob(job.id)!
  const v = shop.getVehicle(live.vehicleId)!
  const c = shop.getCustomer(live.customerId)!
  const t = shop.totalsFor(live)
  const canAssign = shop.can('jobs.assign')

  return (
    <Drawer
      open
      onClose={onClose}
      width="md"
      title={<span className="flex items-center gap-2"><span className="font-mono text-md">{live.number}</span><StatusBadge status={live.status} /></span>}
      sub={`${v.year} ${v.make} ${v.model} · ${c.name}`}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => { nav(`/app/jobs/${live.id}`); onClose() }}>Open work order</Button>
        </>
      }
    >
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-x-6">
          <dl>
            <KV label="Registration"><Reg value={v.reg} size="md" /></KV>
            <KV label="Mileage" mono>{num(v.mileage)} km</KV>
            <KV label="Service">{live.serviceType}</KV>
          </dl>
          <dl>
            <KV label="Promised">{time(live.promisedFor)}</KV>
            <KV label="Repairs">{live.repairs.length || '—'}</KV>
            {shop.can('finance.view') && <KV label="Value"><Money value={t.total} strong /></KV>}
          </dl>
        </div>

        <div className="rounded-md border border-line bg-surface p-3">
          <div className="text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Customer concern</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{live.concern}</p>
        </div>

        {canAssign && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Technician">
              <Select value={live.technicianId ?? ''} onChange={(e) => shop.dispatch({ t: 'jobAssign', jobId: live.id, technicianId: e.target.value })}>
                <option value="">Unassigned</option>
                {shop.staff.filter((s) => s.roleId === 'technician').map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.onDuty ? '' : ' (off)'}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bay">
              <Select value={live.bayId ?? ''} onChange={(e) => shop.dispatch({ t: 'moveJobToBay', jobId: live.id, bayId: e.target.value })}>
                <option value="">No bay</option>
                {shop.bays.map((b) => <option key={b.id} value={b.id}>{b.name}{b.jobId && b.jobId !== live.id ? ' (busy)' : ''}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={live.priority} onChange={(e) => shop.dispatch({ t: 'jobAssign', jobId: live.id, priority: e.target.value as Priority })}>
                {(['low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </Select>
            </Field>
          </div>
        )}

        {shop.can('jobs.edit') && (
          <Field label="Status">
            <Select value={live.status} onChange={(e) => shop.dispatch({ t: 'jobStatus', jobId: live.id, status: e.target.value as JobStatus })}>
              {(Object.keys(STATUS_LABEL) as JobStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
        )}

        <div>
          <Field label="Add a note">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible on the work order timeline" rows={3} />
          </Field>
          <Button size="sm" className="mt-2" disabled={!note.trim()}
            onClick={() => { shop.dispatch({ t: 'jobNote', jobId: live.id, body: note }); setNote(''); shop.toast({ title: 'Note added', tone: 'ok' }) }}>
            Add note
          </Button>
        </div>

        <div>
          <div className="mb-2 text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Recent activity</div>
          <ul className="space-y-2">
            {[...live.timeline].reverse().slice(0, 5).map((e) => (
              <li key={e.id} className="flex gap-2.5 text-xs">
                <span className="num w-11 shrink-0 font-mono text-2xs text-ink-4">{time(e.at)}</span>
                <span className="min-w-0">
                  <span className="block text-ink-2">{e.title}</span>
                  {e.detail && <span className="block text-2xs text-ink-4">{e.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  )
}
