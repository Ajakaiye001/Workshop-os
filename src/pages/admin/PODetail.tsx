import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Button, Callout, EmptyState, Icon, KV, Panel, Table, Td, Th, Tr, useConfirm } from '../../components/ui'
import { BackLink, Money, POStatusBadge, Reg, StatusBadge } from '../../components/Bits'
import { dateTime, eur, relative } from '../../lib/format'
import { poTotals } from '../../lib/money'

export default function PODetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const confirm = useConfirm()
  const po = shop.purchaseOrders.find((p) => p.id === id)

  if (!po) return <EmptyState icon="truck" title="Purchase order not found" action={<Button onClick={() => nav('/app/purchasing')}>Back to purchasing</Button>} />

  const sup = shop.getSupplier(po.supplierId)!
  const t = poTotals(po, (pid) => shop.getPart(pid)?.cost ?? 0)
  const jobIds = [...new Set(po.lines.map((l) => l.jobId).filter(Boolean))] as string[]

  return (
    <div className="mx-auto max-w-[1200px]">
      <BackLink to="/app/purchasing">Purchasing</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.02em]">{po.number}</h1>
            <POStatusBadge status={po.status} />
          </div>
          <p className="mt-1 text-sm text-ink-3">
            Raised {dateTime(po.createdAt)} by {shop.getStaff(po.createdById)?.name}
            {po.approvedAt && ` · approved ${relative(po.approvedAt)} by ${shop.getStaff(po.approvedById)?.name}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {po.status === 'draft' && shop.can('po.create') && (
            <Button variant="primary" icon="send" onClick={() => { shop.dispatch({ t: 'poStatus', poId: po.id, status: 'pending-approval' }); shop.toast({ title: 'Sent for approval', tone: 'ok' }) }}>
              Submit for approval
            </Button>
          )}
          {po.status === 'pending-approval' && shop.can('po.approve') && (
            <>
              <Button variant="primary" icon="check" onClick={() => { shop.dispatch({ t: 'poStatus', poId: po.id, status: 'approved' }); shop.toast({ title: `${po.number} approved`, body: `${eur(t.total)} authorised`, tone: 'ok' }) }}>Approve</Button>
              <Button icon="x" onClick={async () => {
                if (await confirm({ title: `Reject ${po.number}?`, body: 'The linked work orders stay blocked until a replacement order is raised.', confirmLabel: 'Reject order', tone: 'bad' })) {
                  shop.dispatch({ t: 'poStatus', poId: po.id, status: 'rejected', reason: 'Rejected by ' + shop.me.name })
                }
              }}>Reject</Button>
            </>
          )}
          {po.status === 'approved' && (
            <Button variant="primary" icon="send" onClick={() => { shop.dispatch({ t: 'poStatus', poId: po.id, status: 'ordered' }); shop.toast({ title: `Order sent to ${sup.name}`, body: `Expected ${po.expectedAt ? relative(po.expectedAt) : 'shortly'}` }) }}>
              Send to supplier
            </Button>
          )}
          {(po.status === 'ordered' || po.status === 'partial') && shop.can('inventory.edit') && (
            <Button variant="hv" icon="check" onClick={() => { shop.dispatch({ t: 'poReceive', poId: po.id }); shop.toast({ title: 'Goods received', body: 'Inventory and linked work orders updated', tone: 'ok' }) }}>
              Book in goods
            </Button>
          )}
          <Button icon="print">Print</Button>
        </div>
      </div>

      {po.status === 'received' && (
        <Callout tone="ok" className="mb-4" title="Goods booked in" >
          Received {po.receivedAt ? relative(po.receivedAt) : 'today'}. Stock levels and every linked work order were updated automatically.
        </Callout>
      )}
      {po.status === 'rejected' && po.note && (
        <Callout tone="bad" className="mb-4" title="Rejected">{po.note}</Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Panel title="Order lines" bodyClass="p-0">
            <Table>
              <thead>
                <tr><Th>Part</Th><Th>Number</Th><Th>For</Th><Th align="right">Qty</Th><Th align="right">Received</Th><Th align="right">Unit cost</Th><Th align="right">Line</Th></tr>
              </thead>
              <tbody>
                {po.lines.map((l) => {
                  const p = shop.getPart(l.partId)!
                  const job = shop.getJob(l.jobId)
                  return (
                    <Tr key={l.id}>
                      <Td>
                        <Link to={`/app/parts/${p.id}`} className="text-sm font-medium hover:underline">{p.name}</Link>
                        <div className="text-2xs text-ink-4">{p.brand} · bin {p.location}</div>
                      </Td>
                      <Td mono>{p.partNumber}</Td>
                      <Td>
                        {job ? <Link to={`/app/jobs/${job.id}`} className="font-mono text-2xs hover:underline">{job.number}</Link>
                          : <span className="text-2xs text-ink-4">Stock</span>}
                      </Td>
                      <Td align="right"><span className="num text-sm">{l.qty}</span></Td>
                      <Td align="right"><span className={`num text-sm ${l.received < l.qty ? 'text-ink-4' : 'text-ok'}`}>{l.received}</span></Td>
                      <Td align="right"><Money value={l.unitCost} className="text-sm" muted /></Td>
                      <Td align="right"><Money value={l.unitCost * l.qty} className="text-sm" strong /></Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <div className="flex justify-end border-t border-line px-4 py-3">
              <dl className="w-full max-w-[260px] space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-ink-3">Goods</dt><dd className="num">{eur(t.goods)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-3">Delivery</dt><dd className="num">{eur(t.shipping)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1.5 text-md font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
              </dl>
            </div>
          </Panel>

          {jobIds.length > 0 && (
            <Panel title="Work orders waiting on this delivery" bodyClass="p-0">
              <Table>
                <thead><tr><Th>Job</Th><Th>Vehicle</Th><Th>Customer</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {jobIds.map((jid) => {
                    const j = shop.getJob(jid)!
                    const v = shop.getVehicle(j.vehicleId)!
                    return (
                      <Tr key={jid} onClick={() => nav(`/app/jobs/${jid}`)}>
                        <Td mono>{j.number}</Td>
                        <Td>
                          <div className="text-sm">{v.year} {v.make} {v.model}</div>
                          <div className="mt-0.5"><Reg value={v.reg} /></div>
                        </Td>
                        <Td><span className="text-sm">{shop.getCustomer(j.customerId)?.name}</span></Td>
                        <Td><StatusBadge status={j.status} /></Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Supplier" dense bodyClass="p-3">
            <div className="text-sm font-medium">{sup.name}</div>
            <div className="text-2xs text-ink-4">Account {sup.account}</div>
            <dl className="mt-2.5">
              <KV label="Contact">{sup.contact}</KV>
              <KV label="Phone" mono>{sup.phone}</KV>
              <KV label="Lead time">{sup.leadTimeDays === 1 ? 'Next day' : `${sup.leadTimeDays} days`}</KV>
              <KV label="Terms">{sup.terms}</KV>
              <KV label="Rating">{sup.rating.toFixed(1)} / 5</KV>
            </dl>
          </Panel>

          <Panel title="Order progress" dense bodyClass="p-3">
            <ol className="relative space-y-3">
              <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
              {[
                { l: 'Raised', at: po.createdAt, done: true },
                { l: 'Approved', at: po.approvedAt, done: !!po.approvedAt },
                { l: 'Sent to supplier', at: ['ordered', 'partial', 'received'].includes(po.status) ? po.approvedAt : undefined, done: ['ordered', 'partial', 'received'].includes(po.status) },
                { l: 'Received', at: po.receivedAt, done: po.status === 'received' },
              ].map((s) => (
                <li key={s.l} className="relative flex gap-2.5">
                  <span className={`relative z-[1] mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border ${s.done ? 'border-transparent bg-ink text-on-ink' : 'border-line bg-raised'}`}>
                    {s.done && <Icon name="check" size={9} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs ${s.done ? 'font-medium' : 'text-ink-4'}`}>{s.l}</span>
                    {s.at && <span className="block text-2xs text-ink-4">{dateTime(s.at)}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {po.expectedAt && po.status !== 'received' && (
              <div className="mt-3 rounded border border-line bg-surface px-2.5 py-2 text-2xs">
                <span className="text-ink-4">Expected </span>
                <span className="font-medium">{relative(po.expectedAt)}</span>
              </div>
            )}
          </Panel>

          {po.note && (
            <Panel title="Note" dense bodyClass="p-3">
              <p className="text-xs leading-relaxed text-ink-2">{po.note}</p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}
