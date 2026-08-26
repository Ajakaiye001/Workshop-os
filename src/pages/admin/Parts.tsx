import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { Part } from '../../data/types'
import {
  Button, EmptyState, Metric, MetricStrip, PageHeader, Panel, SearchInput,
  Segmented, Select, Table, Td, Th, Tr, cx,
} from '../../components/ui'
import { Money, StockBadge } from '../../components/Bits'
import { SourcePartModal } from '../../features/SourcePart'
import { eur0, num } from '../../lib/format'
import { inventoryValue, margin, stockStatus } from '../../lib/money'

type View = 'all' | 'low' | 'out' | 'ordered' | 'reserved'

export default function Parts() {
  const shop = useShop()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) ?? 'all'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [supplier, setSupplier] = useState('')
  const [sourcing, setSourcing] = useState<Part | null>(null)

  const categories = useMemo(() => [...new Set(shop.parts.map((p) => p.category))].sort(), [shop.parts])

  const stats = useMemo(() => ({
    total: shop.parts.length,
    low: shop.parts.filter((p) => stockStatus(p) === 'low').length,
    out: shop.parts.filter((p) => stockStatus(p) === 'out').length,
    ordered: shop.parts.filter((p) => p.onOrder > 0).length,
    reserved: shop.parts.filter((p) => p.reserved > 0).length,
    value: inventoryValue(shop.parts),
    retail: shop.parts.reduce((t, p) => t + p.qty * p.price, 0),
  }), [shop.parts])

  const rows = useMemo(() => {
    let list = shop.parts
    if (view === 'low') list = list.filter((p) => stockStatus(p) === 'low')
    if (view === 'out') list = list.filter((p) => stockStatus(p) === 'out')
    if (view === 'ordered') list = list.filter((p) => p.onOrder > 0)
    if (view === 'reserved') list = list.filter((p) => p.reserved > 0)
    if (cat) list = list.filter((p) => p.category === cat)
    if (supplier) list = list.filter((p) => p.offers.some((o) => o.supplierId === supplier))
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((p) => `${p.name} ${p.partNumber} ${p.brand} ${p.category} ${p.location}`.toLowerCase().includes(t))
    }
    return list
  }, [shop.parts, view, cat, supplier, q])

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader title="Inventory" sub={`${shop.parts.length} part lines across ${categories.length} categories`}>
        {shop.can('po.create') && <Button icon="truck" onClick={() => nav('/app/purchasing')}>Purchasing</Button>}
        {shop.can('inventory.edit') && <Button variant="primary" icon="plus">Add part</Button>}
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Part lines" value={stats.total} hint={`${num(shop.parts.reduce((t, p) => t + p.qty, 0))} units`} />
        <Metric label="Low stock" value={stats.low} tone="warn" hint="at reorder point" />
        <Metric label="Out of stock" value={stats.out} tone="bad" hint="blocking jobs" />
        <Metric label="On order" value={stats.ordered} tone="info" hint="awaiting delivery" />
        <Metric label="Stock value" value={eur0(stats.value)} hint="at cost" />
        <Metric label="Retail value" value={eur0(stats.retail)} hint={`${Math.round((1 - stats.value / stats.retail) * 100)}% blended margin`} />
      </MetricStrip>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={(v) => setParams(v === 'all' ? {} : { view: v })}
          options={[
            { value: 'all', label: 'All', count: shop.parts.length },
            { value: 'low', label: 'Low', count: stats.low },
            { value: 'out', label: 'Out', count: stats.out },
            { value: 'ordered', label: 'On order', count: stats.ordered },
            { value: 'reserved', label: 'Reserved', count: stats.reserved },
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[150px]">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-[170px]">
            <option value="">All suppliers</option>
            {shop.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search parts" className="w-[210px]" />
        </div>
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState icon="box" title="No parts match" body="Adjust the filters or search by part number." action={<Button size="sm" onClick={() => { setQ(''); setCat(''); setSupplier(''); setParams({}) }}>Reset</Button>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Part</Th>
                <Th>Number</Th>
                <Th>Category</Th>
                <Th align="right">Free</Th>
                <Th align="right">Reserved</Th>
                <Th align="right">On order</Th>
                <Th>Status</Th>
                <Th>Location</Th>
                {shop.can('finance.view') && <Th align="right">Cost</Th>}
                <Th align="right">Price</Th>
                {shop.can('finance.view') && <Th align="right">Margin</Th>}
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const free = p.qty - p.reserved
                const st = stockStatus(p)
                return (
                  <Tr key={p.id} onClick={() => nav(`/app/parts/${p.id}`)}>
                    <Td>
                      <div className="min-w-[170px]">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-2xs text-ink-4">{p.brand}</div>
                      </div>
                    </Td>
                    <Td mono>{p.partNumber}</Td>
                    <Td><span className="text-xs text-ink-3">{p.category}</span></Td>
                    <Td align="right"><span className={cx('num text-sm font-medium', free <= 0 && 'text-bad', free > 0 && free <= p.reorderAt && 'text-warn')}>{free}</span></Td>
                    <Td align="right"><span className="num text-sm text-ink-3">{p.reserved || '—'}</span></Td>
                    <Td align="right"><span className="num text-sm text-ink-3">{p.onOrder || '—'}</span></Td>
                    <Td><StockBadge part={p} /></Td>
                    <Td mono>{p.location}</Td>
                    {shop.can('finance.view') && <Td align="right"><Money value={p.cost} className="text-sm" muted /></Td>}
                    <Td align="right"><Money value={p.price} className="text-sm" /></Td>
                    {shop.can('finance.view') && <Td align="right"><span className="num text-sm text-ink-3">{Math.round(margin(p.price, p.cost) * 100)}%</span></Td>}
                    <Td align="right">
                      {(st === 'out' || st === 'low') && shop.can('po.create') && (
                        <Button size="xs" variant={st === 'out' ? 'primary' : 'secondary'} icon="truck"
                          onClick={(e) => { e.stopPropagation(); setSourcing(p) }}>
                          Order
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <SourcePartModal open={!!sourcing} onClose={() => setSourcing(null)} part={sourcing ?? undefined} qty={Math.max(1, (sourcing?.reorderAt ?? 1) * 2 - (sourcing?.qty ?? 0))} />
    </div>
  )
}
