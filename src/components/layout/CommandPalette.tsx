import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { cx, Icon, Kbd, type IconName } from '../ui'
import { eur } from '../../lib/format'

interface Hit { id: string; group: string; icon: IconName; title: string; sub: string; to: string; meta?: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shop = useShop()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 20) } }, [open])

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase()
    const out: Hit[] = []
    const push = (h: Hit) => { if (out.length < 40) out.push(h) }

    if (!t) {
      const quick: Hit[] = [
        { id: 'q1', group: 'Go to', icon: 'gauge', title: 'Overview', sub: 'Workshop state right now', to: '/app' },
        { id: 'q2', group: 'Go to', icon: 'clipboard', title: 'Jobs', sub: 'The job board', to: '/app/jobs' },
        { id: 'q3', group: 'Go to', icon: 'box', title: 'Inventory', sub: 'Parts and stock', to: '/app/parts' },
        { id: 'q4', group: 'Go to', icon: 'truck', title: 'Purchasing', sub: 'Purchase orders and suppliers', to: '/app/purchasing' },
        { id: 'q5', group: 'Go to', icon: 'grid', title: 'Bays', sub: 'Workshop floor', to: '/app/bays' },
        { id: 'q6', group: 'Go to', icon: 'chart', title: 'Reports', sub: 'Analytics', to: '/app/reports' },
        { id: 'q7', group: 'Switch', icon: 'wrench', title: 'Technician app', sub: 'The floor experience', to: '/tech' },
        { id: 'q8', group: 'Switch', icon: 'users', title: 'Customer portal', sub: 'What the customer sees', to: '/portal/job-32' },
      ]
      return quick
    }

    shop.jobs.forEach((j) => {
      const v = shop.getVehicle(j.vehicleId)
      const c = shop.getCustomer(j.customerId)
      const hay = `${j.number} ${v?.make} ${v?.model} ${v?.reg} ${c?.name} ${j.serviceType}`.toLowerCase()
      if (hay.includes(t)) push({ id: j.id, group: 'Jobs', icon: 'clipboard', title: `${j.number} · ${v?.make} ${v?.model}`, sub: `${c?.name} · ${j.serviceType}`, to: `/app/jobs/${j.id}`, meta: v?.reg })
    })
    shop.customers.forEach((c) => {
      if (`${c.name} ${c.company ?? ''} ${c.phone} ${c.email}`.toLowerCase().includes(t))
        push({ id: c.id, group: 'Customers', icon: 'users', title: c.name, sub: `${c.city} · ${c.phone}`, to: `/app/customers/${c.id}` })
    })
    shop.vehicles.forEach((v) => {
      if (`${v.make} ${v.model} ${v.reg} ${v.vin}`.toLowerCase().includes(t))
        push({ id: v.id, group: 'Vehicles', icon: 'car', title: `${v.year} ${v.make} ${v.model}`, sub: v.variant, to: `/app/vehicles/${v.id}`, meta: v.reg })
    })
    shop.parts.forEach((p) => {
      if (`${p.name} ${p.partNumber} ${p.brand} ${p.category}`.toLowerCase().includes(t))
        push({ id: p.id, group: 'Parts', icon: 'box', title: p.name, sub: `${p.brand} · ${p.partNumber}`, to: `/app/parts/${p.id}`, meta: `${p.qty} in stock` })
    })
    shop.invoices.forEach((i) => {
      if (i.number.toLowerCase().includes(t))
        push({ id: i.id, group: 'Invoices', icon: 'receipt', title: i.number, sub: shop.getCustomer(i.customerId)?.name ?? '', to: `/app/invoices/${i.id}` })
    })
    shop.purchaseOrders.forEach((p) => {
      if (`${p.number} ${shop.getSupplier(p.supplierId)?.name}`.toLowerCase().includes(t))
        push({ id: p.id, group: 'Purchasing', icon: 'truck', title: p.number, sub: shop.getSupplier(p.supplierId)?.name ?? '', to: `/app/purchasing/${p.id}` })
    })
    shop.staff.forEach((s) => {
      if (s.name.toLowerCase().includes(t))
        push({ id: s.id, group: 'Staff', icon: 'users', title: s.name, sub: shop.roles.find((r) => r.id === s.roleId)?.name ?? '', to: `/app/staff/${s.id}` })
    })
    return out
  }, [q, shop])

  useEffect(() => { setSel(0) }, [q])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && hits[sel]) { nav(hits[sel].to); onClose() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, hits, sel, nav, onClose])

  if (!open) return null

  let lastGroup = ''
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4">
      <div className="fixed inset-0 bg-[oklch(0.2_0.02_260/0.45)] animate-fade-in" onClick={onClose} />
      <div className="relative mt-[10vh] w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-raised shadow-lg animate-slide-up">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={16} className="text-ink-4 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs, vehicles, customers, parts, invoices…"
            className="h-12 flex-1 bg-transparent text-md outline-none placeholder:text-ink-4"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[54vh] overflow-y-auto py-1.5">
          {hits.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-ink-3">
              Nothing matches <span className="font-medium text-ink">{q}</span>
            </div>
          )}
          {hits.map((h, i) => {
            const showGroup = h.group !== lastGroup
            lastGroup = h.group
            return (
              <div key={h.id + i}>
                {showGroup && <div className="px-4 pb-1 pt-2.5 text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">{h.group}</div>}
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => { nav(h.to); onClose() }}
                  className={cx('flex w-full items-center gap-3 px-4 py-2 text-left transition-colors', i === sel ? 'bg-sunken' : '')}
                >
                  <Icon name={h.icon} size={15} className="shrink-0 text-ink-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{h.title}</span>
                    <span className="block truncate text-2xs text-ink-4">{h.sub}</span>
                  </span>
                  {h.meta && <span className="shrink-0 font-mono text-2xs text-ink-4">{h.meta}</span>}
                  {i === sel && <Icon name="arrowRight" size={13} className="shrink-0 text-ink-3" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-surface px-4 py-2 text-2xs text-ink-4">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto num">{shop.jobs.length} jobs · {shop.parts.length} parts · {eur(shop.parts.reduce((t, p) => t + p.qty * p.cost, 0), { cents: false })} stock</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
