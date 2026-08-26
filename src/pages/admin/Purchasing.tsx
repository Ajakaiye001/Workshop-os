import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { POStatus } from '../../data/types'
import {
  Button, Callout, EmptyState, Metric, MetricStrip, PageHeader, Panel, SearchInput,
  Segmented, Table, Td, Th, Tr,
} from '../../components/ui'
import { Money, POStatusBadge } from '../../components/Bits'
import { dateShort, eur0, relative } from '../../lib/format'
import { poTotals } from '../../lib/money'

type View = 'open' | 'approval' | 'ordered' | 'received' | 'all'

export default function Purchasing() {
  const shop = useShop()
  const nav = useNavigate()
  const [view, setView] = useState<View>('open')
  const [q, setQ] = useState('')

  const cost = (id: string) => shop.getPart(id)?.cost ?? 0

  const counts = useMemo(() => ({
    open: shop.purchaseOrders.filter((p) => !['received', 'rejected'].includes(p.status)).length,
    approval: shop.purchaseOrders.filter((p) => p.status === 'pending-approval').length,
    ordered: shop.purchaseOrders.filter((p) => p.status === 'ordered' || p.status === 'partial').length,
    received: shop.purchaseOrders.filter((p) => p.status === 'received').length,
    all: shop.purchaseOrders.length,
  }), [shop.purchaseOrders])

  const rows = useMemo(() => {
    let list = shop.purchaseOrders
    if (view === 'open') list = list.filter((p) => !['received', 'rejected'].includes(p.status))
    if (view === 'approval') list = list.filter((p) => p.status === 'pending-approval')
    if (view === 'ordered') list = list.filter((p) => p.status === 'ordered' || p.status === 'partial')
    if (view === 'received') list = list.filter((p) => p.status === 'received')
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((p) => `${p.number} ${shop.getSupplier(p.supplierId)?.name}`.toLowerCase().includes(t))
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [shop, view, q])

  const committed = shop.purchaseOrders
    .filter((p) => ['approved', 'ordered', 'partial'].includes(p.status))
    .reduce((t, p) => t + poTotals(p, cost).total, 0)
  const awaiting = shop.purchaseOrders
    .filter((p) => p.status === 'pending-approval')
    .reduce((t, p) => t + poTotals(p, cost).total, 0)
  const monthSpend = shop.purchaseOrders
    .filter((p) => p.status === 'received')
    .reduce((t, p) => t + poTotals(p, cost).net, 0)

  const blockedJobs = shop.jobs.filter((j) => j.status === 'awaiting-parts')

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Purchasing" sub="Purchase orders, approvals and goods in">
        {shop.can('po.create') && <Button variant="primary" icon="plus" onClick={() => nav('/app/parts?view=low')}>Raise order</Button>}
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
        <Metric label="Awaiting approval" value={counts.approval} tone={counts.approval ? 'warn' : 'neutral'} hint={eur0(awaiting)} />
        <Metric label="On order" value={counts.ordered} tone="info" hint={`${eur0(committed)} committed`} />
        <Metric label="Jobs blocked on parts" value={blockedJobs.length} tone={blockedJobs.length ? 'bad' : 'ok'} />
        <Metric label="Received, this month" value={eur0(monthSpend)} delta={{ v: '6%', up: true, good: false }} />
      </MetricStrip>

      {counts.approval > 0 && shop.can('po.approve') && (
        <Callout tone="warn" className="mb-4" title={`${counts.approval} purchase orders need your approval`}>
          Approving releases the order to the supplier and marks the linked work orders as on order.
        </Callout>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'approval', label: 'Approval', count: counts.approval },
            { value: 'ordered', label: 'On order', count: counts.ordered },
            { value: 'received', label: 'Received', count: counts.received },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search PO or supplier" className="ml-auto w-[230px]" />
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState icon="truck" title="No purchase orders here" body="Raise one from a low-stock part or straight from a work order." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th><Th>Supplier</Th><Th>Lines</Th><Th>For job</Th><Th>Raised</Th><Th>Expected</Th>
                <Th align="right">Total</Th><Th>Status</Th><Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => {
                const sup = shop.getSupplier(po.supplierId)!
                const t = poTotals(po, cost)
                const jobIds = [...new Set(po.lines.map((l) => l.jobId).filter(Boolean))] as string[]
                return (
                  <Tr key={po.id} onClick={() => nav(`/app/purchasing/${po.id}`)}>
                    <Td mono>{po.number}</Td>
                    <Td>
                      <div className="text-sm">{sup.name}</div>
                      <div className="text-2xs text-ink-4">{sup.county} · {sup.terms}</div>
                    </Td>
                    <Td><span className="num text-sm">{po.lines.length}</span></Td>
                    <Td>
                      {jobIds.length === 0 ? <span className="text-2xs text-ink-4">Stock</span> : (
                        <span className="font-mono text-2xs">{jobIds.map((id) => shop.getJob(id)?.number).join(', ')}</span>
                      )}
                    </Td>
                    <Td><span className="text-xs text-ink-3">{dateShort(po.createdAt)}</span></Td>
                    <Td><span className="text-xs text-ink-3">{po.status === 'received' ? '—' : po.expectedAt ? relative(po.expectedAt) : '—'}</span></Td>
                    <Td align="right"><Money value={t.total} className="text-sm" strong /></Td>
                    <Td><POStatusBadge status={po.status} /></Td>
                    <Td align="right">
                      <QuickActions status={po.status} poId={po.id} />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

function QuickActions({ status, poId }: { status: POStatus; poId: string }) {
  const shop = useShop()
  const po = shop.purchaseOrders.find((p) => p.id === poId)!
  const sup = shop.getSupplier(po.supplierId)!
  if (status === 'pending-approval' && shop.can('po.approve')) {
    return (
      <div className="flex justify-end gap-1">
        <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); shop.dispatch({ t: 'poStatus', poId, status: 'approved' }); shop.toast({ title: `${po.number} approved`, body: sup.name, tone: 'ok' }) }}>Approve</Button>
        <Button size="xs" onClick={(e) => { e.stopPropagation(); shop.dispatch({ t: 'poStatus', poId, status: 'rejected', reason: 'Rejected from the purchasing list' }) }}>Reject</Button>
      </div>
    )
  }
  if (status === 'approved') {
    return <Button size="xs" onClick={(e) => { e.stopPropagation(); shop.dispatch({ t: 'poStatus', poId, status: 'ordered' }); shop.toast({ title: `${po.number} sent to ${sup.name}` }) }}>Send order</Button>
  }
  if ((status === 'ordered' || status === 'partial') && shop.can('inventory.edit')) {
    return <Button size="xs" variant="hv" icon="check" onClick={(e) => { e.stopPropagation(); shop.dispatch({ t: 'poReceive', poId }); shop.toast({ title: 'Goods booked in', body: `${po.number} · stock and linked jobs updated`, tone: 'ok' }) }}>Receive</Button>
  }
  return null
}
