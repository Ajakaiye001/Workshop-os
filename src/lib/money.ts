import type { Invoice, Job, Part, PurchaseOrder } from '../data/types'

export const VAT_RATE = 0.23
const r2 = (n: number) => Math.round(n * 100) / 100

export interface Totals {
  parts: number
  labour: number
  fees: number
  subtotal: number
  discount: number
  net: number
  vat: number
  total: number
}

export function jobTotals(job: Job, opts: { partPrice: (partId: string) => number; diagnosticFee?: number }): Totals {
  const parts = r2(job.parts.reduce((t, p) => t + p.qty * (p.unitPrice || opts.partPrice(p.partId)), 0))
  const labour = r2(job.labour.reduce((t, l) => t + l.hours * l.rate, 0))
  const fees = r2((job.repairs.length ? (opts.diagnosticFee ?? 0) : 0) + (job.parts.length || job.labour.length ? 12.5 : 0))
  const subtotal = r2(parts + labour + fees)
  const discount = r2(job.discount ?? 0)
  const net = r2(subtotal - discount)
  const vat = r2(net * VAT_RATE)
  return { parts, labour, fees, subtotal, discount, net, vat, total: r2(net + vat) }
}

export function invoiceTotals(inv: Invoice): Totals {
  const parts = r2(inv.lines.filter((l) => l.kind === 'part').reduce((t, l) => t + l.qty * l.unitPrice, 0))
  const labour = r2(inv.lines.filter((l) => l.kind === 'labour').reduce((t, l) => t + l.qty * l.unitPrice, 0))
  const fees = r2(inv.lines.filter((l) => l.kind === 'fee').reduce((t, l) => t + l.qty * l.unitPrice, 0))
  const subtotal = r2(parts + labour + fees)
  const discount = r2(inv.discount)
  const net = r2(subtotal - discount)
  const vat = r2(inv.lines.reduce((t, l) => t + l.qty * l.unitPrice * l.vatRate, 0) - discount * VAT_RATE)
  return { parts, labour, fees, subtotal, discount, net, vat, total: r2(net + vat) }
}

export const invoicePaid = (inv: Invoice) => r2(inv.payments.reduce((t, p) => t + p.amount, 0))
export const invoiceDue = (inv: Invoice) => r2(invoiceTotals(inv).total - invoicePaid(inv))

export function poTotals(po: PurchaseOrder, partCost: (id: string) => number) {
  const goods = r2(po.lines.reduce((t, l) => t + l.qty * (l.unitCost || partCost(l.partId)), 0))
  const net = r2(goods + po.shipping)
  const vat = r2(net * VAT_RATE)
  return { goods, shipping: po.shipping, net, vat, total: r2(net + vat) }
}

export function stockStatus(p: Part): 'in-stock' | 'low' | 'out' | 'ordered' {
  const free = p.qty - p.reserved
  if (free <= 0) return p.onOrder > 0 ? 'ordered' : 'out'
  if (free <= p.reorderAt) return 'low'
  return 'in-stock'
}

export const inventoryValue = (parts: Part[]) => r2(parts.reduce((t, p) => t + p.qty * p.cost, 0))
export const margin = (price: number, cost: number) => (price === 0 ? 0 : (price - cost) / price)
