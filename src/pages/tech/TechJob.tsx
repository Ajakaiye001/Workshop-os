import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { STATUS_LABEL, useShop } from '../../data/store'
import type { JobStatus } from '../../data/types'
import {
  Badge, Button, Callout, EmptyState, Icon, Panel, Segmented, Textarea, cx, Dot,
} from '../../components/ui'
import { PriorityTag, Reg, StatusBadge, StockBadge, FuelGauge } from '../../components/Bits'
import { DiagnosticsConsole } from '../../features/Diagnostics'
import { SourcePartModal } from '../../features/SourcePart'
import { num, relative, time } from '../../lib/format'

export default function TechJob() {
  const { id } = useParams()
  const shop = useShop()
  const nav = useNavigate()
  const [tab, setTab] = useState<'job' | 'diagnostics' | 'parts' | 'notes'>('job')
  const [note, setNote] = useState('')
  const [sourcing, setSourcing] = useState<string | null>(null)

  const job = shop.getJob(id)
  if (!job) return <EmptyState icon="clipboard" title="Job not found" action={<Button onClick={() => nav('/tech')}>Back to my jobs</Button>} />

  const v = shop.getVehicle(job.vehicleId)!
  const c = shop.getCustomer(job.customerId)!
  const bay = shop.getBay(job.bayId)
  const blocked = job.parts.filter((p) => p.status === 'out' || p.status === 'ordered')
  const codes = shop.getDiag(job.diagnosticSessionId)?.codes.length ?? 0

  const nextAction = (): { label: string; status: JobStatus; icon: 'play' | 'check' | 'scan' } | null => {
    switch (job.status) {
      case 'assigned': return { label: 'Start diagnosis', status: 'diagnosing', icon: 'scan' }
      case 'checked-in': return { label: 'Start diagnosis', status: 'diagnosing', icon: 'scan' }
      case 'awaiting-parts': return null
      case 'in-progress': return { label: 'Ready for inspection', status: 'quality-check', icon: 'check' }
      case 'quality-check': return { label: 'Passed — ready for collection', status: 'ready', icon: 'check' }
      case 'diagnosing': return { label: 'Start repair', status: 'in-progress', icon: 'play' }
      default: return null
    }
  }
  const next = nextAction()

  return (
    <div>
      {/* ---------- vehicle header ---------- */}
      <div className="mb-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.022em]">{v.year} {v.make} {v.model}</h1>
              <Reg value={v.reg} size="md" />
              <PriorityTag priority={job.priority} />
            </div>
            <p className="mt-1 text-sm text-ink-3">
              {v.variant} · {v.engine} · {v.fuel} {v.transmission}
            </p>
          </div>
          <div className="text-right">
            <div className="num font-mono text-xs text-ink-4">{job.number}</div>
            <div className="mt-1"><StatusBadge status={job.status} live /></div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
          <div><dt className="text-2xs text-ink-4">Bay</dt><dd className="mt-0.5 font-mono text-sm">{bay?.name ?? 'Unassigned'}</dd></div>
          <div><dt className="text-2xs text-ink-4">Odometer</dt><dd className="num mt-0.5 font-mono text-sm">{num(v.mileage)} km</dd></div>
          <div><dt className="text-2xs text-ink-4">Fuel at check-in</dt><dd className="mt-0.5">{job.checkIn ? <FuelGauge level={job.checkIn.fuelLevel} /> : '—'}</dd></div>
          <div><dt className="text-2xs text-ink-4">Due</dt><dd className="mt-0.5 text-sm">{time(job.promisedFor)}</dd></div>
        </dl>
      </div>

      {/* ---------- primary action ---------- */}
      {next && (
        <Button
          size="lg" variant="hv" full icon={next.icon} className="mb-4 h-12 text-md"
          onClick={() => {
            shop.dispatch({ t: 'jobStatus', jobId: job.id, status: next.status })
            shop.toast({ title: STATUS_LABEL[next.status], body: `${v.make} ${v.model} · ${job.number}`, tone: 'ok' })
            if (next.status === 'diagnosing') setTab('diagnostics')
          }}
        >
          {next.label}
        </Button>
      )}

      {blocked.length > 0 && (
        <Callout tone="warn" className="mb-4" title="Waiting on parts — do not start"
          action={<Button size="sm" onClick={() => setTab('parts')}>See parts</Button>}>
          {blocked.map((b) => {
            const p = shop.getPart(b.partId)!
            const po = shop.purchaseOrders.find((o) => o.id === b.poId)
            return <span key={b.id} className="mr-3 inline-block">{p.name} ×{b.qty}{po ? ` · ${po.number}, ${po.expectedAt ? relative(po.expectedAt) : 'ordered'}` : ' · not ordered'}</span>
          })}
        </Callout>
      )}

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'job', label: 'Job' },
            { value: 'diagnostics', label: 'Diagnostics', count: codes || undefined },
            { value: 'parts', label: 'Parts', count: job.parts.length || undefined },
            { value: 'notes', label: 'Notes', count: job.notes.length || undefined },
          ]}
        />
      </div>

      {tab === 'job' && (
        <div className="space-y-4">
          <Panel title="What the customer said" bodyClass="p-4" dense>
            <p className="text-md leading-relaxed">{job.concern}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-4">
              <Icon name="users" size={12} />{c.name}
              <span>·</span>
              <span>Booked {relative(job.bookedFor)}</span>
            </div>
          </Panel>

          {job.checkIn && (
            <Panel title="Check-in report" bodyClass="p-4" dense>
              <ul className="space-y-2">
                {job.checkIn.condition.map((cd) => (
                  <li key={cd.area} className="flex gap-3 text-sm">
                    <span className="w-[110px] shrink-0 text-ink-4">{cd.area}</span>
                    <span className="flex-1">{cd.note}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-xs text-ink-4">
                <span className="flex items-center gap-1.5"><Icon name="camera" size={12} />{job.checkIn.photos} photos</span>
                <span className="flex items-center gap-1.5"><Icon name="key" size={12} />Keys received</span>
              </div>
            </Panel>
          )}

          <Panel title="Work to do" subtitle={job.repairs.length ? undefined : 'Nothing approved yet'} bodyClass="p-0" dense>
            {job.repairs.length === 0 && job.labour.length === 0 ? (
              <EmptyState icon="wrench" title="No approved work" body="Run a scan and send recommendations to the office, or wait for the estimate to be approved." />
            ) : (
              <ul>
                {job.repairs.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
                    <span className={cx('mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      r.status === 'done' ? 'border-transparent bg-hv text-hv-ink' : 'border-line-strong')}>
                      {r.status === 'done' && <Icon name="check" size={9} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-md font-medium">{r.title}</span>
                        {r.fromCode && <Badge tone="neutral" mono>{r.fromCode}</Badge>}
                        <Badge tone={r.status === 'done' ? 'ok' : r.status === 'approved' ? 'info' : r.status === 'declined' ? 'bad' : 'warn'}>{r.status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-ink-4">{r.labourHours} hours allowed</div>
                    </div>
                    {r.status === 'approved' && (
                      <Button size="sm" onClick={() => shop.dispatch({ t: 'repairStatus', jobId: job.id, repairId: r.id, status: 'done' })}>Mark done</Button>
                    )}
                  </li>
                ))}
                {job.labour.filter((l) => !l.repairId).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                    <Dot tone="neutral" />
                    <span className="flex-1 text-md">{l.description}</span>
                    <span className="num text-xs text-ink-4">{l.hours} h</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'diagnostics' && <DiagnosticsConsole job={job} compact />}

      {tab === 'parts' && (
        <Panel title="Parts on this job" bodyClass="p-0" dense>
          {job.parts.length === 0 ? (
            <EmptyState icon="box" title="No parts yet" body="Parts land here automatically when you add a repair from a fault code." />
          ) : (
            <ul>
              {job.parts.map((jp) => {
                const p = shop.getPart(jp.partId)!
                const po = shop.purchaseOrders.find((o) => o.id === jp.poId)
                return (
                  <li key={jp.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-md font-medium">{p.name} <span className="text-ink-4">×{jp.qty}</span></div>
                      <div className="mt-0.5 font-mono text-2xs text-ink-4">{p.brand} · {p.partNumber} · bin {p.location}</div>
                      {po && <div className="mt-1 text-2xs text-ink-3">{po.number} · {po.status === 'received' ? 'received' : po.expectedAt ? `expected ${relative(po.expectedAt)}` : 'ordered'}</div>}
                    </div>
                    <StockBadge status={jp.status} />
                    {jp.status === 'out' && shop.can('parts.request') && (
                      <Button size="sm" variant="hv" icon="truck" onClick={() => setSourcing(p.id)}>Request</Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <Panel title="Add a note" bodyClass="p-4" dense>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What did you find? Anything the office should tell the customer?" />
            <div className="mt-2.5 flex gap-2">
              <Button variant="hv" disabled={!note.trim()}
                onClick={() => { shop.dispatch({ t: 'jobNote', jobId: job.id, body: note }); setNote(''); shop.toast({ title: 'Note saved to the job', tone: 'ok' }) }}>
                Save note
              </Button>
              <Button icon="camera">Take photo</Button>
            </div>
          </Panel>

          {job.notes.length > 0 && (
            <Panel title="Job notes" bodyClass="p-4" dense>
              <ul className="space-y-3">
                {job.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-baseline gap-2 text-2xs text-ink-4">
                      <span className="font-medium text-ink-2">{shop.getStaff(n.byId)?.name}</span>
                      <span>{relative(n.at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{n.body}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Timeline" bodyClass="p-4" dense>
            <ol className="space-y-2.5">
              {[...job.timeline].reverse().slice(0, 10).map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="num w-11 shrink-0 font-mono text-2xs text-ink-4">{time(e.at)}</span>
                  <span className="min-w-0">
                    <span className="block">{e.title}</span>
                    {e.detail && <span className="block text-2xs text-ink-4">{e.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}

      <SourcePartModal open={!!sourcing} onClose={() => setSourcing(null)} part={shop.getPart(sourcing ?? undefined)} jobId={job.id} qty={1} />
    </div>
  )
}
