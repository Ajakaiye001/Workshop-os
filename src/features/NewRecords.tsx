import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { makeId, useShop } from '../data/store'
import type { Customer, Vehicle } from '../data/types'
import { Button, Callout, Field, Input, Modal, SectionLabel, Select, cx } from '../components/ui'
import { Reg } from '../components/Bits'

/* ============================================================
   Shared "create as you go" pieces. A booking should never dead-end
   because the customer or the vehicle is not on file yet.
   ============================================================ */

export const NEW = '__new'

/* ---------------- customer ---------------- */

export interface CustomerDraft {
  name: string
  type: 'private' | 'fleet'
  company: string
  phone: string
  email: string
  address: string
  city: string
  eircode: string
  preferredContact: 'phone' | 'email' | 'sms'
}

export const emptyCustomer = (): CustomerDraft => ({
  name: '', type: 'private', company: '', phone: '', email: '',
  address: '', city: '', eircode: '', preferredContact: 'phone',
})

export type Errors = Record<string, string>

export function validateCustomer(d: CustomerDraft): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = 'A name is needed'
  if (!d.phone.trim()) e.phone = 'A contact number is needed'
  else if (!/^[\d\s+()-]{7,}$/.test(d.phone.trim())) e.phone = 'That does not look like a phone number'
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Check the email address'
  if (d.type === 'fleet' && !d.company.trim()) e.company = 'Fleet accounts need a company name'
  if (d.preferredContact === 'email' && !d.email.trim()) e.email = 'An email is needed to contact by email'
  return e
}

export function buildCustomer(d: CustomerDraft): Customer {
  return {
    id: makeId('cus'),
    name: d.name.trim(),
    type: d.type,
    company: d.company.trim() || undefined,
    phone: d.phone.trim(),
    email: d.email.trim(),
    address: d.address.trim(),
    city: d.city.trim(),
    eircode: d.eircode.trim().toUpperCase(),
    since: new Date().toISOString(),
    preferredContact: d.preferredContact,
    notes: d.type === 'fleet' ? 'Account customer — invoice monthly, PO number required on all jobs.' : undefined,
  }
}

