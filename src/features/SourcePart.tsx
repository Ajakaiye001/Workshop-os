import { useMemo, useState } from 'react'

import { useShop } from '../data/store'
import type { Part } from '../data/types'
import { Badge, Button, Callout, Checkbox, cx, Field, Input, Modal, SectionLabel } from '../components/ui'
import { eur, plural } from '../lib/format'

/* ============================================================
   Parts intelligence: compare live supplier offers for a part
   and turn the choice into a purchase order in one step.
   ============================================================ */

export function SourcePartModal({ part, jobId, qty = 1, open, onClose }: {
  part?: Part; jobId?: string; qty?: number; open: boolean; onClose: () => void
}) {
  const shop = useShop()
  const [supplierId, setSupplierId] = useState<string>('')
  const [orderQty, setOrderQty] = useState(qty)
  const [note, setNote] = useState('')
  const [submit, setSubmit] = useState(true)

  const offers = useMemo(() => {
    if (!part) return []
    return [...part.offers]
      .map((o) => ({ ...o, supplier: shop.getSupplier(o.supplierId)! }))
      .sort((a, b) => a.price - b.price)
  }, [part, shop])

  const chosen = offers.find((o) => o.supplierId === supplierId) ?? offers[0]
  const canApprove = shop.can('po.approve')

  if (!part) return null

  const free = part.qty - part.reserved
  const shipping = chosen?.supplier.leadTimeDays === 1 ? 12 : 9.5
  const goods = (chosen?.price ?? 0) * orderQty
  const total = goods + shipping

  function create() {
    if (!chosen) return
    shop.dispatch({
      t: 'createPO',
      supplierId: chosen.supplierId,
      lines: [{ partId: part!.id, qty: orderQty, unitCost: chosen.price, jobId }],
      shipping,
      note: note || undefined,
      submit: submit && !canApprove ? true : submit,
    })
    shop.toast({
      title: submit ? 'Purchase request raised' : 'Draft purchase order saved',
      body: `${chosen.supplier.name} · ${plural(orderQty, 'unit')} · ${eur(total)}`,
      tone: 'ok',
      action: { label: 'Open purchasing', to: '/app/purchasing' },
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title="Source part"
      sub={`${part.name} · ${part.brand} · ${part.partNumber}`}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" icon="truck" disabled={!chosen} onClick={create}>
            {submit ? (canApprove ? 'Create and approve' : 'Send for approval') : 'Save draft'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-line bg-surface px-3.5 py-3">
          <div>
            <div className="text-2xs text-ink-4">In stock</div>
            <div className={cx('num text-lg font-semibold', free <= 0 && 'text-bad')}>{free}</div>
          </div>
          <div>
            <div className="text-2xs text-ink-4">Reserved</div>
            <div className="num text-lg font-semibold">{part.reserved}</div>
          </div>
          <div>
            <div className="text-2xs text-ink-4">On order</div>
            <div className="num text-lg font-semibold">{part.onOrder}</div>
          </div>
          <div>
            <div className="text-2xs text-ink-4">Reorder at</div>
            <div className="num text-lg font-semibold text-ink-3">{part.reorderAt}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xs text-ink-4">Retail price</div>
            <div className="num text-lg font-semibold">{eur(part.price)}</div>
          </div>
        </div>

        {free < orderQty && (
          <Callout tone="warn" title={`Not enough stock for this job`}>
            {free <= 0 ? 'Nothing available' : `${free} available`}, {orderQty} needed. Pick a supplier below — the work order will
            move to <span className="font-medium">Awaiting parts</span> and update itself when goods are booked in.
          </Callout>
        )}

        <div>
          <SectionLabel className="mb-2">Supplier offers</SectionLabel>
          <ul className="space-y-2">
            {offers.map((o, i) => {
              const active = chosen?.supplierId === o.supplierId
              const cheapest = i === 0
              const fastest = o.etaDays === Math.min(...offers.map((x) => x.etaDays))
              return (
                <li key={o.supplierId}>
                  <button
                    onClick={() => setSupplierId(o.supplierId)}
                    className={cx('flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all duration-150',
                      active ? 'border-[color:var(--hv)] bg-hv-dim shadow-xs' : 'border-line bg-raised hover:border-line-strong')}
                  >
                    <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                      active ? 'border-hv bg-hv' : 'border-line-strong')}>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-hv-ink" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{o.supplier.name}</span>
                        {cheapest && <Badge tone="ok">Best price</Badge>}
                        {fastest && !cheapest && <Badge tone="info">Fastest</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-2xs text-ink-4">
                        {o.supplier.county} · account {o.supplier.account} · {o.supplier.terms}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-sm font-semibold">{eur(o.price)}</span>
                      <span className="block text-2xs text-ink-4">trade, ex VAT</span>
                    </span>
                    <span className="w-[92px] shrink-0 text-right">
                      <span className="block text-xs">{o.etaDays === 1 ? 'Tomorrow' : `${o.etaDays} days`}</span>
                      <span className={cx('block text-2xs', o.stock >= orderQty ? 'text-ok' : 'text-ink-4')}>
                        {o.stock >= orderQty ? `${o.stock} at depot` : 'to order'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Quantity">
            <Input type="number" min={1} value={orderQty} onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label="Note to supplier" hint="Appears on the purchase order">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. customer waiting, next-day delivery please" />
          </Field>
        </div>

        <div className="rounded-md border border-line bg-surface px-3.5 py-3">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">{orderQty} × {part.name}</dt><dd className="num">{eur(goods)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Delivery</dt><dd className="num">{eur(shipping)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Order total, ex VAT</dt><dd className="num">{eur(total)}</dd></div>
            <div className="flex justify-between text-2xs text-ink-4">
              <dt>Sells at {eur(part.price)} each</dt>
              <dd>margin {Math.round(((part.price - (chosen?.price ?? 0)) / part.price) * 100)}%</dd>
            </div>
          </dl>
        </div>

        <Checkbox
          checked={submit}
          onChange={setSubmit}
          label={canApprove ? 'Approve immediately and send to supplier' : 'Send to a manager for approval'}
          hint={canApprove ? 'Your role can authorise this spend.' : 'Parts Managers and Owners can approve purchase orders.'}
        />
      </div>
    </Modal>
  )
}

/* ---------------- inline supplier comparison strip ---------------- */

export function SupplierCompare({ part }: { part: Part }) {
  const shop = useShop()
  const offers = [...part.offers].sort((a, b) => a.price - b.price)
  const best = offers[0]
  return (
    <ul className="divide-y divide-[color:var(--line)]">
      {offers.map((o) => {
        const s = shop.getSupplier(o.supplierId)!
        return (
          <li key={o.supplierId} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{s.name}</span>
              <span className="block truncate text-2xs text-ink-4">{s.county} · {o.stock > 0 ? `${o.stock} at depot` : 'to order'}</span>
            </span>
            <span className="num shrink-0 text-sm font-medium">{eur(o.price)}</span>
            <span className="w-20 shrink-0 text-right text-xs text-ink-3">{o.etaDays === 1 ? 'Tomorrow' : `${o.etaDays} days`}</span>
            {o.supplierId === best.supplierId && <Badge tone="ok">Best</Badge>}
          </li>
        )
      })}
    </ul>
  )
}
