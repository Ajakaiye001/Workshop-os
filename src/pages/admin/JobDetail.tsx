import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { STATUS_LABEL, useShop } from '../../data/store'
import type { Job, JobStatus, Priority } from '../../data/types'
import {
  Badge, Button, Callout, cx, EmptyState, Field, Icon, IconButton, Input, KV, MenuItem,
  Modal, Panel, Popover, SectionLabel, Select, Table, Tabs, Td, Textarea, Th, Tr,
} from '../../components/ui'
import { BackLink, Money, PriorityTag, Reg, StatusBadge, StockBadge, FuelGauge } from '../../components/Bits'
import { DiagnosticsConsole } from '../../features/Diagnostics'
import { SourcePartModal } from '../../features/SourcePart'
import { dateTime, eur, num, relative, time } from '../../lib/format'
import { invoiceTotals } from '../../lib/money'

const FLOW: JobStatus[] = ['booked', 'checked-in', 'assigned', 'diagnosing', 'awaiting-approval', 'awaiting-parts', 'in-progress', 'quality-check', 'ready', 'completed']

export default function JobDetail() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'work'
  const [sourcing, setSourcing] = useState<{ partId: string; qty: number } | null>(null)
  const [addPartOpen, setAddPartOpen] = useState(false)

  const job = shop.getJob(id)
  if (!job) return <EmptyState icon="clipboard" title="Work order not found" body="It may have been merged or removed." action={<Button onClick={() => nav('/app/jobs')}>Back to jobs</Button>} />

  const v = shop.getVehicle(job.vehicleId)!
  const c = shop.getCustomer(job.customerId)!
  const t = shop.totalsFor(job)
  const bay = shop.getBay(job.bayId)
  const invoice = shop.getInvoice(job.invoiceId)
  const blockedParts = job.parts.filter((p) => p.status === 'out' || p.status === 'ordered')
  const stageIdx = FLOW.indexOf(job.status)

  return (
    <div className="mx-auto max-w-[1500px]">
      <BackLink to="/app/jobs">All jobs</BackLink>

      {/* ---------- header ---------- */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.02em]">{job.number}</h1>
            <StatusBadge status={job.status} live />
            <PriorityTag priority={job.priority} />
            {job.waiting && <Badge tone="info" icon="clock">Customer waiting</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
            <Link to={`/app/vehicles/${v.id}`} className="font-medium text-ink hover:underline">{v.year} {v.make} {v.model}</Link>
            <Reg value={v.reg} />
            <span>·</span>
            <Link to={`/app/customers/${c.id}`} className="hover:text-ink hover:underline">{c.name}</Link>
            <span>·</span>
            <span>{job.serviceType}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {shop.can('jobs.edit') && <AdvanceButton job={job} />}
          {shop.can('invoices.create') && job.status === 'completed' && !invoice && (
            <Button icon="receipt" onClick={() => { shop.dispatch({ t: 'createInvoice', jobId: job.id }); shop.toast({ title: 'Invoice generated', body: 'Draft ready to send', tone: 'ok' }) }}>
              Generate invoice
            </Button>
          )}
          {invoice && shop.can('finance.view') && (
            <Button icon="receipt" onClick={() => nav(`/app/invoices/${invoice.id}`)}>{invoice.number}</Button>
          )}
          <Popover
            trigger={({ toggle }) => <IconButton icon="more" label="More actions" onClick={toggle} />}
            width={220}
          >
            {(close) => (
              <div className="py-1">
                <MenuItem icon="external" onClick={() => { window.open(`/portal/${job.id}`, '_blank'); close() }}>Open customer view</MenuItem>
                <MenuItem icon="print" onClick={close}>Print job card</MenuItem>
                <MenuItem icon="copy" onClick={() => { navigator.clipboard?.writeText(job.number); shop.toast({ title: 'Job number copied' }); close() }}>Copy job number</MenuItem>
                <MenuItem icon="wrench" onClick={() => { setParams({ tab: 'diagnostics' }); close() }}>Run diagnostics</MenuItem>
              </div>
            )}
          </Popover>
        </div>
      </div>

      {/* ---------- stage rail ---------- */}
      <div className="mb-5 overflow-x-auto rounded-lg border border-line bg-raised px-4 py-3">
        <ol className="flex min-w-[760px] items-center gap-1">
          {FLOW.map((s, i) => {
            const done = i < stageIdx
            const active = i === stageIdx
            return (
              <li key={s} className="flex flex-1 items-center gap-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold',
                      done ? 'border-transparent bg-ink text-on-ink' : active ? 'border-transparent bg-hv text-hv-ink' : 'border-line text-ink-4')}>
                      {done ? <Icon name="check" size={9} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={cx('truncate text-2xs', active ? 'font-semibold text-ink' : done ? 'text-ink-3' : 'text-ink-4')}>
                      {STATUS_LABEL[s]}
                    </span>
                  </div>
                </div>
                {i < FLOW.length - 1 && <span className={cx('h-px w-3 shrink-0', done ? 'bg-ink-4' : 'bg-line')} />}
              </li>
            )
          })}
        </ol>
      </div>

      {blockedParts.length > 0 && job.status === 'awaiting-parts' && (
        <Callout
          tone="warn"
          title={`Blocked on ${blockedParts.length} part${blockedParts.length > 1 ? 's' : ''}`}
          action={<Button size="sm" onClick={() => setParams({ tab: 'parts' })}>Open parts</Button>}
        >
          {blockedParts.map((bp) => {
            const p = shop.getPart(bp.partId)!
            const po = shop.purchaseOrders.find((o) => o.id === bp.poId)
            return (
              <span key={bp.id} className="mr-3 inline-block">
                {p.name} ×{bp.qty}
                {po ? ` — on ${po.number}, ${po.status === 'received' ? 'received' : `expected ${po.expectedAt ? relative(po.expectedAt) : 'soon'}`}` : ' — not yet ordered'}
              </span>
            )
          })}
        </Callout>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        {/* ---------- main column ---------- */}
        <div className="min-w-0">
          <Tabs
            value={tab}
            onChange={(v) => setParams(v === 'work' ? {} : { tab: v })}
            options={[
              { value: 'work', label: 'Work' },
              { value: 'diagnostics', label: 'Diagnostics', count: shop.getDiag(job.diagnosticSessionId)?.codes.length },
              { value: 'parts', label: 'Parts & labour', count: job.parts.length + job.labour.length },
              { value: 'estimate', label: 'Estimate & invoice' },
              { value: 'timeline', label: 'Timeline', count: job.timeline.length },
            ]}
          />

          <div className="pt-5">
            {tab === 'work' && <WorkTab job={job} />}
            {tab === 'diagnostics' && <DiagnosticsConsole job={job} />}
            {tab === 'parts' && <PartsTab job={job} onSource={(partId, qty) => setSourcing({ partId, qty })} onAdd={() => setAddPartOpen(true)} />}
            {tab === 'estimate' && <EstimateTab job={job} />}
            {tab === 'timeline' && <TimelineTab job={job} />}
          </div>
        </div>

        {/* ---------- right rail ---------- */}
        <aside className="space-y-4">
          <Panel title="Assignment" dense bodyClass="p-3">
            {shop.can('jobs.assign') ? (
              <div className="space-y-2.5">
                <Field label="Technician">
                  <Select value={job.technicianId ?? ''} onChange={(e) => shop.dispatch({ t: 'jobAssign', jobId: job.id, technicianId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {shop.staff.filter((s) => s.roleId === 'technician').map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.onDuty ? '' : ' — off duty'}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Bay">
                  <Select value={job.bayId ?? ''} onChange={(e) => shop.dispatch({ t: 'moveJobToBay', jobId: job.id, bayId: e.target.value })}>
                    <option value="">No bay</option>
                    {shop.bays.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.kind}{b.jobId && b.jobId !== job.id ? ' (busy)' : ''}</option>)}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={job.priority} onChange={(e) => shop.dispatch({ t: 'jobAssign', jobId: job.id, priority: e.target.value as Priority })}>
                    {(['low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                  </Select>
                </Field>
              </div>
            ) : (
              <dl>
                <KV label="Technician">{shop.getStaff(job.technicianId)?.name ?? 'Unassigned'}</KV>
                <KV label="Bay">{bay?.name ?? '—'}</KV>
                <KV label="Priority" >{job.priority}</KV>
              </dl>
            )}
            <dl className="mt-3 border-t border-line pt-2">
              <KV label="Advisor">{shop.getStaff(job.advisorId)?.name ?? '—'}</KV>
              <KV label="Booked">{dateTime(job.bookedFor)}</KV>
              <KV label="Promised">{dateTime(job.promisedFor)}</KV>
            </dl>
          </Panel>

          {shop.can('finance.view') && (
            <Panel title="Financial summary" dense bodyClass="p-3">
              <dl className="space-y-0.5 text-sm">
                <div className="flex justify-between py-1"><dt className="text-ink-3">Parts</dt><dd className="num">{eur(t.parts)}</dd></div>
                <div className="flex justify-between py-1"><dt className="text-ink-3">Labour</dt><dd className="num">{eur(t.labour)}</dd></div>
                <div className="flex justify-between py-1"><dt className="text-ink-3">Diagnostics & consumables</dt><dd className="num">{eur(t.fees)}</dd></div>
                <div className="flex justify-between border-t border-line py-1.5 font-medium"><dt>Subtotal</dt><dd className="num">{eur(t.subtotal)}</dd></div>
                {t.discount > 0 && <div className="flex justify-between py-1 text-ok"><dt>Discount</dt><dd className="num">−{eur(t.discount)}</dd></div>}
                <div className="flex justify-between py-1"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-md font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
              </dl>
              <div className="mt-3 rounded border border-line bg-surface p-2">
                <div className="flex items-baseline justify-between text-2xs">
                  <span className="text-ink-4">Parts margin</span>
                  <span className="num font-medium">
                    {eur(job.parts.reduce((s, p) => s + p.qty * (p.unitPrice - (shop.getPart(p.partId)?.cost ?? 0)), 0))}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-2xs">
                  <span className="text-ink-4">Labour hours</span>
                  <span className="num font-medium">{num(job.labour.reduce((s, l) => s + l.hours, 0), 1)} h</span>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Vehicle" dense bodyClass="p-3"
            actions={<Link to={`/app/vehicles/${v.id}`} className="text-2xs text-ink-3 hover:text-ink">Profile →</Link>}>
            <dl>
              <KV label="Registration"><Reg value={v.reg} size="md" /></KV>
              <KV label="VIN" mono>{v.vin}</KV>
              <KV label="Engine">{v.engine}</KV>
              <KV label="Fuel">{v.fuel} · {v.transmission}</KV>
              <KV label="Odometer" mono>{num(v.mileage)} km</KV>
              <KV label="NCT due">{new Date(v.nctDue) < new Date() ? <span className="text-bad">Expired</span> : relative(v.nctDue)}</KV>
            </dl>
          </Panel>

          <Panel title="Customer" dense bodyClass="p-3"
            actions={<Link to={`/app/customers/${c.id}`} className="text-2xs text-ink-3 hover:text-ink">Profile →</Link>}>
            <div className="text-sm font-medium">{c.name}</div>
            {c.company && <div className="text-2xs text-ink-4">{c.company}</div>}
            <div className="mt-2 space-y-1">
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-ink-2 hover:text-ink"><Icon name="phone" size={12} className="text-ink-4" />{c.phone}</a>
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-ink-2 hover:text-ink"><Icon name="mail" size={12} className="text-ink-4" /><span className="truncate">{c.email}</span></a>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Button size="xs" icon="phone">Call</Button>
              <Button size="xs" icon="send">SMS update</Button>
            </div>
          </Panel>
        </aside>
      </div>

      <SourcePartModal
        open={!!sourcing}
        onClose={() => setSourcing(null)}
        part={shop.getPart(sourcing?.partId)}
        qty={sourcing?.qty ?? 1}
        jobId={job.id}
      />
      <AddPartModal open={addPartOpen} onClose={() => setAddPartOpen(false)} job={job} />
    </div>
  )
}

/* ---------------- advance status ---------------- */

function AdvanceButton({ job }: { job: Job }) {
  const shop = useShop()
  const idx = FLOW.indexOf(job.status)
  const next = FLOW[idx + 1]
  return (
    <div className="flex">
      {next && (
        <Button
          variant="primary"
          className="rounded-r-none"
          icon="arrowRight"
          onClick={() => {
            shop.dispatch({ t: 'jobStatus', jobId: job.id, status: next })
            shop.toast({ title: `Moved to ${STATUS_LABEL[next]}`, body: job.number, tone: 'ok' })
          }}
        >
          {STATUS_LABEL[next]}
        </Button>
      )}
      <Popover
        width={220}
        trigger={({ toggle }) => (
          <Button variant="primary" className={cx('px-2', next && 'rounded-l-none border-l border-[var(--hv-30)]')} onClick={toggle}>
            <Icon name="chevronDown" size={13} />
          </Button>
        )}
      >
        {(close) => (
          <div className="py-1">
            <div className="px-3 pb-1 pt-1.5 text-2xs uppercase tracking-[0.09em] text-ink-4">Set status</div>
            {FLOW.map((s) => (
              <MenuItem key={s} icon={s === job.status ? 'check' : undefined} onClick={() => { shop.dispatch({ t: 'jobStatus', jobId: job.id, status: s }); close() }}>
                {STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </div>
        )}
      </Popover>
    </div>
  )
}

/* ---------------- work tab ---------------- */

function WorkTab({ job }: { job: Job }) {
  const shop = useShop()
  const [note, setNote] = useState('')
  const [labourOpen, setLabourOpen] = useState(false)

  return (
    <div className="space-y-4">
      <Panel title="Customer concern" dense bodyClass="p-4">
        <p className="max-w-[70ch] text-sm leading-relaxed text-ink-2">{job.concern}</p>
      </Panel>

      {job.checkIn && (
        <Panel title="Vehicle check-in" subtitle={`${time(job.checkIn.at)} by ${shop.getStaff(job.checkIn.byId)?.name}`} dense bodyClass="p-4">
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <dl>
              <KV label="Mileage" mono>{num(job.checkIn.mileage)} km</KV>
              <KV label="Fuel"><FuelGauge level={job.checkIn.fuelLevel} /></KV>
              <KV label="Keys">{job.checkIn.keysReceived ? 'Received' : 'Not received'}</KV>
              <KV label="Photos">{job.checkIn.photos} on file</KV>
            </dl>
            <div>
              <SectionLabel>Condition report</SectionLabel>
              <ul className="mt-2 space-y-1.5">
                {job.checkIn.condition.map((cd) => (
                  <li key={cd.area} className="flex gap-3 text-xs">
                    <span className="w-[104px] shrink-0 text-ink-4">{cd.area}</span>
                    <span className={cx('flex-1', cd.note.includes('No damage') || cd.note.includes('above') ? 'text-ink-3' : 'text-ink-2')}>{cd.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        title="Repairs"
        subtitle={job.repairs.length ? `${job.repairs.filter((r) => r.status === 'approved' || r.status === 'done').length} approved of ${job.repairs.length}` : undefined}
        bodyClass="p-0"
        actions={shop.can('jobs.edit') && <Button size="sm" icon="plus" onClick={() => setLabourOpen(true)}>Add labour</Button>}
      >
        {job.repairs.length === 0 ? (
          <EmptyState
            icon="wrench"
            title="No repairs recommended yet"
            body="Run a diagnostic scan and turn fault codes into repairs, or add labour manually."
            action={<Link to={`/app/jobs/${job.id}?tab=diagnostics`}><Button size="sm" variant="primary" icon="scan">Open diagnostics</Button></Link>}
          />
        ) : (
          <ul>
            {job.repairs.map((r) => {
              const parts = job.parts.filter((p) => p.repairId === r.id)
              const labour = job.labour.filter((l) => l.repairId === r.id)
              const tone = r.status === 'done' ? 'ok' : r.status === 'declined' ? 'bad' : r.status === 'recommended' ? 'warn' : 'info'
              return (
                <li key={r.id} className="border-b border-line px-4 py-3.5 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {r.fromCode && <Badge tone="neutral" mono>{r.fromCode}</Badge>}
                        <h3 className="text-md font-medium">{r.title}</h3>
                        <Badge tone={tone}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge>
                      </div>
                      <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-ink-3">{r.description}</p>
                    </div>
                    {shop.can('jobs.edit') && r.status === 'recommended' && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="xs" variant="primary" onClick={() => shop.dispatch({ t: 'repairStatus', jobId: job.id, repairId: r.id, status: 'approved' })}>Approve</Button>
                        <Button size="xs" onClick={() => shop.dispatch({ t: 'repairStatus', jobId: job.id, repairId: r.id, status: 'declined' })}>Decline</Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="rounded border border-line bg-surface p-2.5">
                      <SectionLabel>Parts</SectionLabel>
                      {parts.length === 0 ? <div className="mt-1 text-2xs text-ink-4">None required</div> : (
                        <ul className="mt-1.5 space-y-1">
                          {parts.map((p) => {
                            const pt = shop.getPart(p.partId)!
                            return (
                              <li key={p.id} className="flex items-center gap-2 text-xs">
                                <Link to={`/app/parts/${pt.id}`} className="min-w-0 flex-1 truncate hover:underline">{pt.name} <span className="text-ink-4">×{p.qty}</span></Link>
                                <StockBadge status={p.status} />
                                {shop.can('finance.view') && <span className="num w-16 shrink-0 text-right">{eur(p.qty * p.unitPrice)}</span>}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="rounded border border-line bg-surface p-2.5">
                      <SectionLabel>Labour</SectionLabel>
                      <ul className="mt-1.5 space-y-1">
                        {labour.map((l) => (
                          <li key={l.id} className="flex items-center gap-2 text-xs">
                            <span className="min-w-0 flex-1 truncate">{l.description}</span>
                            <span className="num shrink-0 text-ink-3">{l.hours} h</span>
                            {shop.can('finance.view') && <span className="num w-16 shrink-0 text-right">{eur(l.hours * l.rate)}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Notes" bodyClass="p-4" dense>
        {job.notes.length > 0 && (
          <ul className="mb-3 space-y-2.5">
            {job.notes.map((n) => (
              <li key={n.id} className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-baseline gap-2 text-2xs text-ink-4">
                  <span className="font-medium text-ink-2">{shop.getStaff(n.byId)?.name}</span>
                  <span>{relative(n.at)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the file — visible to the whole team" rows={3} />
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="primary" disabled={!note.trim()} onClick={() => { shop.dispatch({ t: 'jobNote', jobId: job.id, body: note }); setNote('') }}>Add note</Button>
          <Button size="sm" icon="camera">Attach photo</Button>
        </div>
      </Panel>

      <AddLabourModal open={labourOpen} onClose={() => setLabourOpen(false)} job={job} />
    </div>
  )
}

/* ---------------- parts tab ---------------- */

function PartsTab({ job, onSource, onAdd }: { job: Job; onSource: (partId: string, qty: number) => void; onAdd: () => void }) {
  const shop = useShop()
  const t = shop.totalsFor(job)

  return (
    <div className="space-y-4">
      <Panel
        title="Parts"
        subtitle={`${job.parts.length} lines · checked against live stock`}
        bodyClass="p-0"
        actions={shop.can('parts.request') && <Button size="sm" icon="plus" onClick={onAdd}>Add part</Button>}
      >
        {job.parts.length === 0 ? (
          <EmptyState icon="box" title="No parts on this work order" body="Parts appear here automatically when a repair is added from a fault code, or add one manually." action={<Button size="sm" onClick={onAdd}>Add part</Button>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Part</Th>
                <Th>Number</Th>
                <Th align="center">Qty</Th>
                <Th>Stock</Th>
                <Th>Location</Th>
                {shop.can('finance.view') && <Th align="right">Unit</Th>}
                {shop.can('finance.view') && <Th align="right">Line</Th>}
                <Th />
              </tr>
            </thead>
            <tbody>
              {job.parts.map((jp) => {
                const p = shop.getPart(jp.partId)!
                const po = shop.purchaseOrders.find((o) => o.id === jp.poId)
                const free = p.qty - p.reserved
                return (
                  <Tr key={jp.id}>
                    <Td>
                      <Link to={`/app/parts/${p.id}`} className="text-sm font-medium hover:underline">{p.name}</Link>
                      <div className="text-2xs text-ink-4">{p.brand}</div>
                    </Td>
                    <Td mono>{p.partNumber}</Td>
                    <Td align="center"><span className="num text-sm">{jp.qty}</span></Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <StockBadge status={jp.status} />
                        {jp.status !== 'ordered' && <span className="num text-2xs text-ink-4">{free} free</span>}
                      </div>
                      {po && <div className="mt-0.5 text-2xs text-ink-4">{po.number} · {po.status === 'received' ? 'received' : po.expectedAt ? relative(po.expectedAt) : ''}</div>}
                    </Td>
                    <Td mono>{p.location}</Td>
                    {shop.can('finance.view') && <Td align="right"><Money value={jp.unitPrice} className="text-sm" /></Td>}
                    {shop.can('finance.view') && <Td align="right"><Money value={jp.unitPrice * jp.qty} className="text-sm" strong /></Td>}
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {(jp.status === 'out' || jp.status === 'ordered') && shop.can('po.create') && (
                          <Button size="xs" variant={jp.status === 'out' ? 'primary' : 'secondary'} icon="truck" onClick={() => onSource(p.id, jp.qty)}>
                            {jp.status === 'out' ? 'Source' : 'Re-order'}
                          </Button>
                        )}
                        {shop.can('jobs.edit') && <IconButton icon="trash" label="Remove part" size="xs" onClick={() => shop.dispatch({ t: 'removePart', jobId: job.id, jobPartId: jp.id })} />}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Labour" bodyClass="p-0" subtitle={`${num(job.labour.reduce((s, l) => s + l.hours, 0), 1)} hours at ${eur(shop.settings.labourRate)}/h`}>
        {job.labour.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-3">No labour recorded.</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Operation</Th>
                <Th>Technician</Th>
                <Th align="right">Hours</Th>
                {shop.can('finance.view') && <Th align="right">Rate</Th>}
                {shop.can('finance.view') && <Th align="right">Total</Th>}
              </tr>
            </thead>
            <tbody>
              {job.labour.map((l) => (
                <Tr key={l.id}>
                  <Td><span className="text-sm">{l.description}</span></Td>
                  <Td><span className="text-xs text-ink-3">{shop.getStaff(l.technicianId)?.name ?? '—'}</span></Td>
                  <Td align="right"><span className="num text-sm">{l.hours}</span></Td>
                  {shop.can('finance.view') && <Td align="right"><Money value={l.rate} className="text-sm" muted /></Td>}
                  {shop.can('finance.view') && <Td align="right"><Money value={l.rate * l.hours} className="text-sm" strong /></Td>}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {shop.can('finance.view') && (
        <div className="flex justify-end">
          <dl className="w-full max-w-xs space-y-1 rounded-lg border border-line bg-raised p-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Parts</dt><dd className="num">{eur(t.parts)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Labour</dt><dd className="num">{eur(t.labour)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Fees</dt><dd className="num">{eur(t.fees)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5 text-md font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}

/* ---------------- estimate tab ---------------- */

function EstimateTab({ job }: { job: Job }) {
  const shop = useShop()
  const nav = useNavigate()
  const t = shop.totalsFor(job)
  const invoice = shop.getInvoice(job.invoiceId)
  const c = shop.getCustomer(job.customerId)!
  const [discount, setDiscount] = useState(String(job.discount ?? 0))

  const state = job.estimateStatus

  return (
    <div className="space-y-4">
      <Panel
        title="Estimate"
        subtitle={state === 'none' ? 'Nothing to quote yet' : `${STATE_LABEL[state]}${job.estimateSentAt ? ` · sent ${relative(job.estimateSentAt)}` : ''}`}
        bodyClass="p-0"
        actions={
          <div className="flex gap-1.5">
            {shop.can('jobs.edit') && (state === 'draft' || state === 'none') && job.repairs.length > 0 && (
              <Button size="sm" variant="primary" icon="send" onClick={() => { shop.dispatch({ t: 'sendEstimate', jobId: job.id }); shop.toast({ title: 'Estimate sent', body: `${c.name} notified by ${c.preferredContact}`, tone: 'ok' }) }}>
                Send to customer
              </Button>
            )}
            {state === 'sent' && shop.can('jobs.edit') && (
              <>
                <Button size="sm" variant="primary" icon="check" onClick={() => { shop.dispatch({ t: 'estimateDecision', jobId: job.id, approved: true }); shop.toast({ title: 'Estimate approved', body: 'Work order released', tone: 'ok' }) }}>
                  Record approval
                </Button>
                <Button size="sm" icon="x" onClick={() => shop.dispatch({ t: 'estimateDecision', jobId: job.id, approved: false })}>Declined</Button>
              </>
            )}
          </div>
        }
      >
        {job.repairs.length === 0 && job.parts.length === 0 ? (
          <EmptyState icon="receipt" title="Nothing to estimate" body="Add repairs, parts or labour and the estimate builds itself." />
        ) : (
          <>
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip state={state} />
                {state === 'sent' && (
                  <a href={`/portal/${job.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink">
                    <Icon name="external" size={12} /> See what the customer sees
                  </a>
                )}
              </div>
            </div>
            <Table>
              <thead>
                <tr><Th>Item</Th><Th>Detail</Th><Th align="right">Qty</Th><Th align="right">Unit</Th><Th align="right">Total</Th></tr>
              </thead>
              <tbody>
                {job.parts.map((p) => {
                  const pt = shop.getPart(p.partId)!
                  return (
                    <Tr key={p.id}>
                      <Td><span className="text-sm">{pt.name}</span></Td>
                      <Td><span className="font-mono text-2xs text-ink-4">{pt.brand} · {pt.partNumber}</span></Td>
                      <Td align="right"><span className="num text-sm">{p.qty}</span></Td>
                      <Td align="right"><Money value={p.unitPrice} className="text-sm" muted /></Td>
                      <Td align="right"><Money value={p.unitPrice * p.qty} className="text-sm" /></Td>
                    </Tr>
                  )
                })}
                {job.labour.map((l) => (
                  <Tr key={l.id}>
                    <Td><span className="text-sm">{l.description}</span></Td>
                    <Td><span className="text-2xs text-ink-4">Labour</span></Td>
                    <Td align="right"><span className="num text-sm">{l.hours} h</span></Td>
                    <Td align="right"><Money value={l.rate} className="text-sm" muted /></Td>
                    <Td align="right"><Money value={l.rate * l.hours} className="text-sm" /></Td>
                  </Tr>
                ))}
                <Tr>
                  <Td><span className="text-sm">Diagnostics & consumables</span></Td>
                  <Td><span className="text-2xs text-ink-4">Scan, report, waste disposal</span></Td>
                  <Td align="right"><span className="num text-sm">1</span></Td>
                  <Td align="right"><Money value={t.fees} className="text-sm" muted /></Td>
                  <Td align="right"><Money value={t.fees} className="text-sm" /></Td>
                </Tr>
              </tbody>
            </Table>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-4 py-3">
              {shop.can('invoices.edit') ? (
                <div className="flex items-end gap-2">
                  <Field label="Goodwill discount" className="w-[140px]">
                    <Input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" />
                  </Field>
                  <Button size="sm" onClick={() => shop.dispatch({ t: 'jobDiscount', jobId: job.id, amount: Number(discount) || 0 })}>Apply</Button>
                </div>
              ) : <span />}
              <dl className="w-full max-w-[240px] space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd className="num">{eur(t.subtotal)}</dd></div>
                {t.discount > 0 && <div className="flex justify-between text-ok"><dt>Discount</dt><dd className="num">−{eur(t.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur(t.vat)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1.5 text-md font-semibold"><dt>Total</dt><dd className="num">{eur(t.total)}</dd></div>
              </dl>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Invoice" bodyClass="p-4" dense>
        {invoice ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{invoice.number}</span>
                <Badge tone={invoice.status === 'paid' ? 'ok' : invoice.status === 'overdue' ? 'bad' : 'info'}>{invoice.status}</Badge>
              </div>
              <div className="mt-0.5 text-xs text-ink-3">Issued {dateTime(invoice.issuedAt)} · {eur(invoiceTotals(invoice).total)} incl. VAT</div>
            </div>
            <Button size="sm" iconRight="arrowRight" onClick={() => nav(`/app/invoices/${invoice.id}`)}>Open invoice</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-3">
              {job.status === 'completed' ? 'This job is complete and ready to invoice.' : 'An invoice can be generated once the job is complete.'}
            </p>
            {shop.can('invoices.create') && (
              <Button size="sm" variant={job.status === 'completed' ? 'primary' : 'secondary'} icon="receipt"
                onClick={() => { shop.dispatch({ t: 'createInvoice', jobId: job.id }); shop.toast({ title: 'Invoice generated', tone: 'ok' }) }}>
                Generate invoice
              </Button>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}

const STATE_LABEL: Record<string, string> = { none: 'Not started', draft: 'Draft', sent: 'Awaiting customer', approved: 'Approved', declined: 'Declined' }
function StatusChip({ state }: { state: string }) {
  const tone = state === 'approved' ? 'ok' : state === 'declined' ? 'bad' : state === 'sent' ? 'warn' : 'neutral'
  return <Badge tone={tone as never}>{STATE_LABEL[state]}</Badge>
}

/* ---------------- timeline tab ---------------- */

const KIND_ICON: Record<string, Parameters<typeof Icon>[0]['name']> = {
  status: 'refresh', note: 'note', parts: 'box', diag: 'scan', money: 'euro', assign: 'users', customer: 'phone', photo: 'camera',
}

function TimelineTab({ job }: { job: Job }) {
  const shop = useShop()
  const events = [...job.timeline].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <Panel title="Timeline" subtitle={`${events.length} events since ${dateTime(job.createdAt)}`} bodyClass="p-4">
      <ol className="relative">
        <span className="absolute bottom-2 left-[13px] top-2 w-px bg-line" aria-hidden />
        {events.map((e) => (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span className="relative z-[1] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink-3">
              <Icon name={KIND_ICON[e.kind] ?? 'info'} size={12} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">{e.title}</span>
                <span className="num font-mono text-2xs text-ink-4">{time(e.at)}</span>
                {e.actorId && <span className="text-2xs text-ink-4">{shop.getStaff(e.actorId)?.name}</span>}
              </div>
              {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{e.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/* ---------------- modals ---------------- */

function AddPartModal({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const shop = useShop()
  const [q, setQ] = useState('')
  const [qty, setQty] = useState(1)
  const [sel, setSel] = useState<string>('')
  const results = shop.parts
    .filter((p) => `${p.name} ${p.partNumber} ${p.brand} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8)

  return (
    <Modal
      open={open} onClose={onClose} title="Add a part to this work order"
      sub="Stock is checked as you pick"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" disabled={!sel}
            onClick={() => {
              shop.dispatch({ t: 'addPart', jobId: job.id, partId: sel, qty })
              const p = shop.getPart(sel)!
              shop.toast({ title: `${p.name} added`, body: p.qty - p.reserved >= qty ? 'Reserved from stock' : 'Not in stock — source it from a supplier', tone: 'ok' })
              onClose(); setSel(''); setQ(''); setQty(1)
            }}>
            Add part
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Search the catalogue">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Part name, number or brand" autoFocus />
        </Field>
        <ul className="max-h-[280px] space-y-1 overflow-y-auto">
          {results.map((p) => {
            const free = p.qty - p.reserved
            return (
              <li key={p.id}>
                <button onClick={() => setSel(p.id)}
                  className={cx('flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                    sel === p.id ? 'border-[color:var(--hv)] bg-hv-dim' : 'border-line hover:bg-sunken')}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.name}</span>
                    <span className="block truncate font-mono text-2xs text-ink-4">{p.brand} · {p.partNumber} · {p.location}</span>
                  </span>
                  <span className={cx('num shrink-0 text-xs', free <= 0 ? 'text-bad' : free <= p.reorderAt ? 'text-warn' : 'text-ok')}>{free} free</span>
                  <span className="num w-16 shrink-0 text-right text-sm">{eur(p.price)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <Field label="Quantity" className="w-[110px]">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
        </Field>
      </div>
    </Modal>
  )
}

function AddLabourModal({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const shop = useShop()
  const [desc, setDesc] = useState('')
  const [hours, setHours] = useState('1.0')
  return (
    <Modal
      open={open} onClose={onClose} title="Add labour" sub={`Charged at ${eur(shop.settings.labourRate)} per hour`}
      width="sm"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" disabled={!desc.trim()}
            onClick={() => { shop.dispatch({ t: 'addLabour', jobId: job.id, description: desc, hours: Number(hours) || 0 }); setDesc(''); setHours('1.0'); onClose() }}>
            Add labour
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Operation"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Remove and refit inlet manifold" autoFocus /></Field>
        <Field label="Hours" className="w-[110px]"><Input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" /></Field>
        <div className="rounded border border-line bg-surface px-3 py-2 text-sm">
          <span className="text-ink-3">Line total </span>
          <span className="num font-semibold">{eur((Number(hours) || 0) * shop.settings.labourRate)}</span>
          <span className="text-ink-4"> ex VAT</span>
        </div>
      </div>
    </Modal>
  )
}
