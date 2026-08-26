import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Badge, Button, EmptyState, Icon, KV, Panel, Table, Td, Th, Tr, cx } from '../../components/ui'
import { BackLink, Money, Reg, StatusBadge } from '../../components/Bits'
import { dateMed, eur, num, relative } from '../../lib/format'

export default function VehicleDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const v = shop.getVehicle(id)

  if (!v) return <EmptyState icon="car" title="Vehicle not found" action={<Button onClick={() => nav('/app/vehicles')}>Back to vehicles</Button>} />

  const c = shop.getCustomer(v.customerId)!
  const jobs = shop.jobs.filter((j) => j.vehicleId === v.id).sort((a, b) => b.bookedFor.localeCompare(a.bookedFor))
  const current = jobs.find((j) => j.status !== 'completed')
  const invoices = shop.invoices.filter((i) => i.vehicleId === v.id)
  const partsFitted = jobs.flatMap((j) => j.parts.map((p) => ({ job: j, part: shop.getPart(p.partId)!, qty: p.qty })))
  const nctExpired = new Date(v.nctDue) < new Date()

  return (
    <div className="mx-auto max-w-[1300px]">
      <BackLink to="/app/vehicles">Vehicles</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{v.year} {v.make} {v.model}</h1>
            <Reg value={v.reg} size="md" />
            {current && <StatusBadge status={current.status} live />}
          </div>
          <p className="mt-1 text-sm text-ink-3">
            {v.variant} · {v.colour} · owned by <Link to={`/app/customers/${c.id}`} className="hover:underline">{c.name}</Link>
          </p>
        </div>
        <div className="flex gap-2">
          {current && <Button variant="primary" iconRight="arrowRight" onClick={() => nav(`/app/jobs/${current.id}`)}>Open current job</Button>}
          {shop.can('jobs.create') && <Button icon="plus" onClick={() => nav('/app/bookings')}>Book in</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {current && (
            <Panel title="Current job" bodyClass="p-4"
              actions={<Link to={`/app/jobs/${current.id}`} className="text-xs text-ink-3 hover:text-ink">Work order →</Link>}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <div className="text-2xs text-ink-4">Job</div>
                  <div className="font-mono text-sm font-medium">{current.number}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-4">Technician</div>
                  <div className="text-sm">{shop.getStaff(current.technicianId)?.name ?? 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-4">Bay</div>
                  <div className="text-sm">{shop.getBay(current.bayId)?.name ?? '—'}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-4">Promised</div>
                  <div className="text-sm">{relative(current.promisedFor)}</div>
                </div>
                {shop.can('finance.view') && (
                  <div className="ml-auto text-right">
                    <div className="text-2xs text-ink-4">Value</div>
                    <Money value={shop.totalsFor(current).total} className="text-md" strong />
                  </div>
                )}
              </div>
              <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-2">{current.concern}</p>
            </Panel>
          )}

          <Panel title="Service history" subtitle={`${jobs.length} visits`} bodyClass="p-0">
            {jobs.length === 0 ? <div className="px-4 py-8 text-center text-sm text-ink-3">No history yet.</div> : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Job</Th><Th>Service</Th><Th>Work done</Th><Th>Technician</Th>{shop.can('finance.view') && <Th align="right">Value</Th>}</tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <Tr key={j.id} onClick={() => nav(`/app/jobs/${j.id}`)}>
                      <Td><span className="text-xs text-ink-3">{dateMed(j.bookedFor)}</span></Td>
                      <Td mono>{j.number}</Td>
                      <Td><span className="text-sm">{j.serviceType}</span></Td>
                      <Td>
                        <span className="text-xs text-ink-3">
                          {j.repairs.length ? j.repairs.map((r) => r.title).join(', ') : j.labour.map((l) => l.description).join(', ') || '—'}
                        </span>
                      </Td>
                      <Td><span className="text-xs text-ink-3">{shop.getStaff(j.technicianId)?.name ?? '—'}</span></Td>
                      {shop.can('finance.view') && <Td align="right"><Money value={shop.totalsFor(j).total} className="text-sm" /></Td>}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title="Parts fitted" subtitle="Everything ever fitted to this vehicle" bodyClass="p-0">
            {partsFitted.length === 0 ? <div className="px-4 py-8 text-center text-sm text-ink-3">No parts on record.</div> : (
              <Table>
                <thead><tr><Th>Part</Th><Th>Number</Th><Th>Fitted on</Th><Th align="right">Qty</Th><Th>Warranty</Th></tr></thead>
                <tbody>
                  {partsFitted.slice(0, 14).map((p, i) => {
                    const months = Math.round((Date.now() - new Date(p.job.bookedFor).getTime()) / (30 * 86400000))
                    return (
                      <Tr key={i} onClick={() => nav(`/app/parts/${p.part.id}`)}>
                        <Td><span className="text-sm">{p.part.name}</span><div className="text-2xs text-ink-4">{p.part.brand}</div></Td>
                        <Td mono>{p.part.partNumber}</Td>
                        <Td><span className="text-xs text-ink-3">{dateMed(p.job.bookedFor)}</span></Td>
                        <Td align="right"><span className="num text-sm">{p.qty}</span></Td>
                        <Td>
                          {months < 12
                            ? <Badge tone="ok">{12 - months} months left</Badge>
                            : <Badge tone="neutral">Expired</Badge>}
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Identity" dense bodyClass="p-3">
            <dl>
              <KV label="Registration"><Reg value={v.reg} size="md" /></KV>
              <KV label="VIN" mono>{v.vin}</KV>
              <KV label="Engine">{v.engine}</KV>
              <KV label="Fuel">{v.fuel}</KV>
              <KV label="Gearbox">{v.transmission}</KV>
              <KV label="Colour">{v.colour}</KV>
            </dl>
          </Panel>

          <Panel title="Condition" dense bodyClass="p-3">
            <dl>
              <KV label="Odometer" mono>{num(v.mileage)} km</KV>
              <KV label="Last serviced">{v.lastServiced ? dateMed(v.lastServiced) : '—'}</KV>
              <KV label="NCT due">
                <span className={cx(nctExpired ? 'text-bad font-medium' : '')}>{dateMed(v.nctDue)}</span>
              </KV>
            </dl>
            {nctExpired && (
              <div className="mt-2 flex items-start gap-2 rounded border border-line bg-bad-bg px-2.5 py-2 text-2xs text-bad">
                <Icon name="alert" size={12} className="mt-px shrink-0" />
                NCT has expired. Offer an NCT preparation inspection on the next visit.
              </div>
            )}
          </Panel>

          <Panel title="Owner" dense bodyClass="p-3"
            actions={<Link to={`/app/customers/${c.id}`} className="text-2xs text-ink-3 hover:text-ink">Profile →</Link>}>
            <div className="text-sm font-medium">{c.name}</div>
            <div className="mt-1 space-y-0.5 text-2xs text-ink-3">
              <div>{c.phone}</div>
              <div className="truncate">{c.email}</div>
              <div>{c.city}</div>
            </div>
          </Panel>

          {shop.can('finance.view') && (
            <Panel title="Spend on this vehicle" dense bodyClass="p-3">
              <div className="num text-2xl font-semibold tracking-tight">
                {eur(invoices.reduce((t, i) => t + i.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 + l.vatRate), 0), 0))}
              </div>
              <p className="mt-1 text-2xs text-ink-4">Across {invoices.length} invoices</p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}
