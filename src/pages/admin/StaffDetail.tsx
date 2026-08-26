import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Avatar, Badge, Button, EmptyState, KV, Metric, MetricStrip, Panel, Switch, Table, Td, Th, Tr, Meter } from '../../components/ui'
import { BackLink, Money, Reg, StatusBadge } from '../../components/Bits'
import { BarChart } from '../../components/charts'
import { dateMed, num, pct, relative } from '../../lib/format'

export default function StaffDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const s = shop.getStaff(id)

  if (!s) return <EmptyState icon="users" title="Person not found" action={<Button onClick={() => nav('/app/staff')}>Back to staff</Button>} />

  const role = shop.roles.find((r) => r.id === s.roleId)!
  const jobs = shop.jobs.filter((j) => j.technicianId === s.id)
  const open = jobs.filter((j) => j.status !== 'completed')
  const prod = s.stats.availableHours ? s.stats.billedHours / s.stats.availableHours : 0

  return (
    <div className="mx-auto max-w-[1300px]">
      <BackLink to="/app/staff">Staff</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={s.name} size={46} tone={s.onDuty ? 'hv' : undefined} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">{s.name}</h1>
              <Badge tone={s.onDuty ? 'ok' : 'neutral'}>{s.onDuty ? 'On duty' : 'Off duty'}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-ink-3">
              {role.name} · joined {dateMed(s.hiredOn)} · shift {s.shift.start}–{s.shift.end}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={s.onDuty} onChange={(v) => shop.dispatch({ t: 'staffDuty', staffId: s.id, onDuty: v })} label="On duty" />
          {shop.can('roles.manage') && <Button icon="shield" onClick={() => nav('/app/settings/roles')}>Role permissions</Button>}
        </div>
      </div>

      {s.roleId === 'technician' && (
        <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
          <Metric label="Productivity" value={pct(prod)} tone={prod > 0.85 ? 'ok' : 'warn'} hint="billed vs available" />
          <Metric label="Jobs completed" value={s.stats.jobsCompleted} hint="rolling 30 days" />
          <Metric label="Average job" value={s.stats.avgJobHours} unit="h" />
          <Metric label="Rework rate" value={s.stats.reworkRate} unit="%" tone={s.stats.reworkRate > 2 ? 'bad' : 'ok'} />
        </MetricStrip>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <Panel title="Assigned jobs" subtitle={`${open.length} open, ${jobs.length} total`} bodyClass="p-0">
            {jobs.length === 0 ? <div className="px-4 py-8 text-center text-sm text-ink-3">Nothing assigned.</div> : (
              <Table>
                <thead><tr><Th>Job</Th><Th>Vehicle</Th><Th>Service</Th><Th>Status</Th><Th align="right">Hours</Th><Th>Promised</Th></tr></thead>
                <tbody>
                  {[...jobs].sort((a, b) => b.bookedFor.localeCompare(a.bookedFor)).slice(0, 14).map((j) => {
                    const v = shop.getVehicle(j.vehicleId)!
                    return (
                      <Tr key={j.id} onClick={() => nav(`/app/jobs/${j.id}`)}>
                        <Td mono>{j.number}</Td>
                        <Td>
                          <div className="text-sm">{v.make} {v.model}</div>
                          <div className="mt-0.5"><Reg value={v.reg} /></div>
                        </Td>
                        <Td><span className="text-xs text-ink-3">{j.serviceType}</span></Td>
                        <Td><StatusBadge status={j.status} /></Td>
                        <Td align="right"><span className="num text-sm">{num(j.labour.reduce((t, l) => t + l.hours, 0), 1)}</span></Td>
                        <Td><span className="text-xs text-ink-3">{relative(j.promisedFor)}</span></Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Panel>

          {s.roleId === 'technician' && (
            <Panel title="Billed hours" subtitle="Last eight weeks" bodyClass="p-4">
              <BarChart
                data={Array.from({ length: 8 }, (_, i) => ({
                  label: `W${i + 1}`,
                  value: Math.round(s.stats.billedHours / 4 + ((i * 5 + s.stats.jobsCompleted) % 11) - 4),
                }))}
                format={(n) => `${Math.round(n)} h`}
                height={150}
              />
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Details" dense bodyClass="p-3">
            <dl>
              <KV label="Role">{role.name}</KV>
              <KV label="Email" mono>{s.email}</KV>
              <KV label="Phone" mono>{s.phone}</KV>
              <KV label="Shift">{s.shift.start}–{s.shift.end}</KV>
              {s.hourlyRate && <KV label="Charge-out rate"><Money value={s.hourlyRate} /> /h</KV>}
            </dl>
          </Panel>

          {!!s.specialisms?.length && (
            <Panel title="Specialisms" dense bodyClass="p-3">
              <ul className="flex flex-wrap gap-1">
                {s.specialisms.map((x) => <li key={x}><Badge tone="neutral">{x}</Badge></li>)}
              </ul>
            </Panel>
          )}

          <Panel title="What this role can do" dense bodyClass="p-3"
            actions={shop.can('roles.manage') ? <Link to="/app/settings/roles" className="text-2xs text-ink-3 hover:text-ink">Edit →</Link> : undefined}>
            <p className="mb-2 text-2xs leading-relaxed text-ink-3">{role.blurb}</p>
            <div className="flex items-baseline justify-between text-2xs">
              <span className="text-ink-4">Permissions granted</span>
              <span className="num font-medium">{role.permissions.length} / 21</span>
            </div>
            <Meter className="mt-1.5" value={role.permissions.length} max={21} tone="hv" />
          </Panel>

          <Panel title="Load today" dense bodyClass="p-3">
            <div className="num text-2xl font-semibold tracking-tight">
              {num(open.reduce((t, j) => t + j.labour.reduce((x, l) => x + l.hours, 0), 0), 1)} h
            </div>
            <p className="mt-1 text-2xs text-ink-4">booked against an 8 hour shift</p>
            <Meter className="mt-2" value={open.reduce((t, j) => t + j.labour.reduce((x, l) => x + l.hours, 0), 0)} max={8} tone="hv" height={6} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
