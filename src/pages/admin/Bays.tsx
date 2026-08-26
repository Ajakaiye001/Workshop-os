import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { Job } from '../../data/types'
import { Button, Callout, Dot, Icon, Metric, MetricStrip, PageHeader, Panel, cx } from '../../components/ui'
import { PriorityTag, Reg, StatusBadge } from '../../components/Bits'
import { num, relative, time } from '../../lib/format'

export default function Bays() {
  const shop = useShop()
  const nav = useNavigate()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const canMove = shop.can('jobs.assign')
  const unassigned = shop.jobs.filter(
    (j) => !j.bayId && !['completed', 'ready'].includes(j.status) && new Date(j.bookedFor).toDateString() === new Date().toDateString(),
  )
  const occupied = shop.bays.filter((b) => b.status === 'occupied').length
  const usable = shop.bays.filter((b) => b.status !== 'blocked').length

  function drop(bayId?: string) {
    if (!dragging) return
    shop.dispatch({ t: 'moveJobToBay', jobId: dragging, bayId })
    const j = shop.getJob(dragging)!
    shop.toast({
      title: bayId ? `Moved to ${shop.getBay(bayId)?.name}` : 'Removed from bay',
      body: `${j.number} · ${shop.vehicleLabel(j.vehicleId)}`,
      tone: 'ok',
    })
    setDragging(null)
    setOver(null)
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader title="Workshop floor" sub={`${occupied} of ${usable} bays working · ${unassigned.length} vehicles waiting for a bay`}>
        <Button icon="grid" onClick={() => nav('/app/jobs?view=today')}>Job list</Button>
      </PageHeader>

      <MetricStrip className="mb-5 grid-cols-2 lg:grid-cols-4">
        <Metric label="Bays working" value={`${occupied}/${usable}`} tone={occupied / usable > 0.8 ? 'ok' : 'warn'} />
        <Metric label="Utilisation" value={Math.round((occupied / usable) * 100)} unit="%" spark={[62, 71, 68, 80, 74, 88, Math.round((occupied / usable) * 100)]} />
        <Metric label="Waiting for a bay" value={unassigned.length} tone={unassigned.length ? 'warn' : 'ok'} />
        <Metric label="Hours on the floor" value={num(shop.jobs.filter((j) => j.bayId).reduce((t, j) => t + j.labour.reduce((x, l) => x + l.hours, 0), 0), 1)} unit="h" />
      </MetricStrip>

      {canMove && (
        <Callout tone="neutral" icon="drag" className="mb-4" title="Drag a card onto a bay to move the vehicle">
          Moving a job updates the work order timeline and frees the bay it came from.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shop.bays.map((bay) => {
            const job = shop.getJob(bay.jobId)
            const isOver = over === bay.id
            return (
              <div
                key={bay.id}
                onDragOver={(e) => { if (canMove && bay.status !== 'blocked') { e.preventDefault(); setOver(bay.id) } }}
                onDragLeave={() => setOver(null)}
                onDrop={() => bay.status !== 'blocked' && drop(bay.id)}
                className={cx(
                  'flex min-h-[168px] flex-col rounded-lg border transition-all duration-150',
                  bay.status === 'blocked' ? 'border-dashed border-line bg-sunken' : 'border-line bg-raised',
                  isOver && 'border-[color:var(--hv)] ring-2 ring-[var(--hv-30)]',
                )}
              >
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{bay.name}</span>
                    <span className="text-2xs text-ink-4">{bay.kind}</span>
                  </div>
                  {bay.status === 'occupied' ? <Dot tone="ok" pulse /> : bay.status === 'blocked' ? <Dot tone="bad" /> : <span className="text-2xs text-ink-4">Free</span>}
                </div>

                <div className="flex flex-1 flex-col p-3">
                  {job ? <BayCard job={job} draggable={canMove} onDragStart={() => setDragging(job.id)} onOpen={() => nav(`/app/jobs/${job.id}`)} />
                    : bay.status === 'blocked' ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-center">
                        <Icon name="alert" size={16} className="mb-1.5 text-ink-4" />
                        <p className="text-2xs leading-relaxed text-ink-4">{bay.note}</p>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded border border-dashed border-line text-2xs text-ink-4">
                        {canMove ? 'Drop a vehicle here' : 'Empty'}
                      </div>
                    )}
                </div>
              </div>
            )
          })}
        </div>

        <Panel
          title="Waiting for a bay"
          subtitle={`${unassigned.length} vehicles`}
          bodyClass="p-3"
          className={cx(over === 'none' && 'ring-2 ring-[var(--hv-30)]')}
        >
          <div
            onDragOver={(e) => { if (canMove) { e.preventDefault(); setOver('none') } }}
            onDragLeave={() => setOver(null)}
            onDrop={() => drop(undefined)}
            className="min-h-[120px] space-y-2"
          >
            {unassigned.length === 0 ? (
              <div className="flex h-[120px] items-center justify-center rounded border border-dashed border-line text-2xs text-ink-4">
                Everything has a bay
              </div>
            ) : unassigned.map((j) => (
              <BayCard key={j.id} job={j} compact draggable={canMove} onDragStart={() => setDragging(j.id)} onOpen={() => nav(`/app/jobs/${j.id}`)} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function BayCard({ job, draggable, onDragStart, onOpen, compact }: {
  job: Job; draggable?: boolean; onDragStart: () => void; onOpen: () => void; compact?: boolean
}) {
  const shop = useShop()
  const v = shop.getVehicle(job.vehicleId)!
  const tech = shop.getStaff(job.technicianId)
  const late = new Date(job.promisedFor) < new Date() && !['ready', 'completed'].includes(job.status)

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cx(
        'group cursor-pointer rounded-md border border-line bg-surface p-2.5 transition-all duration-150 hover:shadow-sm active:scale-[0.99]',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="flex items-start gap-2">
        {draggable && <Icon name="drag" size={13} className="mt-0.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{v.make} {v.model}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Reg value={v.reg} />
            <PriorityTag priority={job.priority} compact />
          </div>
        </div>
      </div>
      <div className="mt-2"><StatusBadge status={job.status} live /></div>
      {!compact && (
        <div className="mt-2 space-y-0.5 border-t border-line pt-2 text-2xs text-ink-4">
          <div className="flex items-center gap-1.5">
            <Icon name="users" size={10} />
            <span className="truncate">{tech?.name ?? 'Unassigned'}</span>
          </div>
          <div className={cx('flex items-center gap-1.5', late && 'text-bad')}>
            <Icon name="clock" size={10} />
            <span>{late ? `Late · due ${time(job.promisedFor)}` : `Due ${time(job.promisedFor)}`}</span>
          </div>
        </div>
      )}
      {compact && <div className="mt-1.5 text-2xs text-ink-4">{job.number} · booked {relative(job.bookedFor)}</div>}
    </div>
  )
}
