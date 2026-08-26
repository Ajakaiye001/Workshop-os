import { useMemo, useState } from 'react'
import { useShop } from '../../data/store'
import { Metric, MetricStrip, PageHeader, Panel, Segmented, Table, Td, Th, Tr, Meter, Button } from '../../components/ui'
import { AreaChart, BarChart, Donut, RankedBars } from '../../components/charts'
import { Money } from '../../components/Bits'
import { eur0, num, pct } from '../../lib/format'
import { invoiceDue, invoiceTotals, poTotals } from '../../lib/money'

export default function Reports() {
  const shop = useShop()
  const [range, setRange] = useState<'30' | '90' | '365'>('90')

  const data = useMemo(() => {
    const totals = shop.invoices.map(invoiceTotals)
    const revenue = totals.reduce((t, x) => t + x.total, 0)
    const partsRev = totals.reduce((t, x) => t + x.parts, 0)
    const labourRev = totals.reduce((t, x) => t + x.labour, 0)
    const feesRev = totals.reduce((t, x) => t + x.fees, 0)
    const completed = shop.jobs.filter((j) => j.status === 'completed').length
    const avg = shop.invoices.length ? revenue / shop.invoices.length : 0
    const outstanding = shop.invoices.reduce((t, i) => t + invoiceDue(i), 0)
    // parts margin from what we actually sold, not from purchasing volume
    let soldAtCost = 0, soldAtPrice = 0
    shop.jobs.forEach((j) => j.parts.forEach((jp) => {
      const pt = shop.getPart(jp.partId)
      if (!pt) return
      soldAtCost += pt.cost * jp.qty
      soldAtPrice += jp.unitPrice * jp.qty
    }))
    const partsMargin = soldAtPrice ? 1 - soldAtCost / soldAtPrice : 0

    const partsSpend = shop.purchaseOrders
      .filter((p) => p.status === 'received')
      .reduce((t, p) => t + poTotals(p, (id) => shop.getPart(id)?.cost ?? 0).net, 0)

    const scale = range === '30' ? 0.34 : range === '365' ? 3.6 : 1
    const weeks = range === '30' ? 4 : range === '90' ? 12 : 12
    const label = (i: number) => (range === '365' ? ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i] : `W${i + 1}`)

    const trend = Array.from({ length: weeks }, (_, i) => ({
      label: label(i),
      value: Math.round((revenue * scale / weeks) * (0.78 + ((i * 13) % 9) / 20)),
    }))

    const partsLabour = Array.from({ length: weeks }, (_, i) => ({
      label: label(i),
      value: Math.round((labourRev * scale / weeks) * (0.8 + ((i * 7) % 8) / 20)),
      secondary: Math.round((partsRev * scale / weeks) * (0.8 + ((i * 11) % 8) / 20)),
    }))

    const techs = shop.staff.filter((s) => s.roleId === 'technician').map((s) => ({
      staff: s,
      prod: s.stats.availableHours ? s.stats.billedHours / s.stats.availableHours : 0,
      jobs: shop.jobs.filter((j) => j.technicianId === s.id).length,
    })).sort((a, b) => b.prod - a.prod)

    const topParts = [...shop.parts].sort((a, b) => b.usage90d - a.usage90d).slice(0, 8)
    const supplierSpend = [...shop.suppliers].sort((a, b) => b.ytdSpend - a.ytdSpend).slice(0, 6)

    const byService = new Map<string, number>()
    shop.jobs.forEach((j) => byService.set(j.serviceType, (byService.get(j.serviceType) ?? 0) + 1))

    return { partsMargin, revenue: revenue * scale, partsRev: partsRev * scale, labourRev: labourRev * scale, feesRev: feesRev * scale, completed, avg, outstanding, partsSpend: partsSpend * scale, trend, partsLabour, techs, topParts, supplierSpend, byService }
  }, [shop, range])

  const utilisation = shop.bays.filter((b) => b.status === 'occupied').length / shop.bays.filter((b) => b.status !== 'blocked').length

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader title="Reports" sub="Where the money and the hours actually go">
        <Segmented value={range} onChange={setRange} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: '12 months' }]} />
        <Button icon="download">Export CSV</Button>
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Revenue" value={eur0(data.revenue)} delta={{ v: '11%', up: true }} hint="incl. VAT" />
        <Metric label="Labour revenue" value={eur0(data.labourRev)} delta={{ v: '8%', up: true }} />
        <Metric label="Parts revenue" value={eur0(data.partsRev)} delta={{ v: '14%', up: true }} />
        <Metric label="Average job value" value={eur0(data.avg)} delta={{ v: '3%', up: true }} />
        <Metric label="Jobs completed" value={data.completed} hint={`${num(shop.jobs.length)} total`} />
        <Metric label="Outstanding" value={eur0(data.outstanding)} tone={data.outstanding > 0 ? 'warn' : 'ok'} />
      </MetricStrip>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Revenue" subtitle="Invoiced, including VAT" className="lg:col-span-2" bodyClass="p-4">
          <AreaChart data={data.trend} format={(n) => eur0(n)} />
        </Panel>

        <Panel title="Revenue mix" bodyClass="p-4">
          <Donut
            data={[
              { label: 'Labour', value: data.labourRev },
              { label: 'Parts', value: data.partsRev },
              { label: 'Diagnostics & fees', value: data.feesRev },
            ]}
            centre={{ value: eur0(data.revenue), label: 'total' }}
          />
          <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
            <div className="flex justify-between"><span className="text-ink-3">Parts margin</span><span className="num font-medium">{pct(data.partsMargin, 0)}</span></div>
            <div className="flex justify-between"><span className="text-ink-3">Parts spend</span><span className="num font-medium">{eur0(data.partsSpend)}</span></div>
          </div>
        </Panel>

        <Panel title="Labour against parts" subtitle="Weekly split" className="lg:col-span-2" bodyClass="p-4">
          <BarChart data={data.partsLabour} format={(n) => eur0(n)} stackLabels={['Labour', 'Parts']} height={186} />
        </Panel>

        <Panel title="Workshop utilisation" bodyClass="p-4">
          <div className="num text-4xl font-semibold tracking-[-0.03em]">{Math.round(utilisation * 100)}%</div>
          <p className="mt-1 text-xs text-ink-3">of usable bays working right now</p>
          <Meter className="mt-3" value={utilisation} tone={utilisation > 0.8 ? 'ok' : 'warn'} height={6} />
          <ul className="mt-4 space-y-2 border-t border-line pt-3">
            {shop.bays.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-2xs text-ink-4">{b.name}</span>
                <span className="flex-1 truncate text-ink-3">{b.jobId ? shop.vehicleLabel(shop.getJob(b.jobId)?.vehicleId) : b.status === 'blocked' ? 'Blocked' : 'Free'}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${b.status === 'occupied' ? 'bg-ok' : b.status === 'blocked' ? 'bg-bad' : 'bg-line-strong'}`} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Technician productivity" subtitle="Billed hours against available, 30 days" className="lg:col-span-2" bodyClass="p-0">
          <Table>
            <thead><tr><Th>Technician</Th><Th align="right">Jobs</Th><Th align="right">Billed</Th><Th align="right">Available</Th><Th align="right">Avg job</Th><Th align="right">Rework</Th><Th>Productivity</Th></tr></thead>
            <tbody>
              {data.techs.map(({ staff, prod, jobs }) => (
                <Tr key={staff.id}>
                  <Td><span className="text-sm">{staff.name}</span></Td>
                  <Td align="right"><span className="num text-sm">{jobs}</span></Td>
                  <Td align="right"><span className="num text-sm">{staff.stats.billedHours} h</span></Td>
                  <Td align="right"><span className="num text-sm text-ink-3">{staff.stats.availableHours} h</span></Td>
                  <Td align="right"><span className="num text-sm text-ink-3">{staff.stats.avgJobHours} h</span></Td>
                  <Td align="right"><span className={`num text-sm ${staff.stats.reworkRate > 2 ? 'text-bad' : 'text-ink-3'}`}>{staff.stats.reworkRate}%</span></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Meter value={prod} className="w-20" tone={prod > 0.85 ? 'ok' : prod > 0.65 ? 'hv' : 'warn'} />
                      <span className="num w-9 text-right text-xs">{pct(prod)}</span>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <div className="space-y-5">
          <Panel title="Most used parts" subtitle="Units, 90 days" bodyClass="p-4">
            <RankedBars data={data.topParts.map((p) => ({ label: p.name, value: p.usage90d }))} format={(n) => `${n}`} />
          </Panel>
        </div>

        <Panel title="Supplier spend" subtitle="Year to date" bodyClass="p-4">
          <RankedBars data={data.supplierSpend.map((s) => ({ label: s.name, value: s.ytdSpend }))} format={(n) => eur0(n)} tone="oklch(0.62 0.13 250)" />
        </Panel>

        <Panel title="Work mix" subtitle="Jobs by service type" bodyClass="p-4">
          <Donut
            data={[...data.byService.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))}
            centre={{ value: String(shop.jobs.length), label: 'jobs' }}
            size={120}
          />
        </Panel>

        <Panel title="Outstanding invoices" bodyClass="p-0">
          <Table>
            <thead><tr><Th>Invoice</Th><Th>Customer</Th><Th align="right">Due</Th></tr></thead>
            <tbody>
              {shop.invoices.filter((i) => invoiceDue(i) > 0.5).slice(0, 8).map((i) => (
                <Tr key={i.id}>
                  <Td mono>{i.number}</Td>
                  <Td><span className="truncate text-sm">{shop.getCustomer(i.customerId)?.name}</span></Td>
                  <Td align="right"><Money value={invoiceDue(i)} className="text-sm" strong /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  )
}
