import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Badge, Button, Drawer, Icon, KV, PageHeader, Panel, SearchInput, Table, Td, Th, Tr, cx } from '../../components/ui'
import { Money } from '../../components/Bits'
import { RankedBars } from '../../components/charts'
import { eur, eur0 } from '../../lib/format'
import { poTotals } from '../../lib/money'

export default function Suppliers() {
  const shop = useShop()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const rows = shop.suppliers.filter((s) => `${s.name} ${s.county} ${s.categories.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const cost = (id: string) => shop.getPart(id)?.cost ?? 0
  const spendFor = (sid: string) => shop.purchaseOrders.filter((p) => p.supplierId === sid && p.status === 'received').reduce((t, p) => t + poTotals(p, cost).net, 0)

  const sel = shop.getSupplier(open ?? undefined)

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Suppliers" sub={`${shop.suppliers.length} trade accounts`}>
        <Button variant="primary" icon="plus">Add supplier</Button>
      </PageHeader>

      <div className="mb-3 flex justify-end">
        <SearchInput value={q} onChange={setQ} placeholder="Search suppliers" className="w-[240px]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel bodyClass="p-0">
          <Table>
            <thead>
              <tr><Th>Supplier</Th><Th>Location</Th><Th>Categories</Th><Th align="right">Lead time</Th><Th align="right">Rating</Th><Th align="right">Open POs</Th><Th align="right">YTD spend</Th></tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const openPOs = shop.purchaseOrders.filter((p) => p.supplierId === s.id && !['received', 'rejected'].includes(p.status)).length
                return (
                  <Tr key={s.id} onClick={() => setOpen(s.id)} selected={open === s.id}>
                    <Td>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="font-mono text-2xs text-ink-4">{s.account}</div>
                    </Td>
                    <Td><span className="text-xs text-ink-3">{s.county}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {s.categories.slice(0, 3).map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
                        {s.categories.length > 3 && <span className="text-2xs text-ink-4">+{s.categories.length - 3}</span>}
                      </div>
                    </Td>
                    <Td align="right"><span className="text-xs">{s.leadTimeDays === 1 ? 'Next day' : `${s.leadTimeDays} days`}</span></Td>
                    <Td align="right">
                      <span className={cx('num text-sm', s.rating >= 4.5 ? 'text-ok' : s.rating < 4 ? 'text-warn' : '')}>{s.rating.toFixed(1)}</span>
                    </Td>
                    <Td align="right"><span className="num text-sm">{openPOs || '—'}</span></Td>
                    <Td align="right"><Money value={s.ytdSpend} className="text-sm" strong /></Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Panel>

        <aside className="space-y-4">
          <Panel title="Spend by supplier" subtitle="Year to date" dense bodyClass="p-3">
            <RankedBars
              data={[...shop.suppliers].sort((a, b) => b.ytdSpend - a.ytdSpend).slice(0, 7).map((s) => ({ label: s.name, value: s.ytdSpend }))}
              format={(n) => eur0(n)}
            />
          </Panel>
          <Panel title="Delivery performance" dense bodyClass="p-3">
            <RankedBars
              data={[...shop.suppliers].sort((a, b) => a.leadTimeDays - b.leadTimeDays).slice(0, 6).map((s) => ({ label: s.name, value: 6 - s.leadTimeDays }))}
              format={() => ''}
              tone="oklch(0.62 0.13 250)"
            />
            <p className="mt-3 text-2xs leading-relaxed text-ink-4">
              Longer bars are faster. Based on quoted lead time against orders raised in the last 90 days.
            </p>
          </Panel>
        </aside>
      </div>

      <Drawer open={!!sel} onClose={() => setOpen(null)} width="md" title={sel?.name ?? ''} sub={sel ? `Account ${sel.account} · ${sel.county}` : ''}>
        {sel && (
          <div className="space-y-5 p-5">
            <dl>
              <KV label="Contact">{sel.contact}</KV>
              <KV label="Phone" mono>{sel.phone}</KV>
              <KV label="Email" mono>{sel.email}</KV>
              <KV label="Payment terms">{sel.terms}</KV>
              <KV label="Lead time">{sel.leadTimeDays === 1 ? 'Next day' : `${sel.leadTimeDays} days`}</KV>
              <KV label="Rating">{sel.rating.toFixed(1)} / 5</KV>
              <KV label="Spend received"><Money value={spendFor(sel.id)} strong /></KV>
            </dl>

            <div>
              <div className="mb-2 text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Purchase orders</div>
              <ul className="space-y-1.5">
                {shop.purchaseOrders.filter((p) => p.supplierId === sel.id).slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button onClick={() => nav(`/app/purchasing/${p.id}`)} className="flex w-full items-center gap-3 rounded border border-line px-3 py-2 text-left hover:bg-sunken">
                      <span className="font-mono text-xs">{p.number}</span>
                      <span className="flex-1 text-2xs text-ink-4">{p.lines.length} lines</span>
                      <span className="num text-xs font-medium">{eur(poTotals(p, cost).total)}</span>
                      <Icon name="chevronRight" size={12} className="text-ink-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Parts supplied</div>
              <div className="flex flex-wrap gap-1">
                {shop.parts.filter((p) => p.offers.some((o) => o.supplierId === sel.id)).slice(0, 14).map((p) => (
                  <button key={p.id} onClick={() => nav(`/app/parts/${p.id}`)}>
                    <Badge tone="neutral">{p.name}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
