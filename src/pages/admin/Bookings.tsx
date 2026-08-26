import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import type { Booking } from '../../data/types'
import {
  Badge, Button, Callout, Field, Icon, Input, Modal, PageHeader, Panel, SectionLabel, Segmented, Select, Textarea, cx,
} from '../../components/ui'
import { Reg, StatusBadge } from '../../components/Bits'
import {
  CustomerFields, CustomerPicker, VehicleFields, buildCustomer, buildVehicle,
  emptyCustomer, emptyVehicle, validateCustomer, validateVehicle, NEW,
  type CustomerDraft, type Errors, type VehicleDraft,
} from '../../features/NewRecords'
import { dateLong, dateShort, time } from '../../lib/format'

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i)

export default function Bookings() {
  const shop = useShop()
  const nav = useNavigate()
  const [dayOffset, setDayOffset] = useState(0)
  const [view, setView] = useState<'day' | 'list'>('day')
  const [newOpen, setNewOpen] = useState(false)

  const day = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return d }, [dayOffset])
  const dayBookings = shop.bookings
    .filter((b) => new Date(b.at).toDateString() === day.toDateString())
    .sort((a, b) => a.at.localeCompare(b.at))

  const upcoming = [...shop.bookings]
    .filter((b) => new Date(b.at) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.at.localeCompare(b.at))

  const capacityHours = shop.staff.filter((s) => s.roleId === 'technician' && s.onDuty).length * 8
  const bookedHours = dayBookings.reduce((t, b) => t + b.durationMins / 60, 0)

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Bookings" sub={`${upcoming.length} upcoming · capacity ${Math.round(capacityHours)} technician hours a day`}>
        <Segmented value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'list', label: 'List' }]} />
        {shop.can('jobs.create') && <Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>New booking</Button>}
      </PageHeader>

      {view === 'day' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button size="sm" icon="chevronLeft" onClick={() => setDayOffset((d) => d - 1)} aria-label="Previous day" />
              <Button size="sm" onClick={() => setDayOffset(0)}>Today</Button>
              <Button size="sm" iconRight="chevronRight" onClick={() => setDayOffset((d) => d + 1)} aria-label="Next day" />
            </div>
            <div className="text-sm font-medium">{dateLong(day)}</div>
            <div className="ml-auto flex items-center gap-3 text-xs text-ink-3">
              <span className="num">{dayBookings.length} booked</span>
              <span className={cx('num', bookedHours > capacityHours && 'text-bad font-medium')}>
                {bookedHours.toFixed(1)} of {capacityHours} h
              </span>
            </div>
          </div>

          {bookedHours > capacityHours && (
            <Callout tone="warn" className="mb-3" title="Overbooked">
              {(bookedHours - capacityHours).toFixed(1)} hours more work than technician capacity for this day. Move something, or bring in cover.
            </Callout>
          )}

          <Panel bodyClass="p-0">
            <div className="divide-y divide-[color:var(--line)]">
              {HOURS.map((h) => {
                const slot = dayBookings.filter((b) => new Date(b.at).getHours() === h)
                return (
                  <div key={h} className="flex min-h-[62px]">
                    <div className="w-16 shrink-0 border-r border-line px-3 py-2">
                      <span className="num font-mono text-2xs text-ink-4">{String(h).padStart(2, '0')}:00</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2 p-2">
                      {slot.length === 0 ? (
                        <button onClick={() => setNewOpen(true)} className="flex-1 rounded border border-dashed border-line text-2xs text-ink-4 transition-colors hover:border-line-strong hover:text-ink-3">
                          Free
                        </button>
                      ) : slot.map((b) => {
                        const v = shop.getVehicle(b.vehicleId)!
                        const c = shop.getCustomer(b.customerId)!
                        const job = shop.getJob(b.jobId)
                        return (
                          <button
                            key={b.id}
                            onClick={() => job && nav(`/app/jobs/${job.id}`)}
                            className="min-w-0 basis-full rounded-md border border-line bg-surface p-2.5 text-left transition-all hover:shadow-sm sm:min-w-[220px] sm:basis-0 sm:flex-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{v.year} {v.make} {v.model}</div>
                                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                  <Reg value={v.reg} />
                                  <span className="num truncate font-mono text-2xs text-ink-4">{time(b.at)}</span>
                                </div>
                              </div>
                              <span className="flex shrink-0 items-center gap-1.5">
                                <span className="num font-mono text-2xs text-ink-4">{b.durationMins}m</span>
                                <Badge tone={b.channel === 'online' ? 'info' : b.channel === 'fleet' ? 'purple' : 'neutral'}>{b.channel}</Badge>
                              </span>
                            </div>
                            <div className="mt-1.5 flex min-w-0 items-center gap-2">
                              <span className="truncate text-2xs text-ink-3">{c.name} · {b.serviceType}</span>
                              {job && <span className="ml-auto shrink-0"><StatusBadge status={job.status} /></span>}
                            </div>
                            {b.notes && <div className="mt-1 text-2xs text-ink-4">{b.notes}</div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </>
      ) : (
        <Panel bodyClass="p-0">
          <ul>
            {upcoming.map((b) => {
              const v = shop.getVehicle(b.vehicleId)!
              const c = shop.getCustomer(b.customerId)!
              const job = shop.getJob(b.jobId)
              return (
                <li key={b.id}>
                  <button onClick={() => job && nav(`/app/jobs/${job.id}`)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-sunken">
                    <div className="w-24 shrink-0">
                      <div className="text-xs font-medium">{dateShort(b.at)}</div>
                      <div className="num font-mono text-2xs text-ink-4">{time(b.at)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{v.year} {v.make} {v.model}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Reg value={v.reg} />
                        <span className="truncate text-2xs text-ink-4">{c.name}</span>
                      </div>
                    </div>
                    <div className="hidden w-40 shrink-0 text-xs text-ink-3 sm:block">{b.serviceType}</div>
                    <Badge tone="neutral">{b.channel}</Badge>
                    {job ? <StatusBadge status={job.status} /> : <Badge tone="info">Confirmed</Badge>}
                    <Icon name="chevronRight" size={14} className="shrink-0 text-ink-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <NewBookingModal open={newOpen} onClose={() => setNewOpen(false)} day={day} />
    </div>
  )
}

/** Booking today defaults to the next half-hour, not an hour already gone. */
function defaultSlot(day: Date) {
  const open = 8, close = 18
  const isToday = day.toDateString() === new Date().toDateString()
  if (!isToday) return '09:00'
  const now = new Date()
  const mins = Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30
  const h = Math.floor(mins / 60)
  if (h < open) return '09:00'
  if (h >= close) return '09:00'
  return `${String(h).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

/** True when the chosen day+time is already behind us. */
function isPastSlot(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime() < Date.now()
}

const SERVICE_TYPES = [
  'Full service', 'Interim service', 'Diagnostic investigation', 'Brake service',
  'NCT preparation', 'Air conditioning service', 'Tyres and alignment', 'Clutch replacement',
]

function NewBookingModal({ open, onClose, day }: { open: boolean; onClose: () => void; day: Date }) {
  const shop = useShop()

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [service, setService] = useState('Full service')
  const [concern, setConcern] = useState('')
  const [when, setWhen] = useState(() => defaultSlot(day))
  const [duration, setDuration] = useState('90')
  const [channel, setChannel] = useState<Booking['channel']>('phone')
  const [cust, setCust] = useState<CustomerDraft>(emptyCustomer())
  const [veh, setVeh] = useState<VehicleDraft>(emptyVehicle())
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => { if (open) setWhen(defaultSlot(day)) }, [open, day])

  const creatingCustomer = customerId === NEW
  const ownedVehicles = shop.vehicles.filter((v) => v.customerId === customerId)
  const creatingVehicle = creatingCustomer || vehicleId === NEW

  function reset() {
    setCustomerId(''); setVehicleId(''); setService('Full service'); setConcern('')
    setWhen(defaultSlot(day)); setDuration('90'); setChannel('phone')
    setCust(emptyCustomer()); setVeh(emptyVehicle()); setErrors({})
  }

  function close() { reset(); onClose() }

  function submit() {
    const e: Errors = {}
    if (!customerId) e.customer = 'Pick a customer, or add a new one'
    if (creatingCustomer) {
      const ce = validateCustomer(cust)
      for (const k of Object.keys(ce)) e[`c_${k}`] = ce[k]
    }
    if (!creatingCustomer && !vehicleId) e.vehicle = 'Pick a vehicle, or add a new one'
    if (creatingVehicle && customerId) {
      const ve = validateVehicle(veh)
      for (const k of Object.keys(ve)) e[`v_${k}`] = ve[k]
    }
    setErrors(e)
    if (Object.keys(e).length) return

    const newCustomer = creatingCustomer ? buildCustomer(cust) : undefined
    const finalCustomerId = newCustomer?.id ?? customerId
    const newVehicle = creatingVehicle ? buildVehicle(veh, finalCustomerId) : undefined
    const finalVehicleId = newVehicle?.id ?? vehicleId

    const at = new Date(day)
    const [h, m] = when.split(':').map(Number)
    at.setHours(h, m, 0, 0)

    shop.dispatch({
      t: 'createBooking',
      newCustomer,
      newVehicle,
      customerId: finalCustomerId,
      vehicleId: finalVehicleId,
      serviceType: service,
      concern: concern.trim(),
      at: at.toISOString(),
      durationMins: Number(duration) || 60,
      channel,
    })

    const label = newVehicle ? `${newVehicle.make} ${newVehicle.model}` : shop.vehicleLabel(finalVehicleId)
    shop.toast({
      title: 'Booking confirmed',
      body: [
        label,
        newCustomer && 'new customer account opened',
        newVehicle && 'vehicle added to file',
      ].filter(Boolean).join(' · '),
      tone: 'ok',
      action: { label: 'Open job board', to: '/app/jobs' },
    })
    close()
  }

  const pick = (prefix: string): Errors =>
    Object.fromEntries(
      Object.entries(errors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]),
    )

  return (
    <Modal
      open={open} onClose={close} width="lg" title="New booking"
      sub="A work order is created with it, and the customer or vehicle can be new"
      footer={
        <>
          <Button size="sm" onClick={close}>Cancel</Button>
          <Button size="sm" variant="primary" icon="plus" onClick={submit}>Create booking and job</Button>
        </>
      }
    >
      <div className="space-y-4">
        <CustomerPicker
          value={customerId}
          onChange={(v) => { setCustomerId(v); setVehicleId(v === NEW ? NEW : ''); setErrors({}) }}
          error={errors.customer}
        />

        {creatingCustomer && (
          <div className="rounded-lg border border-line bg-surface p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-hv" />
              <SectionLabel>New customer</SectionLabel>
            </div>
            <CustomerFields draft={cust} set={(p) => setCust({ ...cust, ...p })} errors={pick('c_')} />
          </div>
        )}

        {!creatingCustomer && (
          <Field label="Vehicle" required error={errors.vehicle}>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId}>
              <option value="">{customerId ? 'Select a vehicle' : 'Choose a customer first'}</option>
              {customerId && <option value={NEW}>＋ Add a new vehicle</option>}
              {ownedVehicles.length > 0 && (
                <optgroup label={`On file (${ownedVehicles.length})`}>
                  {ownedVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.reg}</option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
        )}

        {customerId && ownedVehicles.length === 0 && !creatingCustomer && vehicleId !== NEW && (
          <Callout tone="info" title="No vehicles on this account yet">
            Choose <span className="font-medium">Add a new vehicle</span> above to put one on file as part of this booking.
          </Callout>
        )}

        {creatingVehicle && customerId && (
          <div className="rounded-lg border border-line bg-surface p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-hv" />
              <SectionLabel>New vehicle</SectionLabel>
            </div>
            <VehicleFields draft={veh} set={(p) => setVeh({ ...veh, ...p })} errors={pick('v_')} />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_110px_120px_130px]">
          <Field label="Service type">
            <Select value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Time">
            <Input type="time" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Duration">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {[30, 60, 90, 120, 180, 240, 480].map((d) => (
                <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} h`}</option>
              ))}
            </Select>
          </Field>
          <Field label="Booked via">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as Booking['channel'])}>
              <option value="phone">Phone</option>
              <option value="online">Online</option>
              <option value="walk-in">Walk-in</option>
              <option value="fleet">Fleet account</option>
            </Select>
          </Field>
        </div>

        {isPastSlot(day, when) && (
          <Callout tone="warn" title="That slot has already passed">
            The work order will open already behind its promised time. Move it to another day with the arrows behind
            this dialog, or pick a later time.
          </Callout>
        )}

        <Field label="Customer concern" hint="What the customer told you, in their words">
          <Textarea value={concern} onChange={(e) => setConcern(e.target.value)} rows={3} placeholder="e.g. Grinding noise from the front when braking, worse when cold" />
        </Field>

        <div className="rounded-md border border-line bg-surface px-3 py-2.5 text-2xs leading-relaxed text-ink-3">
          <span className="font-medium text-ink-2">Entered once, used everywhere. </span>
          {creatingCustomer || creatingVehicle
            ? 'The record you create here becomes the customer and vehicle on every future job, estimate and invoice.'
            : 'Registration, VIN, mileage and service history come from the vehicle record — the technician sees them on the job card without anyone retyping anything.'}
        </div>
      </div>
    </Modal>
  )
}
