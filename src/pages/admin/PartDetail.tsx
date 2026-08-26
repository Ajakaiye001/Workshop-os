import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import {
  Badge, Button, EmptyState, Field, Input, KV, Panel, SectionLabel, Table, Td, Th, Tr, Meter, cx,
} from '../../components/ui'
import { BackLink, Money, Reg, StatusBadge, StockBadge } from '../../components/Bits'
import { SourcePartModal, SupplierCompare } from '../../features/SourcePart'
import { RankedBars } from '../../components/charts'
import { dateShort, eur, num } from '../../lib/format'
import { margin, stockStatus } from '../../lib/money'

export default function PartDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [sourcing, setSourcing] = useState(false)
  const part = shop.getPart(id)
  const [qty, setQty] = useState('')
  const [reorder, setReorder] = useState('')

  if (!part) return <EmptyState icon="box" title="Part not found" action={<Button onClick={() => nav('/app/parts')}>Back to inventory</Button>} />

  const free = part.qty - part.reserved
  const st = stockStatus(part)
  const usingJobs = shop.jobs.filter((j) => j.parts.some((p) => p.partId === part.id))
  const pos = shop.purchaseOrders.filter((o) => o.lines.some((l) => l.partId === part.id))
  const primary = shop.getSupplier(part.primarySupplierId)!

  return (
    <div className="mx-auto max-w-[1400px]">
      <BackLink to="/app/parts">Inventory</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{part.name}</h1>
            <StockBadge part={part} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-3">
            <span className="font-mono">{part.partNumber}</span>
            <span>·</span>
            <span>{part.brand}</span>
            <span>·</span>
            <span>{part.category}</span>
            <span>·</span>
            <span className="font-mono">Bin {part.location}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {shop.can('po.create') && <Button variant={st === 'out' ? 'primary' : 'secondary'} icon="truck" onClick={() => setSourcing(true)}>Order stock</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Panel title="Stock position" bodyClass="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {[
                { l: 'On hand', v: part.qty, tone: '' },
                { l: 'Reserved to jobs', v: part.reserved, tone: 'text-purple' },
                { l: 'Free to use', v: free, tone: free <= 0 ? 'text-bad' : free <= part.reorderAt ? 'text-warn' : 'text-ok' },
                { l: 'On order', v: part.onOrder, tone: 'text-info' },
              ].map((m, i) => (
                <div key={m.l} className={cx('px-4 py-3.5', i > 0 && 'sm:border-l sm:border-line', i >= 2 && 'border-t border-line sm:border-t-0', i % 2 === 1 && 'border-l border-line sm:border-l')}>
                  <div className="text-2xs uppercase tracking-[0.09em] text-ink-4">{m.l}</div>
                  <div className={cx('num mt-1 text-2xl font-semibold tracking-tight', m.tone)}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="mb-1.5 flex items-baseline justify-between text-2xs">
                <span className="text-ink-4">Against reorder point of {part.reorderAt}</span>
                <span className="num text-ink-3">{num(part.usage90d)} used in 90 days</span>
              </div>
              <Meter value={free} max={Math.max(part.reorderAt * 3, part.qty, 1)} tone={free <= 0 ? 'bad' : free <= part.reorderAt ? 'warn' : 'ok'} height={6} />
            </div>
            {shop.can('inventory.edit') && (
              <div className="flex flex-wrap items-end gap-2 border-t border-line bg-surface px-4 py-3">
                <Field label="Adjust on-hand" className="w-[130px]">
                  <Input placeholder={String(part.qty)} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Reorder point" className="w-[130px]">
                  <Input placeholder={String(part.reorderAt)} value={reorder} onChange={(e) => setReorder(e.target.value)} inputMode="numeric" />
                </Field>
                <Button size="sm"
                  onClick={() => {
                    if (qty !== '') shop.dispatch({ t: 'adjustStock', partId: part.id, qty: Number(qty) })
                    if (reorder !== '') shop.dispatch({ t: 'editPart', partId: part.id, patch: { reorderAt: Number(reorder) } })
                    setQty(''); setReorder('')
                    shop.toast({ title: 'Inventory updated', body: part.name, tone: 'ok' })
                  }}>
                  Save
                </Button>
                <span className="pb-1.5 text-2xs text-ink-4">Stock movements are logged against your user.</span>
              </div>
            )}
          </Panel>

          <Panel title="Jobs using this part" subtitle={`${usingJobs.length} work orders`} bodyClass="p-0">
            {usingJobs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-3">Not used on any current job.</div>
            ) : (
              <Table>
                <thead><tr><Th>Job</Th><Th>Vehicle</Th><Th>Status</Th><Th align="right">Qty</Th><Th>Line status</Th></tr></thead>
                <tbody>
                  {usingJobs.slice(0, 10).map((j) => {
                    const v = shop.getVehicle(j.vehicleId)!
                    const line = j.parts.find((p) => p.partId === part.id)!
                    return (
                      <Tr key={j.id} onClick={() => nav(`/app/jobs/${j.id}`)}>
                        <Td mono>{j.number}</Td>
                        <Td>
                          <div className="text-sm">{v.make} {v.model}</div>
                          <div className="mt-0.5"><Reg value={v.reg} /></div>
                        </Td>
                        <Td><StatusBadge status={j.status} /></Td>
                        <Td align="right"><span className="num text-sm">{line.qty}</span></Td>
                        <Td><StockBadge status={line.status} /></Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title="Purchase history" bodyClass="p-0">
            {pos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-3">Never ordered through WorkshopOS.</div>
            ) : (
              <Table>
                <thead><tr><Th>PO</Th><Th>Supplier</Th><Th>Raised</Th><Th align="right">Qty</Th><Th align="right">Unit cost</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {pos.map((o) => {
                    const l = o.lines.find((x) => x.partId === part.id)!
                    return (
                      <Tr key={o.id} onClick={() => nav(`/app/purchasing/${o.id}`)}>
                        <Td mono>{o.number}</Td>
                        <Td><span className="text-sm">{shop.getSupplier(o.supplierId)?.name}</span></Td>
                        <Td><span className="text-xs text-ink-3">{dateShort(o.createdAt)}</span></Td>
                        <Td align="right"><span className="num text-sm">{l.qty}</span></Td>
                        <Td align="right"><Money value={l.unitCost} className="text-sm" /></Td>
                        <Td><Badge tone={o.status === 'received' ? 'ok' : o.status === 'rejected' ? 'bad' : 'info'}>{o.status.replace('-', ' ')}</Badge></Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Supplier offers" dense bodyClass="px-3 py-1">
            <SupplierCompare part={part} />
          </Panel>

          {shop.can('finance.view') && (
            <Panel title="Pricing" dense bodyClass="p-3">
              <dl>
                <KV label="Trade cost"><Money value={part.cost} /></KV>
                <KV label="Retail price"><Money value={part.price} strong /></KV>
                <KV label="Margin">{Math.round(margin(part.price, part.cost) * 100)}% · {eur(part.price - part.cost)}</KV>
                <KV label="Stock at cost"><Money value={part.qty * part.cost} /></KV>
              </dl>
            </Panel>
          )}

          <Panel title="Details" dense bodyClass="p-3">
            <dl>
              <KV label="Primary supplier">
                <Link to={`/app/suppliers`} className="hover:underline">{primary.name}</Link>
              </KV>
              <KV label="Lead time">{primary.leadTimeDays === 1 ? 'Next day' : `${primary.leadTimeDays} days`}</KV>
              <KV label="Bin location" mono>{part.location}</KV>
              <KV label="Used, 90 days">{part.usage90d} units</KV>
            </dl>
            <div className="mt-3 border-t border-line pt-2.5">
              <SectionLabel>Fits</SectionLabel>
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {part.fits.map((f) => <li key={f}><Badge tone="neutral">{f}</Badge></li>)}
              </ul>
            </div>
          </Panel>

          <Panel title="Consumption" subtitle="Last 6 months" dense bodyClass="p-3">
            <RankedBars
              data={['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m, i) => ({
                label: m, value: Math.max(1, Math.round(part.usage90d / 3 + ((i * 7 + part.usage90d) % 9) - 3)),
              }))}
              format={(n) => `${n} used`}
            />
          </Panel>
        </aside>
      </div>

      <SourcePartModal open={sourcing} onClose={() => setSourcing(false)} part={part} qty={Math.max(1, part.reorderAt * 2 - free)} />
    </div>
  )
}
