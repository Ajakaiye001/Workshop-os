import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Avatar, Badge, Button, EmptyState, Icon, KV, Metric, MetricStrip, Panel, Table, Td, Th, Tr } from '../../components/ui'
import { BackLink, InvoiceStatusBadge, Money, Reg, StatusBadge } from '../../components/Bits'
import { AddVehicleModal } from '../../features/NewRecords'
import { dateMed, eur0, relative } from '../../lib/format'
import { invoiceDue, invoiceTotals } from '../../lib/money'

export default function CustomerDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [addVehOpen, setAddVehOpen] = useState(false)
  const c = shop.getCustomer(id)

  if (!c) return <EmptyState icon="users" title="Customer not found" action={<Button onClick={() => nav('/app/customers')}>Back to customers</Button>} />

  const vehicles = shop.vehicles.filter((v) => v.customerId === c.id)
  const jobs = shop.jobs.filter((j) => j.customerId === c.id).sort((a, b) => b.bookedFor.localeCompare(a.bookedFor))
  const invoices = shop.invoices.filter((i) => i.customerId === c.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const spend = invoices.reduce((t, i) => t + invoiceTotals(i).total, 0)
  const owing = invoices.reduce((t, i) => t + invoiceDue(i), 0)
  const open = jobs.filter((j) => j.status !== 'completed')

  return (
    <div className="mx-auto max-w-[1300px]">
      <BackLink to="/app/customers">Customers</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">{c.name}</h1>
              {c.type === 'fleet' && <Badge tone="purple">Fleet account</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-ink-3">
              {c.company ? `${c.company} · ` : ''}Customer since {dateMed(c.since)} · prefers {c.preferredContact}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon="phone">Call</Button>
          <Button icon="mail">Email</Button>
          {shop.can('jobs.create') && <Button variant="primary" icon="plus" onClick={() => nav('/app/bookings')}>New booking</Button>}
        </div>
      </div>

      <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
        <Metric label="Vehicles" value={vehicles.length} />
        <Metric label="Jobs" value={jobs.length} hint={`${open.length} open`} tone={open.length ? 'info' : undefined} />
        {shop.can('finance.view') ? (
          <>
            <Metric label="Lifetime spend" value={eur0(spend)} hint="incl. VAT" />
            <Metric label="Outstanding" value={eur0(owing)} tone={owing > 0.5 ? 'bad' : 'ok'} />
          </>
        ) : (
          <>
            <Metric label="Last visit" value={jobs[0] ? relative(jobs[0].bookedFor) : '—'} />
            <Metric label="Invoices" value={invoices.length} />
          </>
        )}
      </MetricStrip>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <Panel
            title="Vehicles"
            bodyClass="p-0"
            subtitle={`${vehicles.length} on file`}
            actions={shop.can('customers.edit') && <Button size="sm" icon="plus" onClick={() => setAddVehOpen(true)}>Add vehicle</Button>}
          >
            {vehicles.length === 0 ? (
              <EmptyState
                icon="car"
                title="No vehicles on this account"
                body="Add one here, or add it as part of the next booking."
                action={shop.can('customers.edit') && <Button size="sm" variant="primary" icon="plus" onClick={() => setAddVehOpen(true)}>Add vehicle</Button>}
              />
            ) : (
            <Table>
              <thead><tr><Th>Vehicle</Th><Th>Registration</Th><Th>Fuel</Th><Th align="right">Mileage</Th><Th>NCT due</Th><Th>Last serviced</Th></tr></thead>
              <tbody>
                {vehicles.map((v) => (
                  <Tr key={v.id} onClick={() => nav(`/app/vehicles/${v.id}`)}>
                    <Td>
                      <div className="text-sm font-medium">{v.year} {v.make} {v.model}</div>
                      <div className="text-2xs text-ink-4">{v.variant} · {v.colour}</div>
                    </Td>
                    <Td><Reg value={v.reg} /></Td>
                    <Td><span className="text-xs text-ink-3">{v.fuel} · {v.transmission}</span></Td>
                    <Td align="right"><span className="num text-sm">{v.mileage.toLocaleString('en-IE')} km</span></Td>
                    <Td><span className={`text-xs ${new Date(v.nctDue) < new Date() ? 'text-bad' : 'text-ink-3'}`}>{relative(v.nctDue)}</span></Td>
                    <Td><span className="text-xs text-ink-3">{v.lastServiced ? dateMed(v.lastServiced) : '—'}</span></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            )}
          </Panel>

          <Panel title="Service history" bodyClass="p-0" subtitle={`${jobs.length} work orders`}>
            {jobs.length === 0 ? <div className="px-4 py-8 text-center text-sm text-ink-3">No jobs yet.</div> : (
              <Table>
                <thead><tr><Th>Job</Th><Th>Date</Th><Th>Vehicle</Th><Th>Service</Th><Th>Status</Th>{shop.can('finance.view') && <Th align="right">Value</Th>}</tr></thead>
                <tbody>
                  {jobs.slice(0, 12).map((j) => {
                    const v = shop.getVehicle(j.vehicleId)!
                    return (
                      <Tr key={j.id} onClick={() => nav(`/app/jobs/${j.id}`)}>
                        <Td mono>{j.number}</Td>
                        <Td><span className="text-xs text-ink-3">{dateMed(j.bookedFor)}</span></Td>
                        <Td><span className="text-sm">{v.make} {v.model}</span></Td>
                        <Td><span className="text-xs text-ink-3">{j.serviceType}</span></Td>
                        <Td><StatusBadge status={j.status} /></Td>
                        {shop.can('finance.view') && <Td align="right"><Money value={shop.totalsFor(j).total} className="text-sm" /></Td>}
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Panel>

          {shop.can('finance.view') && (
            <Panel title="Invoices" bodyClass="p-0">
              {invoices.length === 0 ? <div className="px-4 py-8 text-center text-sm text-ink-3">No invoices.</div> : (
                <Table>
                  <thead><tr><Th>Invoice</Th><Th>Issued</Th><Th align="right">Total</Th><Th align="right">Due</Th><Th>Status</Th></tr></thead>
                  <tbody>
                    {invoices.map((i) => (
                      <Tr key={i.id} onClick={() => nav(`/app/invoices/${i.id}`)}>
                        <Td mono>{i.number}</Td>
                        <Td><span className="text-xs text-ink-3">{dateMed(i.issuedAt)}</span></Td>
                        <Td align="right"><Money value={invoiceTotals(i).total} className="text-sm" /></Td>
                        <Td align="right"><span className={`num text-sm ${invoiceDue(i) > 0.5 ? 'text-bad' : 'text-ink-4'}`}>{invoiceDue(i) > 0.5 ? eur0(invoiceDue(i)) : '—'}</span></Td>
                        <Td><InvoiceStatusBadge status={i.status} /></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Contact" dense bodyClass="p-3">
            <dl>
              <KV label="Phone" mono>{c.phone}</KV>
              <KV label="Email" mono>{c.email}</KV>
              <KV label="Prefers">{c.preferredContact}</KV>
            </dl>
            <div className="mt-3 border-t border-line pt-2.5">
              <div className="text-2xs uppercase tracking-[0.09em] text-ink-4">Address</div>
              <address className="mt-1 text-xs not-italic leading-relaxed text-ink-2">
                {c.address}<br />{c.city}<br />{c.eircode}
              </address>
            </div>
          </Panel>

          {open.length > 0 && (
            <Panel title="In the workshop now" dense bodyClass="p-0">
              {open.map((j) => {
                const v = shop.getVehicle(j.vehicleId)!
                return (
                  <Link key={j.id} to={`/app/jobs/${j.id}`} className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-0 hover:bg-sunken">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{v.make} {v.model}</span>
                      <span className="mt-0.5 block"><StatusBadge status={j.status} /></span>
                    </span>
                    <Icon name="chevronRight" size={13} className="text-ink-4" />
                  </Link>
                )
              })}
            </Panel>
          )}

          {c.notes && (
            <Panel title="Account notes" dense bodyClass="p-3">
              <p className="text-xs leading-relaxed text-ink-2">{c.notes}</p>
            </Panel>
          )}
        </aside>
      </div>
      <AddVehicleModal open={addVehOpen} onClose={() => setAddVehOpen(false)} customerId={c.id} />
    </div>
  )
}
