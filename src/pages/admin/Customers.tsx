import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { Avatar, Badge, Button, EmptyState, PageHeader, Panel, SearchInput, Segmented, Table, Td, Th, Tr } from '../../components/ui'
import { Money } from '../../components/Bits'
import { AddCustomerModal } from '../../features/NewRecords'
import { dateMed, eur0 } from '../../lib/format'
import { invoiceDue, invoiceTotals } from '../../lib/money'

export default function Customers() {
  const shop = useShop()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'private' | 'fleet' | 'owing'>('all')
  const [addOpen, setAddOpen] = useState(false)

  const stats = useMemo(() => {
    const map = new Map<string, { spend: number; owing: number; jobs: number; vehicles: number; last?: string }>()
    shop.customers.forEach((c) => map.set(c.id, { spend: 0, owing: 0, jobs: 0, vehicles: 0 }))
    shop.vehicles.forEach((v) => { const e = map.get(v.customerId); if (e) e.vehicles++ })
    shop.jobs.forEach((j) => {
      const e = map.get(j.customerId)
      if (!e) return
      e.jobs++
      if (!e.last || j.bookedFor > e.last) e.last = j.bookedFor
    })
    shop.invoices.forEach((i) => {
      const e = map.get(i.customerId)
      if (!e) return
      e.spend += invoiceTotals(i).total
      e.owing += invoiceDue(i)
    })
    return map
  }, [shop])

  const rows = useMemo(() => {
    let list = shop.customers
    if (type === 'private') list = list.filter((c) => c.type === 'private')
    if (type === 'fleet') list = list.filter((c) => c.type === 'fleet')
    if (type === 'owing') list = list.filter((c) => (stats.get(c.id)?.owing ?? 0) > 0.5)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((c) => `${c.name} ${c.company ?? ''} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(t))
    }
    return [...list].sort((a, b) => (stats.get(b.id)?.spend ?? 0) - (stats.get(a.id)?.spend ?? 0))
  }, [shop.customers, type, q, stats])

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Customers" sub={`${shop.customers.length} accounts · ${shop.customers.filter((c) => c.type === 'fleet').length} on trade terms`}>
        {shop.can('customers.edit') && <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add customer</Button>}
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'All', count: shop.customers.length },
            { value: 'private', label: 'Private', count: shop.customers.filter((c) => c.type === 'private').length },
            { value: 'fleet', label: 'Fleet', count: shop.customers.filter((c) => c.type === 'fleet').length },
            { value: 'owing', label: 'Owing', count: shop.customers.filter((c) => (stats.get(c.id)?.owing ?? 0) > 0.5).length },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone or email" className="ml-auto w-[250px]" />
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? <EmptyState icon="users" title="No customers match" /> : (
          <Table>
            <thead>
              <tr><Th>Customer</Th><Th>Contact</Th><Th>Location</Th><Th align="right">Vehicles</Th><Th align="right">Jobs</Th><Th>Last visit</Th>
                {shop.can('finance.view') && <><Th align="right">Lifetime spend</Th><Th align="right">Owing</Th></>}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const st = stats.get(c.id)!
                return (
                  <Tr key={c.id} onClick={() => nav(`/app/customers/${c.id}`)}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={28} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{c.name}</span>
                            {c.type === 'fleet' && <Badge tone="purple">Fleet</Badge>}
                          </div>
                          {c.company && <div className="truncate text-2xs text-ink-4">{c.company}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-ink-2">{c.phone}</div>
                      <div className="truncate text-2xs text-ink-4">{c.email}</div>
                    </Td>
                    <Td><span className="text-xs text-ink-3">{c.city}</span></Td>
                    <Td align="right"><span className="num text-sm">{st.vehicles}</span></Td>
                    <Td align="right"><span className="num text-sm">{st.jobs}</span></Td>
                    <Td><span className="text-xs text-ink-3">{st.last ? dateMed(st.last) : '—'}</span></Td>
                    {shop.can('finance.view') && (
                      <>
                        <Td align="right"><Money value={st.spend} className="text-sm" strong /></Td>
                        <Td align="right">
                          <span className={`num text-sm ${st.owing > 0.5 ? 'text-bad font-medium' : 'text-ink-4'}`}>
                            {st.owing > 0.5 ? eur0(st.owing) : '—'}
                          </span>
                        </Td>
                      </>
                    )}
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>
      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