export function CustomerFields({ draft, set, errors }: {
  draft: CustomerDraft; set: (patch: Partial<CustomerDraft>) => void; errors: Errors
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={draft.type === 'fleet' ? 'Contact name' : 'Name'} required error={errors.name}>
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Aoife Ní Bhriain" invalid={!!errors.name} autoFocus />
        </Field>
        <Field label="Account type">
          <Select value={draft.type} onChange={(e) => set({ type: e.target.value as CustomerDraft['type'] })}>
            <option value="private">Private</option>
            <option value="fleet">Fleet / trade</option>
          </Select>
        </Field>
      </div>

      {draft.type === 'fleet' && (
        <Field label="Company" required error={errors.company}>
          <Input value={draft.company} onChange={(e) => set({ company: e.target.value })} placeholder="e.g. Ballinasloe Couriers Ltd" invalid={!!errors.company} />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone" required error={errors.phone}>
          <Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="087 123 4567" inputMode="tel" invalid={!!errors.phone} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input value={draft.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.ie" inputMode="email" invalid={!!errors.email} />
        </Field>
      </div>

      <Field label="Address">
        <Input value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street or townland" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px]">
        <Field label="Town">
          <Input value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="Athlone" />
        </Field>
        <Field label="Eircode">
          <Input value={draft.eircode} onChange={(e) => set({ eircode: e.target.value.toUpperCase() })} placeholder="N37 KP03" className="font-mono uppercase" />
        </Field>
        <Field label="Contact by" hint="For estimates and updates">
          <Select value={draft.preferredContact} onChange={(e) => set({ preferredContact: e.target.value as CustomerDraft['preferredContact'] })}>
            <option value="phone">Phone</option>
            <option value="sms">Text message</option>
            <option value="email">Email</option>
          </Select>
        </Field>
      </div>
    </div>
  )
}

/* ---------------- vehicle ---------------- */

export interface VehicleDraft {
  reg: string
  make: string
  model: string
  variant: string
  year: string
  fuel: Vehicle['fuel']
  transmission: Vehicle['transmission']
  engine: string
  colour: string
  mileage: string
  vin: string
}

export const emptyVehicle = (): VehicleDraft => ({
  reg: '', make: '', model: '', variant: '', year: String(new Date().getFullYear() - 3),
  fuel: 'Diesel', transmission: 'Manual', engine: '', colour: '', mileage: '', vin: '',
})

/** 12-D-3456, 191-WH-9081, 231-C-1 — year, county, sequence. */
const REG_RE = /^\d{2,3}-[A-Z]{1,2}-\d{1,6}$/

export function validateVehicle(d: VehicleDraft): Errors {
  const e: Errors = {}
  const reg = d.reg.trim().toUpperCase()
  if (!reg) e.reg = 'A registration is needed'
  else if (!REG_RE.test(reg)) e.reg = 'Use the Irish format, e.g. 191-WH-9081'
  if (!d.make.trim()) e.make = 'A make is needed'
  if (!d.model.trim()) e.model = 'A model is needed'
  const y = Number(d.year)
  if (!y || y < 1970 || y > new Date().getFullYear() + 1) e.year = 'Check the year'
  if (d.mileage.trim() && !/^\d{1,7}$/.test(d.mileage.replace(/[,\s]/g, ''))) e.mileage = 'Numbers only'
  return e
}

export function buildVehicle(d: VehicleDraft, customerId: string): Vehicle {
  const nct = new Date()
  nct.setFullYear(nct.getFullYear() + 1)
  return {
    id: makeId('veh'),
    customerId,
    make: d.make.trim(),
    model: d.model.trim(),
    variant: d.variant.trim(),
    year: Number(d.year),
    reg: d.reg.trim().toUpperCase(),
    vin: d.vin.trim().toUpperCase() || 'Not on file',
    fuel: d.fuel,
    transmission: d.transmission,
    engine: d.engine.trim(),
    colour: d.colour.trim(),
    mileage: Number(d.mileage.replace(/[,\s]/g, '')) || 0,
    nctDue: nct.toISOString(),
  }
}

export function VehicleFields({ draft, set, errors }: {
  draft: VehicleDraft; set: (patch: Partial<VehicleDraft>) => void; errors: Errors
}) {
  const shop = useShop()
  const typed = draft.reg.trim().toUpperCase()
  const onFile = typed.length > 5 ? shop.vehicles.find((v) => v.reg.toUpperCase() === typed) : undefined
  const owner = shop.getCustomer(onFile?.customerId)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[190px_1fr_1fr]">
        <Field label="Registration" required error={errors.reg}>
          <Input
            value={draft.reg}
            onChange={(e) => set({ reg: e.target.value.toUpperCase() })}
            placeholder="191-WH-9081"
            className="font-mono uppercase tracking-[0.04em]"
            invalid={!!errors.reg}
          />
        </Field>
        <Field label="Make" required error={errors.make}>
          <Input value={draft.make} onChange={(e) => set({ make: e.target.value })} placeholder="Volkswagen" invalid={!!errors.make} />
        </Field>
        <Field label="Model" required error={errors.model}>
          <Input value={draft.model} onChange={(e) => set({ model: e.target.value })} placeholder="Passat" invalid={!!errors.model} />
        </Field>
      </div>

      {onFile && (
        <Callout tone="warn" icon="alert" title="That registration is already on file">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Reg value={onFile.reg} />
            is {onFile.year} {onFile.make} {onFile.model}, owned by {owner?.name ?? 'another customer'}. Booking it again
            here would create a duplicate record.
          </span>
        </Callout>
      )}

      <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr]">
        <Field label="Year" required error={errors.year}>
          <Input value={draft.year} onChange={(e) => set({ year: e.target.value })} inputMode="numeric" invalid={!!errors.year} />
        </Field>
        <Field label="Trim" hint="Optional">
          <Input value={draft.variant} onChange={(e) => set({ variant: e.target.value })} placeholder="Business 2.0 TDI" />
        </Field>
        <Field label="Colour" hint="Optional">
          <Input value={draft.colour} onChange={(e) => set({ colour: e.target.value })} placeholder="Pyrite Silver" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Fuel">
          <Select value={draft.fuel} onChange={(e) => set({ fuel: e.target.value as Vehicle['fuel'] })}>
            {(['Diesel', 'Petrol', 'Hybrid', 'Electric'] as const).map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </Field>
        <Field label="Gearbox">
          <Select value={draft.transmission} onChange={(e) => set({ transmission: e.target.value as Vehicle['transmission'] })}>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </Select>
        </Field>
        <Field label="Engine" hint="Optional">
          <Input value={draft.engine} onChange={(e) => set({ engine: e.target.value })} placeholder="2.0 TDI" />
        </Field>
        <Field label="Odometer" hint="km" error={errors.mileage}>
          <Input value={draft.mileage} onChange={(e) => set({ mileage: e.target.value })} inputMode="numeric" placeholder="124832" invalid={!!errors.mileage} />
        </Field>
      </div>

      <Field label="VIN" hint="Optional — the technician can scan it at check-in">
        <Input value={draft.vin} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} placeholder="WVWZZZ3CZKE118220" className="font-mono uppercase" />
      </Field>
    </div>
  )
}

/* ---------------- a customer picker that can create ---------------- */

export function CustomerPicker({ value, onChange, error }: {
  value: string; onChange: (v: string) => void; error?: string
}) {
  const shop = useShop()
  const sorted = [...shop.customers].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Field label="Customer" required error={error}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className={cx(error && 'border-bad')}>
        <option value="">Select a customer</option>
        <option value={NEW}>＋ Add a new customer</option>
        <optgroup label={`On file (${sorted.length})`}>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
          ))}
        </optgroup>
      </Select>
    </Field>
  )
}

