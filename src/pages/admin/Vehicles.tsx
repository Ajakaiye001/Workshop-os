import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { EmptyState, PageHeader, Panel, SearchInput, Segmented, Select, Table, Td, Th, Tr } from '../../components/ui'
import { Reg, StatusBadge } from '../../components/Bits'
import { num, relative } from '../../lib/format'

export default function Vehicles() {
  const shop = useShop()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [make, setMake] = useState('')
  const [view, setView] = useState<'all' | 'in' | 'nct'>('all')

  const makes = useMemo(() => [...new Set(shop.vehicles.map((v) => v.make))].sort(), [shop.vehicles])
  const inWorkshop = useMemo(() => new Set(shop.jobs.filter((j) => j.status !== 'completed').map((j) => j.vehicleId)), [shop.jobs])
  const nctSoon = (iso: string) => new Date(iso).getTime() - Date.now() < 60 * 86400000

  const rows = useMemo(() => {
    let list = shop.vehicles
    if (view === 'in') list = list.filter((v) => inWorkshop.has(v.id))
    if (view === 'nct') list = list.filter((v) => nctSoon(v.nctDue))
    if (make) list = list.filter((v) => v.make === make)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((v) => `${v.make} ${v.model} ${v.variant} ${v.reg} ${v.vin} ${shop.getCustomer(v.customerId)?.name}`.toLowerCase().includes(t))
    }
    return list
  }, [shop, view, make, q, inWorkshop])

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Vehicles" sub={`${shop.vehicles.length} on file · ${inWorkshop.size} in the workshop`} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: 'All', count: shop.vehicles.length },
            { value: 'in', label: 'In workshop', count: inWorkshop.size },
            { value: 'nct', label: 'NCT within 60 days', count: shop.vehicles.filter((v) => nctSoon(v.nctDue)).length },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Select value={make} onChange={(e) => setMake(e.target.value)} className="w-[150px]">
            <option value="">All makes</option>
            {makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Reg, VIN, make or owner" className="w-[240px]" />
        </div>
      </div>

      <Panel bodyClass="p-0">
        {rows.length === 0 ? <EmptyState icon="car" title="No vehicles match" /> : (
          <Table>
            <thead>
              <tr><Th>Vehicle</Th><Th>Registration</Th><Th>VIN</Th><Th>Owner</Th><Th>Powertrain</Th><Th align="right">Mileage</Th><Th>NCT</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const job = shop.jobs.find((j) => j.vehicleId === v.id && j.status !== 'completed')
                return (
                  <Tr key={v.id} onClick={() => nav(`/app/vehicles/${v.id}`)}>
                    <Td>
                      <div className="min-w-[160px]">
                        <div className="truncate text-sm font-medium">{v.year} {v.make} {v.model}</div>
                        <div className="truncate text-2xs text-ink-4">{v.variant} · {v.colour}</div>
                      </div>
                    </Td>
                    <Td><Reg value={v.reg} /></Td>
                    <Td mono>{v.vin}</Td>
                    <Td><span className="truncate text-sm">{shop.getCustomer(v.customerId)?.name}</span></Td>
                    <Td><span className="text-xs text-ink-3">{v.fuel} · {v.transmission}</span></Td>
                    <Td align="right"><span className="num text-sm">{num(v.mileage)} km</span></Td>
                    <Td>
                      <span className={`text-xs ${new Date(v.nctDue) < new Date() ? 'text-bad font-medium' : nctSoon(v.nctDue) ? 'text-warn' : 'text-ink-3'}`}>
                        {relative(v.nctDue)}
                      </span>
                    </Td>
                    <Td>{job ? <StatusBadge status={job.status} /> : <span className="text-2xs text-ink-4">Not in workshop</span>}</Td>
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
