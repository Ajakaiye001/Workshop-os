import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { JobStatus } from '../../data/types'
import {
  Badge, Button, Callout, EmptyState, Icon, Modal, Panel, SectionLabel, Toaster, cx, Dot,
} from '../../components/ui'
import { Reg } from '../../components/Bits'
import { Mark, Wordmark } from '../../components/layout/Wordmark'
import { dateMed, eur, plural, relative, time } from '../../lib/format'
import { invoiceDue, invoiceTotals } from '../../lib/money'

const STEPS: { status: JobStatus; label: string; blurb: string }[] = [
  { status: 'checked-in', label: 'Vehicle checked in', blurb: 'We have your keys and have photographed the vehicle.' },
  { status: 'diagnosing', label: 'Diagnostics', blurb: 'Our scan tool is reading every module on the car.' },
  { status: 'awaiting-approval', label: 'Estimate sent', blurb: 'We have priced the work and are waiting on your go-ahead.' },
  { status: 'awaiting-parts', label: 'Parts ordered', blurb: 'Parts are on their way from our supplier.' },
  { status: 'in-progress', label: 'Repair in progress', blurb: 'A technician is working on the vehicle now.' },
  { status: 'quality-check', label: 'Quality check', blurb: 'A second pair of eyes checks the work and road tests it.' },
  { status: 'ready', label: 'Ready for collection', blurb: 'All done. Come and get it whenever suits.' },
]

const ORDER: JobStatus[] = ['booked', 'checked-in', 'assigned', 'diagnosing', 'awaiting-approval', 'awaiting-parts', 'in-progress', 'quality-check', 'ready', 'completed']