/* ---------------- standalone add-customer modal ---------------- */

export function AddCustomerModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated?: (c: Customer) => void
}) {
  const shop = useShop()
  const nav = useNavigate()
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomer())
  const [errors, setErrors] = useState<Errors>({})
  const [withVehicle, setWithVehicle] = useState(true)
  const [veh, setVeh] = useState<VehicleDraft>(emptyVehicle())

  function reset() {
    setDraft(emptyCustomer())
    setVeh(emptyVehicle())
    setErrors({})
    setWithVehicle(true)
  }

  function submit() {
    const e = validateCustomer(draft)
    if (withVehicle) {
      const ve = validateVehicle(veh)
      for (const k of Object.keys(ve)) e[`v_${k}`] = ve[k]
    }
    setErrors(e)
    if (Object.keys(e).length) return

    const customer = buildCustomer(draft)
    shop.dispatch({ t: 'addCustomer', customer })
    if (withVehicle) shop.dispatch({ t: 'addVehicle', vehicle: buildVehicle(veh, customer.id) })

    shop.toast({
      title: `${customer.name} added`,
      body: withVehicle ? `Account opened with ${veh.make} ${veh.model} on file` : 'Account opened',
      tone: 'ok',
      action: { label: 'Open profile', to: `/app/customers/${customer.id}` },
    })
    onCreated?.(customer)
    reset()
    onClose()
    if (!onCreated) nav(`/app/customers/${customer.id}`)
  }

  const vErrors: Errors = Object.fromEntries(
    Object.entries(errors).filter(([k]) => k.startsWith('v_')).map(([k, v]) => [k.slice(2), v]),
  )

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      width="lg"
      title="Add a customer"
      sub="Everything entered here is reused on every future job, estimate and invoice"
      footer={
        <>
          <Button size="sm" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button size="sm" variant="primary" icon="plus" onClick={submit}>Add customer</Button>
        </>
      }
    >
      <div className="space-y-5">
        <CustomerFields draft={draft} set={(p) => setDraft({ ...draft, ...p })} errors={errors} />

        <div className="border-t border-line pt-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={withVehicle}
              onChange={(e) => setWithVehicle(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--hv)]"
            />
            <span>
              <span className="block text-sm font-medium">Add their vehicle now</span>
              <span className="block text-2xs text-ink-4">You can add more vehicles from the customer profile at any time.</span>
            </span>
          </label>

          {withVehicle && (
            <div className="mt-4">
              <SectionLabel className="mb-2">Vehicle</SectionLabel>
              <VehicleFields draft={veh} set={(p) => setVeh({ ...veh, ...p })} errors={vErrors} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- standalone add-vehicle modal ---------------- */

export function AddVehicleModal({ open, onClose, customerId }: {
  open: boolean; onClose: () => void; customerId: string
}) {
  const shop = useShop()
  const [veh, setVeh] = useState<VehicleDraft>(emptyVehicle())
  const [errors, setErrors] = useState<Errors>({})
  const customer = shop.getCustomer(customerId)

  function submit() {
    const e = validateVehicle(veh)
    setErrors(e)
    if (Object.keys(e).length) return
    const vehicle = buildVehicle(veh, customerId)
    shop.dispatch({ t: 'addVehicle', vehicle })
    shop.toast({
      title: `${vehicle.make} ${vehicle.model} added`,
      body: `${vehicle.reg} is now on file for ${customer?.name}`,
      tone: 'ok',
      action: { label: 'Open vehicle', to: `/app/vehicles/${vehicle.id}` },
    })
    setVeh(emptyVehicle())
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { setErrors({}); onClose() }}
      width="lg"
      title="Add a vehicle"
      sub={customer ? `For ${customer.name}` : undefined}
      footer={
        <>
          <Button size="sm" onClick={() => { setErrors({}); onClose() }}>Cancel</Button>
          <Button size="sm" variant="primary" icon="plus" onClick={submit}>Add vehicle</Button>
        </>
      }
    >
      <VehicleFields draft={veh} set={(p) => setVeh({ ...veh, ...p })} errors={errors} />
    </Modal>
  )
}
