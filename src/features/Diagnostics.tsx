import { useEffect, useRef, useState } from 'react'
import { useShop } from '../data/store'
import type { DTC, Job } from '../data/types'
import { Badge, Button, Callout, cx, Dot, Icon, Meter, Panel, SectionLabel } from '../components/ui'
import { SeverityBadge } from '../components/Bits'
import { eur, num, time } from '../lib/format'

/* ============================================================
   The scan console. Deliberately reads like an instrument, not
   a dashboard: mono type, a dark field, a sweeping scan line.
   ============================================================ */

export function DiagnosticsConsole({ job, compact }: { job: Job; compact?: boolean }) {
  const shop = useShop()
  const session = shop.getDiag(job.diagnosticSessionId)
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'scanning' | 'done'>(
    session ? (session.completedAt ? 'done' : 'idle') : 'idle',
  )
  const [progress, setProgress] = useState(0)
  const [moduleIdx, setModuleIdx] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const vehicle = shop.getVehicle(job.vehicleId)!

  function runScan() {
    if (!session) shop.dispatch({ t: 'diagStart', jobId: job.id })
    setPhase('connecting')
    setProgress(0)
    setModuleIdx(0)
    timers.current.push(window.setTimeout(() => setPhase('scanning'), 1100))
    const total = 8
    for (let i = 1; i <= total; i++) {
      timers.current.push(window.setTimeout(() => {
        setModuleIdx(i)
        setProgress(i / total)
        if (i === total) {
          setPhase('done')
          shop.dispatch({ t: 'diagComplete', jobId: job.id })
          shop.toast({ title: 'Scan complete', body: `${session?.codes.length ?? 2} fault codes stored`, tone: 'ok' })
        }
      }, 1100 + i * 420))
    }
  }

  const scanning = phase === 'connecting' || phase === 'scanning'
  const modules = session?.modulesScanned ?? []
  const shown = scanning ? modules.slice(0, moduleIdx) : modules

  return (
    <div className="space-y-4">
      {/* ---- device panel ---- */}
      <div className="overflow-hidden rounded-lg border border-line" data-theme="dark">
        <div className="field-grid bg-paper text-ink">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface">
                <Icon name="scan" size={16} className={scanning ? 'text-hv' : 'text-ink-3'} />
                {scanning && <span className="absolute inset-0 rounded-md ring-1 ring-[var(--hv-40)] animate-pulse-dot" />}
              </span>
              <div>
                <div className="font-mono text-xs font-medium">AutoScan Pro X1</div>
                <div className="flex items-center gap-1.5 text-2xs text-ink-3">
                  <Dot tone={phase === 'idle' ? 'neutral' : 'hv'} pulse={scanning} />
                  {phase === 'idle' ? 'Ready' : phase === 'connecting' ? 'Handshaking with gateway…' : phase === 'scanning' ? 'Scanning modules' : 'Connected'}
                </div>
              </div>
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-2xs">
              <div><dt className="text-ink-4">Vehicle</dt><dd className="mt-0.5 font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</dd></div>
              <div><dt className="text-ink-4">VIN</dt><dd className="mt-0.5 font-mono">{vehicle.vin}</dd></div>
              <div><dt className="text-ink-4">Odometer</dt><dd className="mt-0.5 font-mono">{num(vehicle.mileage)} km</dd></div>
              <div><dt className="text-ink-4">Battery</dt><dd className="mt-0.5 font-mono">{(session?.battery ?? 12.6).toFixed(1)} V</dd></div>
            </dl>

            <div className="ml-auto">
              {phase === 'done' && session?.completedAt ? (
                <Button size="sm" icon="refresh" onClick={runScan}>Re-scan</Button>
              ) : (
                <Button size="sm" variant="hv" icon={scanning ? undefined : 'play'} loading={scanning} onClick={runScan}>
                  {scanning ? 'Scanning' : session ? 'Run scan' : 'Connect and scan'}
                </Button>
              )}
            </div>
          </div>

          {/* module strip */}
          <div className="relative px-4 py-3">
            {scanning && (
              <span className="pointer-events-none absolute inset-x-0 top-0 h-8 animate-sweep bg-gradient-to-b from-transparent via-[oklch(0.86_0.19_118/0.14)] to-transparent" />
            )}
            <div className="mb-2 flex items-center justify-between">
              <SectionLabel>ECU scan</SectionLabel>
              <span className="num font-mono text-2xs text-ink-3">
                {shown.length}/{modules.length || 8} modules
              </span>
            </div>
            <Meter value={scanning ? progress : phase === 'done' ? 1 : 0} tone="hv" height={2} className="mb-3" />
            <ul className="grid gap-1 sm:grid-cols-2">
              {(modules.length ? modules : PLACEHOLDER_MODULES).map((mod, i) => {
                const visible = !scanning || i < moduleIdx
                const active = scanning && i === moduleIdx
                return (
                  <li key={mod.name} className={cx('flex items-center gap-2 rounded px-2 py-1.5 font-mono text-2xs transition-all duration-300',
                    visible ? 'bg-surface opacity-100' : active ? 'bg-surface opacity-70' : 'opacity-25')}>
                    <Dot tone={!visible ? 'neutral' : mod.faults ? 'bad' : 'ok'} pulse={active} />
                    <span className="flex-1 truncate">{mod.name}</span>
                    <span className={cx(!visible ? 'text-ink-4' : mod.faults ? 'text-bad' : 'text-ok')}>
                      {!visible ? (active ? 'reading' : 'queued') : mod.faults ? `${mod.faults} fault${mod.faults > 1 ? 's' : ''}` : 'ok'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {!session && phase === 'idle' && (
        <Callout tone="neutral" icon="info" title="No scan on this job yet">
          Connect the scan tool to pull fault codes, freeze frame data and live values. Codes become repair
          recommendations in one click, and the parts they need are checked against stock automatically.
        </Callout>
      )}

      {session && phase !== 'connecting' && (
        <>
          <FaultCodes job={job} codes={session.codes} scanning={scanning} />
          {!compact && <LiveData session={session} />}
          {session.completedAt && (
            <p className="text-2xs text-ink-4">
              Scan completed {time(session.completedAt)} by {shop.getStaff(session.technicianId)?.name} · report stored against {job.number}
            </p>
          )}
        </>
      )}
    </div>
  )
}

const PLACEHOLDER_MODULES = [
  { name: 'Engine Control Module', status: 'ok' as const, faults: 0 },
  { name: 'Transmission Control', status: 'ok' as const, faults: 0 },
  { name: 'ABS / Stability', status: 'ok' as const, faults: 0 },
  { name: 'Airbag / Restraints', status: 'ok' as const, faults: 0 },
  { name: 'Body Control Module', status: 'ok' as const, faults: 0 },
  { name: 'Climate Control', status: 'ok' as const, faults: 0 },
  { name: 'Instrument Cluster', status: 'ok' as const, faults: 0 },
  { name: 'Gateway', status: 'ok' as const, faults: 0 },
]

/* ---------------- fault codes → repair recommendations ---------------- */

function FaultCodes({ job, codes, scanning }: { job: Job; codes: DTC[]; scanning: boolean }) {
  const shop = useShop()
  const [open, setOpen] = useState<string | null>(codes[0]?.code ?? null)

  if (scanning) {
    return (
      <Panel title="Fault codes" bodyClass="p-3">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title="Fault codes"
      subtitle={codes.length ? `${codes.length} stored across ${new Set(codes.map((c) => c.system)).size} systems` : undefined}
      bodyClass="p-0"
    >
      {codes.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-3">No fault codes stored. All modules reported clean.</div>
      ) : (
        <ul>
          {codes.map((c) => {
            const isOpen = open === c.code
            const added = job.repairs.some((r) => r.fromCode === c.code)
            return (
              <li key={c.code} className="border-b border-line last:border-0">
                <button
                  onClick={() => setOpen(isOpen ? null : c.code)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                >
                  <Icon name="chevronRight" size={13} className={cx('shrink-0 text-ink-4 transition-transform duration-200', isOpen && 'rotate-90')} />
                  <span className="font-mono text-sm font-semibold tracking-tight">{c.code}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{c.title}</span>
                  <span className="hidden shrink-0 sm:block"><Badge tone="neutral">{c.system}</Badge></span>
                  <SeverityBadge severity={c.severity} />
                  {added && <Badge tone="ok" icon="check">On work order</Badge>}
                </button>

                {isOpen && (
                  <div className="animate-slide-up border-t border-line bg-surface px-4 py-4">
                    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                      <div>
                        <SectionLabel>What it means</SectionLabel>
                        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-ink-2">{c.detail}</p>

                        <div className="mt-4 rounded-md border border-line bg-raised p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <SectionLabel>Recommended repair</SectionLabel>
                              <h4 className="mt-1 text-md font-semibold">{c.suggestedRepair.title}</h4>
                            </div>
                            <Badge tone="neutral" mono>{c.code}</Badge>
                          </div>

                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <div>
                              <div className="text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Parts required</div>
                              <ul className="mt-1.5 space-y-1">
                                {c.suggestedRepair.parts.map((sp) => {
                                  const p = shop.parts.find((x) => x.partNumber === sp.partNumber)
                                  const free = p ? p.qty - p.reserved : 0
                                  return (
                                    <li key={sp.partNumber} className="flex items-center gap-2 text-xs">
                                      <span className="min-w-0 flex-1 truncate">{p?.name ?? sp.partNumber} <span className="text-ink-4">×{sp.qty}</span></span>
                                      <span className={cx('num shrink-0 text-2xs', free >= sp.qty ? 'text-ok' : 'text-bad')}>
                                        {free >= sp.qty ? `${free} in stock` : 'out of stock'}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                            <div>
                              <div className="text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Labour</div>
                              <div className="mt-1.5 space-y-1 text-xs">
                                <div className="flex justify-between"><span className="text-ink-3">Time</span><span className="num">{c.suggestedRepair.labourHours} h</span></div>
                                <div className="flex justify-between"><span className="text-ink-3">Rate</span><span className="num">{eur(shop.settings.labourRate)}/h</span></div>
                                <div className="flex justify-between border-t border-line pt-1 font-medium">
                                  <span>Total labour</span>
                                  <span className="num">{eur(c.suggestedRepair.labourHours * shop.settings.labourRate)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 border-t border-line pt-2.5 text-2xs leading-relaxed text-ink-3">
                            <span className="font-medium text-ink-2">Technician note. </span>{c.suggestedRepair.notes}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={added ? 'secondary' : 'primary'}
                              icon={added ? 'check' : 'plus'}
                              disabled={added || !shop.can('jobs.edit')}
                              onClick={() => {
                                shop.dispatch({ t: 'addRepairFromCode', jobId: job.id, code: c.code })
                                shop.toast({
                                  title: 'Repair added to work order',
                                  body: `${c.suggestedRepair.title} · parts checked against stock`,
                                  tone: 'ok',
                                  action: { label: 'View parts', to: `/app/jobs/${job.id}?tab=parts` },
                                })
                              }}
                            >
                              {added ? 'Added to work order' : 'Add repair to work order'}
                            </Button>
                            <Button size="sm" icon="note">Log as advisory</Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <SectionLabel>Freeze frame</SectionLabel>
                        <dl className="mt-1.5 rounded-md border border-line bg-raised">
                          {c.freezeFrame.map((f, i) => (
                            <div key={f.label} className={cx('flex items-baseline justify-between gap-3 px-3 py-1.5', i > 0 && 'border-t border-line')}>
                              <dt className="text-2xs text-ink-3">{f.label}</dt>
                              <dd className="num font-mono text-2xs">{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-2 flex items-center gap-1.5 text-2xs text-ink-4">
                          <Icon name="info" size={11} />
                          Captured at the moment the fault set
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ---------------- live data ---------------- */

function LiveData({ session }: { session: { liveData: { label: string; value: string; unit: string; nominal: string; ok: boolean }[] } }) {
  return (
    <Panel title="Live data" subtitle="Sampled at idle, engine at operating temperature" bodyClass="p-0">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {session.liveData.map((d, i) => (
          <div key={d.label} className={cx('px-4 py-3', i % 4 !== 0 && 'lg:border-l lg:border-line', i % 2 !== 0 && 'sm:border-l sm:border-line', i >= 4 && 'lg:border-t lg:border-line', i >= 2 && 'sm:border-t sm:border-line')}>
            <div className="flex items-center gap-1.5">
              <Dot tone={d.ok ? 'ok' : 'bad'} />
              <span className="truncate text-2xs text-ink-4">{d.label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={cx('num font-mono text-lg font-medium tracking-tight', !d.ok && 'text-bad')}>{d.value}</span>
              <span className="text-2xs text-ink-4">{d.unit}</span>
            </div>
            <div className="mt-0.5 font-mono text-2xs text-ink-4">nominal {d.nominal}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