export default function Portal() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [approveOpen, setApproveOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const job = shop.getJob(id)
  if (!job) return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState icon="car" title="We could not find that vehicle" body="Check the link in your text message, or call us on 090 649 7720." />
    </div>
  )

  const v = shop.getVehicle(job.vehicleId)!
  const c = shop.getCustomer(job.customerId)!
  const t = shop.totalsFor(job)
  const invoice = shop.getInvoice(job.invoiceId)
  const currentIdx = ORDER.indexOf(job.status)
  const s = shop.settings

  const stepState = (st: JobStatus) => {
    const i = ORDER.indexOf(st)
    if (i < currentIdx) return 'done'
    if (i === currentIdx) return 'current'
    return 'todo'
  }
  const currentStep = STEPS.find((x) => x.status === job.status) ?? STEPS.find((x) => ORDER.indexOf(x.status) >= currentIdx) ?? STEPS[0]

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex h-16 max-w-[900px] items-center gap-3 px-5">
          <Mark size={26} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{s.name}</div>
            <div className="truncate text-2xs text-ink-4">{s.openHours}</div>
          </div>
          <div className="flex-1" />
          <a href={`tel:${s.phone}`} className="hidden sm:block">
            <Button size="sm" icon="phone">{s.phone}</Button>
          </a>
          <Button size="sm" variant="ghost" onClick={() => nav('/app/jobs/' + job.id)}>Staff view</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-5 py-8">
        {/* ---------- hero ---------- */}
        <div className="mb-7">
          <SectionLabel>Hello {c.name.split(' ')[0]}</SectionLabel>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em]">
            Your {v.make} {v.model}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <Reg value={v.reg} size="md" />
            <span className="text-sm text-ink-3">{v.year} · {v.variant}</span>
            <span className="text-ink-4">·</span>
            <span className="font-mono text-xs text-ink-4">{job.number}</span>
          </div>
        </div>

        {/* ---------- current status ---------- */}
        <div className="mb-6 rounded-xl border border-line bg-raised p-5 shadow-xs">
          <div className="flex items-start gap-4">
            <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
              job.status === 'ready' ? 'bg-hv text-hv-ink' : 'bg-sunken text-ink-2')}>
              <Icon name={job.status === 'ready' ? 'check' : job.status === 'awaiting-parts' ? 'truck' : job.status === 'diagnosing' ? 'scan' : 'wrench'} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-[-0.015em]">{currentStep.label}</h2>
                {(job.status === 'in-progress' || job.status === 'diagnosing') && <Dot tone="hv" pulse />}
              </div>
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-ink-3">{currentStep.blurb}</p>
              <p className="mt-2 text-xs text-ink-4">
                Expected ready {time(job.promisedFor)} today · your technician is {shop.getStaff(job.technicianId)?.name ?? 'being assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* ---------- action needed ---------- */}
        {job.estimateStatus === 'sent' && (
          <Callout tone="warn" className="mb-6" icon="alert" title="We need your approval before we can start"
            action={<Button size="sm" variant="primary" onClick={() => setApproveOpen(true)}>Review estimate</Button>}>
            {eur(t.total)} including VAT. Nothing is charged until you approve.
          </Callout>
        )}
        {invoice && invoiceDue(invoice) > 0.5 && (
          <Callout tone="info" className="mb-6" icon="euro" title={`${eur(invoiceDue(invoice))} outstanding`}
            action={<Button size="sm" variant="primary" onClick={() => setPayOpen(true)}>Pay now</Button>}>
            Invoice {invoice.number} · due {relative(invoice.dueAt)}. Pay by card here or when you collect.
          </Callout>
        )}

        {/* ---------- progress ---------- */}
        <Panel title="Progress" bodyClass="p-5" className="mb-6">
          <ol className="relative">
            <span className="absolute bottom-3 left-[11px] top-3 w-px bg-line" aria-hidden />
            {STEPS.map((step) => {
              const st = stepState(step.status)
              return (
                <li key={step.status} className="relative flex gap-3.5 pb-5 last:pb-0">
                  <span className={cx('relative z-[1] mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2',
                    st === 'done' ? 'border-transparent bg-ink text-on-ink'
                      : st === 'current' ? 'border-hv bg-hv text-hv-ink'
                      : 'border-line bg-paper')}>
                    {st === 'done' ? <Icon name="check" size={11} strokeWidth={3} />
                      : st === 'current' ? <span className="h-2 w-2 rounded-full bg-hv-ink" />
                      : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className={cx('text-sm', st === 'todo' ? 'text-ink-4' : st === 'current' ? 'font-semibold' : 'font-medium')}>
                      {step.label}
                    </div>
                    {st !== 'todo' && <p className="mt-0.5 max-w-[56ch] text-xs leading-relaxed text-ink-3">{step.blurb}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </Panel>

        {/* ---------- what we found ---------- */}
        {job.repairs.length > 0 && (
          <Panel title="What we found" subtitle="What we checked and what we recommend" bodyClass="p-0" className="mb-6">
            <ul>
              {job.repairs.map((r) => (
                <li key={r.id} className="border-b border-line px-5 py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-md font-medium">{r.title}</h3>
                    <Badge tone={r.status === 'done' ? 'ok' : r.status === 'approved' ? 'info' : r.status === 'declined' ? 'neutral' : 'warn'}>
                      {r.status === 'recommended' ? 'Awaiting your approval' : r.status === 'done' ? 'Completed' : r.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-ink-3">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-4">
                    <span>{r.labourHours} hours of labour</span>
                    <span>{plural(job.parts.filter((p) => p.repairId === r.id).length, 'part')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* ---------- costs ---------- */}
        {(job.parts.length > 0 || job.labour.length > 0) && (
          <Panel title={invoice ? 'Your invoice' : 'Your estimate'} bodyClass="p-5" className="mb-6"
            actions={invoice && <Button size="sm" icon="download">PDF</Button>}>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-3">Parts</dt><dd className="num">{eur(t.parts)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Labour</dt><dd className="num">{eur(t.labour)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">Diagnostics and consumables</dt><dd className="num">{eur(t.fees)}</dd></div>
              {t.discount > 0 && <div className="flex justify-between text-ok"><dt>Goodwill discount</dt><dd className="num">−{eur(t.discount)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1.5"><dt className="text-ink-3">VAT at 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {job.estimateStatus === 'sent' && (
                <>
                  <Button variant="primary" icon="check" onClick={() => setApproveOpen(true)}>Approve the work</Button>
                  <Button onClick={() => { shop.dispatch({ t: 'estimateDecision', jobId: job.id, approved: false }); shop.toast({ title: 'Estimate declined', body: 'We have let the workshop know.' }) }}>
                    Decline for now
                  </Button>
                </>
              )}
              {job.estimateStatus === 'approved' && !invoice && (
                <div className="flex items-center gap-2 text-sm text-ok"><Icon name="check" size={15} />You approved this on {job.estimateDecidedAt ? dateMed(job.estimateDecidedAt) : 'today'}</div>
              )}
              {invoice && invoiceDue(invoice) > 0.5 && <Button variant="primary" icon="euro" onClick={() => setPayOpen(true)}>Pay {eur(invoiceDue(invoice))}</Button>}
              {invoice && invoiceDue(invoice) <= 0.5 && <div className="flex items-center gap-2 text-sm text-ok"><Icon name="check" size={15} />Paid in full, thank you</div>}
            </div>
          </Panel>
        )}

        {/* ---------- history + contact ---------- */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Panel title="Service history" bodyClass="p-0" dense>
            {shop.jobs.filter((j) => j.vehicleId === v.id && j.status === 'completed').slice(0, 4).map((j) => (
              <div key={j.id} className="border-b border-line px-4 py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{j.serviceType}</span>
                  <span className="text-2xs text-ink-4">{dateMed(j.bookedFor)}</span>
                </div>
                {j.repairs.length > 0 && <div className="mt-0.5 text-2xs text-ink-4">{j.repairs.map((r) => r.title).join(', ')}</div>}
              </div>
            ))}
            {shop.jobs.filter((j) => j.vehicleId === v.id && j.status === 'completed').length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-ink-4">This is your first visit with us.</div>
            )}
          </Panel>

          <Panel title="Talk to us" bodyClass="p-4" dense>
            <p className="text-sm leading-relaxed text-ink-3">
              Anything you are unsure about, ring us and ask for {shop.getStaff(job.advisorId)?.name ?? 'the service desk'}.
            </p>
            <div className="mt-3 space-y-2">
              <a href={`tel:${s.phone}`}><Button size="sm" full icon="phone">{s.phone}</Button></a>
              <a href={`mailto:${s.email}`}><Button size="sm" full icon="mail">Email the workshop</Button></a>
            </div>
            <address className="mt-3 border-t border-line pt-3 text-2xs not-italic leading-relaxed text-ink-4">
              {s.address}
            </address>
          </Panel>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-2xs text-ink-4">
          <span>{s.legalName} · VAT {s.vatNumber}</span>
          <span className="flex items-center gap-1.5">Powered by <Wordmark size={11} /></span>
        </footer>
      </main>

      {/* ---------- approve ---------- */}
      <Modal
        open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve the work"
        sub={`${v.make} ${v.model} · ${v.reg}`}
        footer={
          <>
            <Button size="sm" onClick={() => setApproveOpen(false)}>Not yet</Button>
            <Button size="sm" variant="primary" icon="check"
              onClick={() => {
                shop.dispatch({ t: 'estimateDecision', jobId: job.id, approved: true })
                shop.toast({ title: 'Thanks, that is approved', body: 'The workshop has been notified and will get started.', tone: 'ok' })
                setApproveOpen(false)
              }}>
              Approve {eur(t.total)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">
            Approving means we will order any parts we need and get the work under way. If anything changes we will
            ring you before spending another cent.
          </p>
          <ul className="divide-y divide-[color:var(--line)] rounded-md border border-line">
            {job.repairs.map((r) => (
              <li key={r.id} className="px-3 py-2.5">
                <div className="text-sm font-medium">{r.title}</div>
                <div className="mt-0.5 text-2xs text-ink-4">{r.labourHours} hours labour · {job.parts.filter((p) => p.repairId === r.id).length} parts</div>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd className="num">{eur(t.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">VAT at 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
          </dl>
        </div>
      </Modal>

      {/* ---------- pay ---------- */}
      <Modal
        open={payOpen} onClose={() => setPayOpen(false)} title="Pay your invoice" width="sm"
        sub={invoice ? `${invoice.number} · ${eur(invoiceDue(invoice))} due` : ''}
        footer={
          <>
            <Button size="sm" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" icon="lock"
              onClick={() => {
                if (invoice) {
                  shop.dispatch({ t: 'recordPayment', invoiceId: invoice.id, amount: invoiceDue(invoice), method: 'card' })
                  shop.toast({ title: 'Payment received', body: 'A receipt is on its way to your email.', tone: 'ok' })
                }
                setPayOpen(false)
              }}>
              Pay {invoice ? eur(invoiceDue(invoice)) : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-3">
            Card payments are handled by our payment provider. This is a prototype, so nothing is actually charged.
          </p>
          {invoice && (
            <dl className="space-y-1 rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-3">Invoice total</dt><dd className="num">{eur(invoiceTotals(invoice).total)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Amount due</dt><dd className="num">{eur(invoiceDue(invoice))}</dd></div>
            </dl>
          )}
        </div>
      </Modal>

      <Toaster toasts={shop.toasts} onDismiss={shop.dismissToast} />
    </div>
  )
}
