import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import {
  Button, EmptyState, Metric, MetricStrip, PageHeader, Panel, SearchInput, Segmented, Table, Td, Th, Tr, cx,
} from '../../components/ui'
import { InvoiceStatusBadge, Money, Reg } from '../../components/Bits'
import { dateShort, eur0, relative } from '../../lib/format'
import { invoiceDue, invoicePaid, invoiceTotals } from '../../lib/money'

type View = 'all' | 'draft' | 'outstanding' | 'overdue' | 'paid'

export default function Invoices() {
  const shop = useShop()
  const nav = useNavigate()
  const [view, setView] = useState<View>('outstanding')
  const [q, setQ] = useState('')

  const counts = useMemo(() => ({
    all: shop.invoices.length,
    draft: shop.invoices.filter((i) => i.status === 'draft').length,
    outstanding: shop.invoices.filter((i) => ['sent', 'part-paid', 'overdue'].includes(i.status)).length,
    overdue: shop.invoices.filter((i) => i.status === 'overdue').length,
    paid: shop.invoices.filter((i) => i.status === 'paid').length,
  }), [shop.invoices])

  const rows = useMemo(() => {
    let list = shop.invoices
    if (view === 'draft') list = list.filter((i) => i.status === 'draft')
    if (view === 'outstanding') list = list.filter((i) => ['sent', 'part-paid', 'overdue'].includes(i.status))
    if (view === 'overdue') list = list.filter((i) => i.status === 'overdue')
    if (view === 'paid') list = list.filter((i) => i.status === 'paid')
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((i) => `${i.number} ${shop.getCustomer(i.customerId)?.name} ${shop.getVehicle(i.vehicleId)?.reg}`.toLowerCase().includes(t))
    }
    return [...list].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  }, [shop, view, q])

  const outstanding = shop.invoices.filter((i) => ['sent', 'part-paid', 'overdue'].includes(i.status)).reduce((t, i) => t + invoiceDue(i), 0)
  const overdue = shop.invoices.filter((i) => i.status === 'overdue').reduce((t, i) => t + invoiceDue(i), 0)
  const collected = shop.invoices.reduce((t, i) => t + invoicePaid(i), 0)
  const avg = shop.invoices.length ? shop.invoices.reduce((t, i) => t + invoiceTotals(i).total, 0) / shop.invoices.length : 0

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Invoices" sub={`${shop.invoices.length} issued · VAT number ${shop.settings.vatNumber}`}>
        <Button icon="download">Export</Button>
        {shop.can('invoices.create') && <Button variant="primary" icon="plus" onClick={() => nav('/app/jobs?view=completed')}>Invoice a job</Button>}
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
        <Metric label="Outstanding" value={eur0(outstanding)} tone={outstanding > 0 ? 'warn' : 'ok'} hint={`${counts.outstanding} invoices`} />
        <Metric label="Overdue" value={eur0(overdue)} tone={overdue > 0 ? 'bad' : 'ok'} hint={`${counts.overdue} past due date`} />
        <Metric label="Collected" value={eur0(collected)} delta={{ v: '9%', up: true }} />
        <Metric label="Average job value" value={eur0(avg)} hint="incl. VAT" />
      </MetricStrip>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'outstanding', label: 'Outstanding', count: counts.outstanding },
            { value: 'overdue', label: 'Overdue', count: counts.overdue },
            { value: 'draft', label: 'Draft', count: counts.draft },
            { value: 'paid', label: 'Paid', count: counts.paid },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search invoice, customer or reg" className="ml-auto w-[250px]" />
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState icon="receipt" title="Nothing here" body="Completed work orders can be turned into an invoice in one click." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th><Th>Customer</Th><Th>Vehicle</Th><Th>Job</Th><Th>Issued</Th><Th>Due</Th>
                <Th align="right">Total</Th><Th align="right">Paid</Th><Th align="right">Due</Th><Th>Status</Th><Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const c = shop.getCustomer(inv.customerId)!
                const v = shop.getVehicle(inv.vehicleId)!
                const job = shop.getJob(inv.jobId)
                const t = invoiceTotals(inv)
                const due = invoiceDue(inv)
                const late = inv.status === 'overdue'
                return (
                  <Tr key={inv.id} onClick={() => nav(`/app/invoices/${inv.id}`)}>
                    <Td mono>{inv.number}</Td>
                    <Td>
                      <div className="truncate text-sm">{c.name}</div>
                      {inv.poRef && <div className="font-mono text-2xs text-ink-4">PO {inv.poRef}</div>}
                    </Td>
                    <Td>
                      <div className="text-sm">{v.make} {v.model}</div>
                      <div className="mt-0.5"><Reg value={v.reg} /></div>
                    </Td>
                    <Td mono>{job?.number ?? '—'}</Td>
                    <Td><span className="text-xs text-ink-3">{dateShort(inv.issuedAt)}</span></Td>
                    <Td><span className={cx('text-xs', late ? 'text-bad font-medium' : 'text-ink-3')}>{relative(inv.dueAt)}</span></Td>
                    <Td align="right"><Money value={t.total} className="text-sm" strong /></Td>
                    <Td align="right"><Money value={invoicePaid(inv)} className="text-sm" muted /></Td>
                    <Td align="right"><span className={cx('num text-sm', due > 0 && 'font-medium', late && 'text-bad')}>{due > 0 ? eur0(due) : '—'}</span></Td>
                    <Td><InvoiceStatusBadge status={inv.status} /></Td>
                    <Td align="right">
                      {due > 0 && shop.can('payments.process') && (
                        <Button size="xs" variant="primary"
                          onClick={(e) => { e.stopPropagation(); shop.dispatch({ t: 'recordPayment', invoiceId: inv.id, amount: due, method: 'card' }); shop.toast({ title: 'Payment recorded', body: `${inv.number} marked paid`, tone: 'ok' }) }}>
                          Mark paid
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
    </div>
  )
}
