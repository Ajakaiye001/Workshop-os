import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { Payment } from '../../data/types'
import { Badge, Button, EmptyState, Field, Input, KV, Modal, Panel, Select, Table, Td, Th, Tr, cx } from '../../components/ui'
import { BackLink, InvoiceStatusBadge, Money, Reg } from '../../components/Bits'
import { Mark } from '../../components/layout/Wordmark'
import { dateMed, dateTime, eur, relative } from '../../lib/format'
import { invoiceDue, invoicePaid, invoiceTotals } from '../../lib/money'

export default function InvoiceDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [payOpen, setPayOpen] = useState(false)
  const inv = shop.getInvoice(id)

  if (!inv) return <EmptyState icon="receipt" title="Invoice not found" action={<Button onClick={() => nav('/app/invoices')}>Back to invoices</Button>} />

  const c = shop.getCustomer(inv.customerId)!
  const v = shop.getVehicle(inv.vehicleId)!
  const job = shop.getJob(inv.jobId)
  const t = invoiceTotals(inv)
  const due = invoiceDue(inv)
  const s = shop.settings

  return (
    <div className="mx-auto max-w-[1100px]">
      <BackLink to="/app/invoices">Invoices</BackLink>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.02em]">{inv.number}</h1>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="mt-1 text-sm text-ink-3">
            Issued {dateMed(inv.issuedAt)} · due {relative(inv.dueAt)}
            {job && <> · from <Link to={`/app/jobs/${job.id}`} className="font-mono hover:underline">{job.number}</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.status === 'draft' && shop.can('invoices.edit') && (
            <Button variant="primary" icon="send" onClick={() => { shop.dispatch({ t: 'invoiceStatus', invoiceId: inv.id, status: 'sent' }); shop.toast({ title: 'Invoice sent', body: `${c.email}`, tone: 'ok' }) }}>Send to customer</Button>
          )}
          {due > 0 && shop.can('payments.process') && (
            <Button variant={inv.status === 'draft' ? 'secondary' : 'primary'} icon="euro" onClick={() => setPayOpen(true)}>Record payment</Button>
          )}
          <Button icon="download">Download PDF</Button>
          <Button icon="print">Print</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* ---------- the document ---------- */}
        <article className="rounded-lg border border-line bg-raised shadow-xs">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line p-6">
            <div>
              <Mark size={30} />
              <div className="mt-3 text-md font-semibold">{s.legalName}</div>
              <address className="mt-1 max-w-[34ch] whitespace-pre-line text-2xs not-italic leading-relaxed text-ink-3">
                {s.address}
              </address>
              <div className="mt-1.5 space-y-0.5 text-2xs text-ink-3">
                <div>{s.phone} · {s.email}</div>
                <div>VAT {s.vatNumber}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xs uppercase tracking-[0.12em] text-ink-4">Invoice</div>
              <div className="mt-0.5 font-mono text-xl font-semibold">{inv.number}</div>
              <dl className="mt-3 space-y-1 text-2xs">
                <div className="flex justify-end gap-4"><dt className="text-ink-4">Issued</dt><dd className="num w-24 text-right">{dateMed(inv.issuedAt)}</dd></div>
                <div className="flex justify-end gap-4"><dt className="text-ink-4">Due</dt><dd className="num w-24 text-right">{dateMed(inv.dueAt)}</dd></div>
                {job && <div className="flex justify-end gap-4"><dt className="text-ink-4">Job</dt><dd className="num w-24 text-right font-mono">{job.number}</dd></div>}
                {inv.poRef && <div className="flex justify-end gap-4"><dt className="text-ink-4">Your PO</dt><dd className="num w-24 text-right font-mono">{inv.poRef}</dd></div>}
              </dl>
            </div>
          </header>

          <div className="grid gap-6 border-b border-line p-6 sm:grid-cols-2">
            <div>
              <div className="text-2xs uppercase tracking-[0.1em] text-ink-4">Billed to</div>
              <div className="mt-1.5 text-sm font-medium">{c.company ?? c.name}</div>
              <address className="mt-0.5 text-2xs not-italic leading-relaxed text-ink-3">
                {c.company && <>{c.name}<br /></>}
                {c.address}<br />{c.city}<br />{c.eircode}
              </address>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-[0.1em] text-ink-4">Vehicle</div>
              <div className="mt-1.5 text-sm font-medium">{v.year} {v.make} {v.model} {v.variant}</div>
              <div className="mt-1 flex items-center gap-2">
                <Reg value={v.reg} size="md" />
                <span className="font-mono text-2xs text-ink-4">{v.vin}</span>
              </div>
              <div className="mt-1 text-2xs text-ink-3">Odometer {v.mileage.toLocaleString('en-IE')} km</div>
            </div>
          </div>

          <Table>
            <thead>
              <tr><Th>Description</Th><Th>Detail</Th><Th align="right">Qty</Th><Th align="right">Unit</Th><Th align="right">VAT</Th><Th align="right">Amount</Th></tr>
            </thead>
            <tbody>
              {(['labour', 'part', 'fee'] as const).flatMap((kind) =>
                inv.lines.filter((l) => l.kind === kind).map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <span className="text-sm">{l.description}</span>
                      <Badge tone="neutral" className="ml-2 align-middle">{l.kind === 'part' ? 'Part' : l.kind === 'labour' ? 'Labour' : 'Fee'}</Badge>
                    </Td>
                    <Td><span className="font-mono text-2xs text-ink-4">{l.detail}</span></Td>
                    <Td align="right"><span className="num text-sm">{l.qty}</span></Td>
                    <Td align="right"><Money value={l.unitPrice} className="text-sm" muted /></Td>
                    <Td align="right"><span className="num text-2xs text-ink-4">{Math.round(l.vatRate * 100)}%</span></Td>
                    <Td align="right"><Money value={l.qty * l.unitPrice} className="text-sm" /></Td>
                  </Tr>
                )),
              )}
            </tbody>
          </Table>

          <div className="flex flex-wrap justify-between gap-6 border-t border-line p-6">
            <div className="max-w-[38ch]">
              <div className="text-2xs uppercase tracking-[0.1em] text-ink-4">Payment</div>
              <p className="mt-1.5 text-2xs leading-relaxed text-ink-3">
                Payable within 30 days. Bank transfer to IE29 AIBK 9311 5212 3456 78, reference {inv.number}.
                Card payments taken at reception or through the customer portal.
              </p>
              <p className="mt-2 text-2xs leading-relaxed text-ink-4">
                Goods remain the property of {s.legalName} until paid in full. Parts carry a 12 month warranty, labour 6 months.
              </p>
            </div>
            <dl className="w-full max-w-[270px] space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink-3">Parts</dt><dd className="num">{eur(t.parts)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Labour</dt><dd className="num">{eur(t.labour)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Fees</dt><dd className="num">{eur(t.fees)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1"><dt className="text-ink-3">Subtotal</dt><dd className="num">{eur(t.subtotal)}</dd></div>
              {t.discount > 0 && <div className="flex justify-between text-ok"><dt>Discount</dt><dd className="num">−{eur(t.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5 text-lg font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
              {invoicePaid(inv) > 0 && (
                <>
                  <div className="flex justify-between text-ok"><dt>Paid</dt><dd className="num">−{eur(invoicePaid(inv))}</dd></div>
                  <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Balance due</dt><dd className={cx('num', due > 0 && 'text-bad')}>{eur(due)}</dd></div>
                </>
              )}
            </dl>
          </div>
        </article>

        {/* ---------- rail ---------- */}
        <aside className="space-y-4">
          <Panel title="Status" dense bodyClass="p-3">
            <dl>
              <KV label="Total"><Money value={t.total} strong /></KV>
              <KV label="Paid"><Money value={invoicePaid(inv)} /></KV>
              <KV label="Balance"><span className={cx(due > 0 && 'text-bad font-medium')}>{eur(due)}</span></KV>
              <KV label="Due">{relative(inv.dueAt)}</KV>
            </dl>
            {shop.can('invoices.edit') && (
              <div className="mt-3 border-t border-line pt-3">
                <Field label="Change status">
                  <Select value={inv.status} onChange={(e) => shop.dispatch({ t: 'invoiceStatus', invoiceId: inv.id, status: e.target.value as never })}>
                    {['draft', 'sent', 'part-paid', 'paid', 'overdue', 'void'].map((x) => <option key={x} value={x}>{x}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </Panel>

          <Panel title="Payments" dense bodyClass="p-3">
            {inv.payments.length === 0 ? (
              <p className="text-xs text-ink-4">Nothing received yet.</p>
            ) : (
              <ul className="space-y-2">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium capitalize">{p.method}</span>
                      <span className="block font-mono text-2xs text-ink-4">{p.ref} · {dateTime(p.at)}</span>
                    </span>
                    <Money value={p.amount} className="text-sm" strong />
                  </li>
                ))}
              </ul>
            )}
            {due > 0 && shop.can('payments.process') && (
              <Button size="sm" className="mt-3" full variant="primary" onClick={() => setPayOpen(true)}>Record payment</Button>
            )}
          </Panel>

          <Panel title="Customer" dense bodyClass="p-3"
            actions={<Link to={`/app/customers/${c.id}`} className="text-2xs text-ink-3 hover:text-ink">Profile →</Link>}>
            <div className="text-sm font-medium">{c.name}</div>
            <div className="mt-1 space-y-0.5 text-2xs text-ink-3">
              <div>{c.phone}</div>
              <div className="truncate">{c.email}</div>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Button size="xs" icon="send">Email invoice</Button>
              <Button size="xs" icon="phone">Call</Button>
            </div>
          </Panel>
        </aside>
      </div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} invoiceId={inv.id} due={due} />
    </div>
  )
}

function PaymentModal({ open, onClose, invoiceId, due }: { open: boolean; onClose: () => void; invoiceId: string; due: number }) {
  const shop = useShop()
  const [amount, setAmount] = useState(due.toFixed(2))
  const [method, setMethod] = useState<Payment['method']>('card')
  return (
    <Modal
      open={open} onClose={onClose} width="sm" title="Record payment"
      sub={`Balance outstanding ${eur(due)}`}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={() => {
            shop.dispatch({ t: 'recordPayment', invoiceId, amount: Number(amount) || 0, method })
            shop.toast({ title: 'Payment recorded', body: `${eur(Number(amount) || 0)} by ${method}`, tone: 'ok' })
            onClose()
          }}>Record</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Amount"><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus /></Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="account">On account</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
