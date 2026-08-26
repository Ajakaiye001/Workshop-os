import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import {
  Avatar, Badge, Button, Metric, MetricStrip, PageHeader, Panel, SearchInput, Segmented, Switch,
  Table, Td, Th, Tr, Meter, cx, Icon,
} from '../../components/ui'
import { StatusBadge } from '../../components/Bits'
import { num, pct } from '../../lib/format'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

export default function Staff() {
  const shop = useShop()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'people' | 'shifts'>('people')

  const rows = shop.staff.filter((s) => `${s.name} ${shop.roles.find((r) => r.id === s.roleId)?.name}`.toLowerCase().includes(q.toLowerCase()))
  const techs = shop.staff.filter((s) => s.roleId === 'technician')
  const onDuty = shop.staff.filter((s) => s.onDuty)
  const billed = techs.reduce((t, s) => t + s.stats.billedHours, 0)
  const available = techs.reduce((t, s) => t + s.stats.availableHours, 0)

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Staff" sub={`${shop.staff.length} people · ${onDuty.length} on duty right now`}>
        <Button icon="calendar" onClick={() => setTab('shifts')}>Shift plan</Button>
        <Button variant="primary" icon="plus">Add person</Button>
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
        <Metric label="On duty" value={onDuty.length} tone="ok" hint={`${techs.filter((t) => t.onDuty).length} technicians`} />
        <Metric label="Productivity" value={Math.round((billed / available) * 100)} unit="%" hint="billed vs available, 30 days" />
        <Metric label="Billed hours" value={num(billed)} hint="rolling 30 days" />
        <Metric label="Rework rate" value={(techs.reduce((t, s) => t + s.stats.reworkRate, 0) / techs.length).toFixed(1)} unit="%" tone="warn" />
      </MetricStrip>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'people', label: 'People' }, { value: 'shifts', label: 'Shift plan' }]} />
        {tab === 'people' && <SearchInput value={q} onChange={setQ} placeholder="Search staff" className="ml-auto w-[220px]" />}
      </div>

      {tab === 'people' ? (
        <Panel bodyClass="p-0">
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Role</Th><Th>Shift</Th><Th>Current job</Th><Th>Specialisms</Th><Th align="right">Productivity</Th><Th align="center">On duty</Th></tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const role = shop.roles.find((r) => r.id === s.roleId)!
                const job = shop.jobs.find((j) => j.technicianId === s.id && ['in-progress', 'diagnosing', 'quality-check'].includes(j.status))
                const v = shop.getVehicle(job?.vehicleId)
                const prod = s.stats.availableHours ? s.stats.billedHours / s.stats.availableHours : 0
                return (
                  <Tr key={s.id} onClick={() => nav(`/app/staff/${s.id}`)}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size={28} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{s.name}</div>
                          <div className="truncate text-2xs text-ink-4">{s.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><Badge tone={s.roleId === 'owner' ? 'purple' : 'neutral'}>{role.name}</Badge></Td>
                    <Td><span className="num font-mono text-xs text-ink-3">{s.shift.start}–{s.shift.end}</span></Td>
                    <Td>
                      {job && v ? (
                        <Link to={`/app/jobs/${job.id}`} onClick={(e) => e.stopPropagation()} className="group inline-flex items-center gap-1.5">
                          <span className="text-sm group-hover:underline">{v.make} {v.model}</span>
                          <StatusBadge status={job.status} />
                        </Link>
                      ) : <span className="text-2xs text-ink-4">{s.roleId === 'technician' ? 'Free' : '—'}</span>}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(s.specialisms ?? []).slice(0, 2).map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}
                      </div>
                    </Td>
                    <Td align="right">
                      {s.roleId === 'technician' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="num text-sm">{pct(prod)}</span>
                          <Meter value={prod} className="w-14" tone={prod > 0.85 ? 'ok' : prod > 0.65 ? 'hv' : 'warn'} />
                        </div>
                      ) : <span className="text-2xs text-ink-4">—</span>}
                    </Td>
                    <Td align="center">
                      <span onClick={(e) => e.stopPropagation()}>
                        <Switch checked={s.onDuty} onChange={(v2) => shop.dispatch({ t: 'staffDuty', staffId: s.id, onDuty: v2 })} srLabel={`${s.name} on duty`} />
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Panel>
      ) : (
        <ShiftPlan />
      )}
    </div>
  )
}

function ShiftPlan() {
  const shop = useShop()
  const staff = shop.staff.filter((s) => s.roleId === 'technician' || s.roleId === 'advisor')
  return (
    <Panel title="This week" subtitle="Drag is disabled in the prototype — shifts are set on each person's profile" bodyClass="p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[900px] p-4">
          <div className="mb-2 flex">
            <div className="w-[168px] shrink-0" />
            <div className="relative flex-1">
              <div className="flex">
                {HOURS.map((h) => (
                  <div key={h} className="flex-1 border-l border-line pl-1 text-2xs text-ink-4">{String(h).padStart(2, '0')}</div>
                ))}
              </div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {staff.map((s) => {
              const start = Number(s.shift.start.split(':')[0]) + Number(s.shift.start.split(':')[1]) / 60
              const end = Number(s.shift.end.split(':')[0]) + Number(s.shift.end.split(':')[1]) / 60
              const left = ((start - HOURS[0]) / HOURS.length) * 100
              const width = ((end - start) / HOURS.length) * 100
              const jobs = shop.jobs.filter((j) => j.technicianId === s.id && !['completed'].includes(j.status))
              const load = jobs.reduce((t, j) => t + j.labour.reduce((x, l) => x + l.hours, 0), 0)
              return (
                <li key={s.id} className="flex items-center">
                  <div className="flex w-[168px] shrink-0 items-center gap-2 pr-3">
                    <Avatar name={s.name} size={22} />
                    <span className="truncate text-xs">{s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.</span>
                  </div>
                  <div className="relative h-7 flex-1 rounded bg-sunken">
                    {HOURS.map((_, i) => <span key={i} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(i / HOURS.length) * 100}%` }} />)}
                    <div
                      className={cx('absolute inset-y-[3px] flex items-center gap-1.5 rounded px-2 text-2xs font-medium',
                        s.onDuty ? 'bg-hv text-hv-ink' : 'bg-line-strong text-ink-2')}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className="num font-mono">{s.shift.start}–{s.shift.end}</span>
                      {load > 0 && <span className="ml-auto num opacity-80">{num(load, 1)} h booked</span>}
                    </div>
                    <span
                      className="pointer-events-none absolute inset-y-0 w-px bg-bad"
                      style={{ left: `${((new Date().getHours() + new Date().getMinutes() / 60 - HOURS[0]) / HOURS.length) * 100}%` }}
                      title="Now"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-2xs text-ink-4">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-xs bg-hv" />On duty</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-xs bg-line-strong" />Rostered off</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-bad" />Now</span>
            <span className="ml-auto flex items-center gap-1.5"><Icon name="info" size={11} />{DAYS.join(' · ')} rota repeats weekly</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
