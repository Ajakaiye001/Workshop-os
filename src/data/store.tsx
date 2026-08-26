import React, { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react'
import {
  BOOKINGS, DIAGNOSTICS, INVOICES, JOBS, NOTIFICATIONS, PURCHASE_ORDERS, SETTINGS, BAYS_SEEDED,
} from './seed'
import { CUSTOMERS, DTC_LIBRARY, PARTS, ROLES, STAFF, SUPPLIERS, VEHICLES, at } from './catalogue'
import type {
  AppNotification, Bay, Booking, Customer, DiagnosticSession, DTC, ID, Invoice, InvoiceLine, Job,
  JobStatus, Part, Payment, Permission, POStatus, Priority, PurchaseOrder, Role, RoleId,
  TimelineEvent, Vehicle,
} from './types'
import { invoiceTotals, jobTotals } from '../lib/money'

/* ============================ state ============================ */

export interface ShopState {
  jobs: Job[]
  parts: Part[]
  suppliers: typeof SUPPLIERS
  customers: typeof CUSTOMERS
  vehicles: typeof VEHICLES
  staff: typeof STAFF
  roles: Role[]
  bays: Bay[]
  bookings: Booking[]
  diagnostics: DiagnosticSession[]
  purchaseOrders: PurchaseOrder[]
  invoices: Invoice[]
  notifications: AppNotification[]
  settings: typeof SETTINGS
  /** the demo user currently signed in */
  currentStaffId: ID
}

const initialState: ShopState = {
  jobs: JOBS,
  parts: PARTS,
  suppliers: SUPPLIERS,
  customers: CUSTOMERS,
  vehicles: VEHICLES,
  staff: STAFF,
  roles: ROLES,
  bays: BAYS_SEEDED,
  bookings: BOOKINGS,
  diagnostics: DIAGNOSTICS,
  purchaseOrders: PURCHASE_ORDERS,
  invoices: INVOICES,
  notifications: NOTIFICATIONS,
  settings: SETTINGS,
  currentStaffId: 'stf-16', // Declan Shanahan, Owner
}

let seq = 5000
const nid = (p: string) => `${p}-${++seq}`
const nowISO = () => new Date().toISOString()

/** Callers that need to build a record before dispatching mint the id here. */
export const makeId = (prefix: string) => nid(prefix)

/* ============================ actions ============================ */

type Action =
  | { t: 'signIn'; staffId: ID }
  | { t: 'setRolePermissions'; roleId: RoleId; permissions: Permission[] }
  | { t: 'jobStatus'; jobId: ID; status: JobStatus; note?: string }
  | { t: 'jobAssign'; jobId: ID; technicianId?: ID; bayId?: ID; priority?: Priority }
  | { t: 'jobNote'; jobId: ID; body: string }
  | { t: 'jobDiscount'; jobId: ID; amount: number }
  | { t: 'diagStart'; jobId: ID }
  | { t: 'diagComplete'; jobId: ID }
  | { t: 'addRepairFromCode'; jobId: ID; code: string }
  | { t: 'repairStatus'; jobId: ID; repairId: ID; status: Job['repairs'][number]['status'] }
  | { t: 'addPart'; jobId: ID; partId: ID; qty: number; repairId?: ID }
  | { t: 'removePart'; jobId: ID; jobPartId: ID }
  | { t: 'addLabour'; jobId: ID; description: string; hours: number }
  | { t: 'sendEstimate'; jobId: ID }
  | { t: 'estimateDecision'; jobId: ID; approved: boolean }
  | { t: 'createPO'; supplierId: ID; lines: { partId: ID; qty: number; unitCost: number; jobId?: ID }[]; shipping: number; note?: string; submit: boolean }
  | { t: 'poStatus'; poId: ID; status: POStatus; reason?: string }
  | { t: 'poReceive'; poId: ID }
  | { t: 'adjustStock'; partId: ID; qty: number }
  | { t: 'editPart'; partId: ID; patch: Partial<Part> }
  | { t: 'createInvoice'; jobId: ID }
  | { t: 'invoiceStatus'; invoiceId: ID; status: Invoice['status'] }
  | { t: 'recordPayment'; invoiceId: ID; amount: number; method: Payment['method'] }
  | { t: 'moveJobToBay'; jobId: ID; bayId?: ID }
  | { t: 'readNotification'; id?: ID }
  | { t: 'pushNotification'; n: Omit<AppNotification, 'id' | 'at' | 'read'> }
  | { t: 'staffDuty'; staffId: ID; onDuty: boolean }
  | { t: 'addCustomer'; customer: Customer }
  | { t: 'addVehicle'; vehicle: Vehicle }
  | {
      t: 'createBooking'
      /** created in the same step when the caller is booking in a new account */
      newCustomer?: Customer
      newVehicle?: Vehicle
      customerId: ID
      vehicleId: ID
      serviceType: string
      concern: string
      at: string
      durationMins: number
      channel: Booking['channel']
      notes?: string
    }

/* ============================ reducer ============================ */

function log(job: Job, kind: TimelineEvent['kind'], title: string, detail?: string, actorId?: ID) {
  job.timeline.push({ id: nid('tl'), at: nowISO(), kind, title, detail, actorId })
}

function reducer(prev: ShopState, a: Action): ShopState {
  const s: ShopState = structuredClone(prev)
  const me = s.currentStaffId
  const job = (id: ID) => s.jobs.find((j) => j.id === id)!
  const part = (id: ID) => s.parts.find((p) => p.id === id)!

  switch (a.t) {
    case 'signIn':
      s.currentStaffId = a.staffId
      return s

    case 'setRolePermissions': {
      const r = s.roles.find((x) => x.id === a.roleId)
      if (r) r.permissions = a.permissions
      return s
    }

    case 'jobStatus': {
      const j = job(a.jobId)
      const from = j.status
      j.status = a.status
      log(j, 'status', `Status changed to ${STATUS_LABEL[a.status]}`, `from ${STATUS_LABEL[from]}${a.note ? ` · ${a.note}` : ''}`, me)
      if (a.status === 'completed') {
        j.completedAt = nowISO()
        j.parts.forEach((p) => { if (p.status === 'reserved') { const pt = part(p.partId); pt.qty = Math.max(0, pt.qty - p.qty); pt.reserved = Math.max(0, pt.reserved - p.qty); p.status = 'in-stock' } })
        const bay = s.bays.find((b) => b.jobId === j.id)
        if (bay) { bay.jobId = undefined; bay.status = 'free' }
      }
      if (a.status === 'ready') {
        s.notifications.unshift({ id: nid('nt'), at: nowISO(), kind: 'job', read: false, title: `${vehLabel(s, j.vehicleId)} is ready for collection`, body: `${j.number} passed quality check.`, link: `/app/jobs/${j.id}` })
      }
      return s
    }

    case 'jobAssign': {
      const j = job(a.jobId)
      const bits: string[] = []
      if (a.technicianId !== undefined) {
        j.technicianId = a.technicianId || undefined
        bits.push(s.staff.find((x) => x.id === a.technicianId)?.name ?? 'unassigned')
      }
      if (a.bayId !== undefined) {
        s.bays.forEach((b) => { if (b.jobId === j.id) { b.jobId = undefined; b.status = 'free' } })
        j.bayId = a.bayId || undefined
        const bay = s.bays.find((b) => b.id === a.bayId)
        if (bay) { bay.jobId = j.id; bay.status = 'occupied' }
        bits.push(bay?.name ?? 'no bay')
      }
      if (a.priority) { j.priority = a.priority; bits.push(`priority ${a.priority}`) }
      if (j.status === 'checked-in' && j.technicianId && j.bayId) j.status = 'assigned'
      log(j, 'assign', 'Assignment updated', bits.join(' · '), me)
      return s
    }

    case 'jobNote': {
      const j = job(a.jobId)
      j.notes.push({ id: nid('n'), at: nowISO(), byId: me, body: a.body })
      log(j, 'note', 'Note added', a.body.slice(0, 90), me)
      return s
    }

    case 'jobDiscount': {
      const j = job(a.jobId)
      j.discount = a.amount
      log(j, 'money', 'Discount applied', `€${a.amount.toFixed(2)}`, me)
      return s
    }

    case 'diagStart': {
      const j = job(a.jobId)
      j.status = 'diagnosing'
      if (!j.diagnosticSessionId) {
        const id = nid('diag')
        j.diagnosticSessionId = id
        s.diagnostics.push(buildAdHocSession(id, j.id, me))
      }
      log(j, 'diag', 'Diagnostic scan started', 'AutoScan Pro X1 connected', me)
      return s
    }

    case 'diagComplete': {
      const j = job(a.jobId)
      const d = s.diagnostics.find((x) => x.id === j.diagnosticSessionId)
      if (d) d.completedAt = nowISO()
      log(j, 'diag', 'Diagnostic scan completed', `${d?.codes.length ?? 0} fault codes stored across ${d?.modulesScanned.filter((m) => m.faults).length ?? 0} modules`, me)
      return s
    }

    case 'addRepairFromCode': {
      const j = job(a.jobId)
      const dtc = DTC_LIBRARY[a.code]
      if (!dtc) return s
      if (j.repairs.some((r) => r.fromCode === a.code)) return s
      const rid = nid('rep')
      j.repairs.push({
        id: rid, title: dtc.suggestedRepair.title, fromCode: a.code, description: dtc.detail,
        labourHours: dtc.suggestedRepair.labourHours, status: 'recommended', createdAt: nowISO(),
      })
      dtc.suggestedRepair.parts.forEach((sp) => {
        const p = s.parts.find((x) => x.partNumber === sp.partNumber)
        if (!p) return
        const free = p.qty - p.reserved
        j.parts.push({ id: nid('jp'), partId: p.id, qty: sp.qty, unitPrice: p.price, status: free >= sp.qty ? 'in-stock' : 'out', repairId: rid })
      })
      j.labour.push({ id: nid('lab'), description: dtc.suggestedRepair.title, hours: dtc.suggestedRepair.labourHours, rate: s.settings.labourRate, repairId: rid, technicianId: j.technicianId })
      if (j.estimateStatus === 'none') j.estimateStatus = 'draft'
      log(j, 'diag', 'Repair recommended', `${a.code} → ${dtc.suggestedRepair.title}`, me)
      return s
    }

    case 'repairStatus': {
      const j = job(a.jobId)
      const r = j.repairs.find((x) => x.id === a.repairId)
      if (r) { r.status = a.status; log(j, 'status', `Repair ${a.status}`, r.title, me) }
      return s
    }

    case 'addPart': {
      const j = job(a.jobId)
      const p = part(a.partId)
      const free = p.qty - p.reserved
      const status = free >= a.qty ? 'reserved' : 'out'
      if (status === 'reserved') p.reserved += a.qty
      j.parts.push({ id: nid('jp'), partId: p.id, qty: a.qty, unitPrice: p.price, status, repairId: a.repairId })
      log(j, 'parts', `${p.name} ×${a.qty} added`, status === 'reserved' ? `Reserved from ${p.location}` : 'Not in stock — needs ordering', me)
      return s
    }

    case 'removePart': {
      const j = job(a.jobId)
      const jp = j.parts.find((x) => x.id === a.jobPartId)
      if (jp) {
        if (jp.status === 'reserved') { const p = part(jp.partId); p.reserved = Math.max(0, p.reserved - jp.qty) }
        j.parts = j.parts.filter((x) => x.id !== a.jobPartId)
      }
      return s
    }

    case 'addLabour': {
      const j = job(a.jobId)
      j.labour.push({ id: nid('lab'), description: a.description, hours: a.hours, rate: s.settings.labourRate, technicianId: j.technicianId })
      log(j, 'money', 'Labour added', `${a.description} · ${a.hours} h`, me)
      return s
    }

    case 'sendEstimate': {
      const j = job(a.jobId)
      j.estimateStatus = 'sent'
      j.estimateSentAt = nowISO()
      j.status = 'awaiting-approval'
      const t = jobTotals(j, { partPrice: (id) => part(id).price, diagnosticFee: s.settings.diagnosticRate })
      log(j, 'customer', 'Estimate sent to customer', `€${t.total.toFixed(2)} incl. VAT · ${s.customers.find((c) => c.id === j.customerId)?.preferredContact}`, me)
      return s
    }

    case 'estimateDecision': {
      const j = job(a.jobId)
      j.estimateStatus = a.approved ? 'approved' : 'declined'
      j.estimateDecidedAt = nowISO()
      j.repairs.forEach((r) => { if (r.status === 'recommended') r.status = a.approved ? 'approved' : 'declined' })
      const needsParts = j.parts.some((p) => p.status === 'out' || p.status === 'ordered')
      j.status = a.approved ? (needsParts ? 'awaiting-parts' : 'in-progress') : 'quality-check'
      const t = jobTotals(j, { partPrice: (id) => part(id).price, diagnosticFee: s.settings.diagnosticRate })
      log(j, 'customer', a.approved ? 'Customer approved estimate' : 'Customer declined estimate', `€${t.total.toFixed(2)} incl. VAT`)
      s.notifications.unshift({
        id: nid('nt'), at: nowISO(), kind: 'approval', read: false,
        title: a.approved ? 'Customer approved repair' : 'Customer declined repair',
        body: `${s.customers.find((c) => c.id === j.customerId)?.name} · ${j.number} · €${t.total.toFixed(2)}`,
        link: `/app/jobs/${j.id}`,
      })
      return s
    }

    case 'createPO': {
      const n = s.purchaseOrders.length + 1
      const po: PurchaseOrder = {
        id: nid('po'),
        number: `PO-${1014 + n + 15}`,
        supplierId: a.supplierId,
        status: a.submit ? 'pending-approval' : 'draft',
        lines: a.lines.map((l) => ({ id: nid('pol'), partId: l.partId, qty: l.qty, received: 0, unitCost: l.unitCost, jobId: l.jobId })),
        shipping: a.shipping,
        createdAt: nowISO(),
        createdById: me,
        expectedAt: at(2, '11:00'),
        note: a.note,
      }
      s.purchaseOrders.unshift(po)
      a.lines.forEach((l) => {
        if (!l.jobId) return
        const j = job(l.jobId)
        const jp = j.parts.find((x) => x.partId === l.partId && (x.status === 'out' || x.status === 'ordered'))
        if (jp) { jp.status = 'ordered'; jp.poId = po.id }
        if (j.status === 'in-progress' || j.status === 'assigned' || j.status === 'diagnosing') j.status = 'awaiting-parts'
        log(j, 'parts', `Purchase order ${po.number} created`, `${s.suppliers.find((x) => x.id === a.supplierId)?.name} · ${a.lines.length} line${a.lines.length > 1 ? 's' : ''}`, me)
      })
      if (a.submit) {
        s.notifications.unshift({
          id: nid('nt'), at: nowISO(), kind: 'approval', read: false,
          title: `Purchase order ${po.number} needs approval`,
          body: `${s.suppliers.find((x) => x.id === a.supplierId)?.name} · €${a.lines.reduce((t, l) => t + l.qty * l.unitCost, 0).toFixed(2)}`,
          link: `/app/purchasing/${po.id}`, forPermission: 'po.approve',
        })
      }
      return s
    }

    case 'poStatus': {
      const po = s.purchaseOrders.find((p) => p.id === a.poId)!
      po.status = a.status
      if (a.status === 'approved') { po.approvedById = me; po.approvedAt = nowISO() }
      if (a.status === 'rejected') { po.note = a.reason || po.note }
      po.lines.forEach((l) => {
        if (!l.jobId) return
        const j = job(l.jobId)
        log(j, 'parts', `Purchase order ${po.number} ${a.status.replace('-', ' ')}`, undefined, me)
      })
      return s
    }

    case 'poReceive': {
      const po = s.purchaseOrders.find((p) => p.id === a.poId)!
      po.status = 'received'
      po.receivedAt = nowISO()
      po.lines.forEach((l) => {
        const p = part(l.partId)
        const outstanding = l.qty - l.received
        p.qty += outstanding
        p.onOrder = Math.max(0, p.onOrder - outstanding)
        l.received = l.qty
        if (l.jobId) {
          const j = job(l.jobId)
          const jp = j.parts.find((x) => x.poId === po.id && x.partId === l.partId)
          if (jp) { jp.status = 'reserved'; p.reserved += jp.qty }
          log(j, 'parts', `${p.name} received`, `Booked in from ${po.number} · ${p.location}`, me)
          if (j.status === 'awaiting-parts' && !j.parts.some((x) => x.status === 'out' || x.status === 'ordered')) {
            j.status = 'in-progress'
            log(j, 'status', 'All parts on hand — repair can start', undefined, me)
          }
          s.notifications.unshift({
            id: nid('nt'), at: nowISO(), kind: 'parts', read: false,
            title: `Parts arrived for ${vehLabel(s, j.vehicleId)}`,
            body: `${p.name} booked in against ${j.number}.`, link: `/app/jobs/${j.id}`,
          })
        }
      })
      return s
    }

    case 'adjustStock': {
      const p = part(a.partId)
      p.qty = Math.max(0, a.qty)
      return s
    }

    case 'editPart': {
      const p = part(a.partId)
      Object.assign(p, a.patch)
      return s
    }

    case 'createInvoice': {
      const j = job(a.jobId)
      if (j.invoiceId) return s
      const lines: InvoiceLine[] = []
      j.parts.forEach((jp) => {
        const p = part(jp.partId)
        lines.push({ id: nid('il'), kind: 'part', description: p.name, detail: `${p.brand} · ${p.partNumber}`, qty: jp.qty, unitPrice: jp.unitPrice, vatRate: s.settings.vatRate })
      })
      j.labour.forEach((l) => {
        lines.push({ id: nid('il'), kind: 'labour', description: l.description, detail: `${l.hours} h @ €${l.rate.toFixed(2)}/h`, qty: l.hours, unitPrice: l.rate, vatRate: s.settings.vatRate })
      })
      if (j.repairs.length) lines.push({ id: nid('il'), kind: 'fee', description: 'Diagnostic scan and report', detail: 'AutoScan Pro X1 · full module scan', qty: 1, unitPrice: s.settings.diagnosticRate, vatRate: s.settings.vatRate })
      lines.push({ id: nid('il'), kind: 'fee', description: 'Environmental and consumables charge', detail: 'Waste oil, cleaners, fasteners', qty: 1, unitPrice: 12.5, vatRate: s.settings.vatRate })
      const inv: Invoice = {
        id: nid('inv'), number: `INV-2026-${String(1200 + s.invoices.length).padStart(4, '0')}`,
        jobId: j.id, customerId: j.customerId, vehicleId: j.vehicleId,
        issuedAt: nowISO(), dueAt: at(30, '17:00'), status: 'draft', lines,
        discount: j.discount ?? 0, payments: [],
      }
      s.invoices.unshift(inv)
      j.invoiceId = inv.id
      log(j, 'money', `Invoice ${inv.number} generated`, `€${invoiceTotals(inv).total.toFixed(2)} incl. VAT`, me)
      return s
    }

    case 'invoiceStatus': {
      const inv = s.invoices.find((i) => i.id === a.invoiceId)!
      inv.status = a.status
      if (a.status === 'paid' && !inv.payments.length) {
        inv.payments.push({ id: nid('pay'), at: nowISO(), amount: invoiceTotals(inv).total, method: 'card', ref: `TRX-${60000 + s.invoices.length}` })
      }
      const j = s.jobs.find((x) => x.id === inv.jobId)
      if (j) log(j, 'money', `Invoice ${a.status}`, inv.number, me)
      return s
    }

    case 'recordPayment': {
      const inv = s.invoices.find((i) => i.id === a.invoiceId)!
      inv.payments.push({ id: nid('pay'), at: nowISO(), amount: a.amount, method: a.method, ref: `TRX-${60000 + seq}` })
      const paid = inv.payments.reduce((t, p) => t + p.amount, 0)
      inv.status = paid >= invoiceTotals(inv).total - 0.01 ? 'paid' : 'part-paid'
      const j = s.jobs.find((x) => x.id === inv.jobId)
      if (j) log(j, 'money', 'Payment received', `€${a.amount.toFixed(2)} · ${a.method}`, me)
      return s
    }

    case 'moveJobToBay': {
      const j = job(a.jobId)
      s.bays.forEach((b) => { if (b.jobId === j.id) { b.jobId = undefined; b.status = 'free' } })
      if (a.bayId) {
        const target = s.bays.find((b) => b.id === a.bayId)!
        if (target.jobId) { const other = job(target.jobId); other.bayId = undefined }
        target.jobId = j.id
        target.status = 'occupied'
        j.bayId = target.id
        log(j, 'assign', `Moved to ${target.name}`, undefined, me)
      } else {
        j.bayId = undefined
        log(j, 'assign', 'Removed from bay', undefined, me)
      }
      return s
    }

    case 'readNotification':
      s.notifications = s.notifications.map((n) => (!a.id || n.id === a.id ? { ...n, read: true } : n))
      return s

    case 'pushNotification':
      s.notifications.unshift({ ...a.n, id: nid('nt'), at: nowISO(), read: false })
      return s

    case 'staffDuty': {
      const st = s.staff.find((x) => x.id === a.staffId)
      if (st) st.onDuty = a.onDuty
      return s
    }

    case 'addCustomer':
      s.customers.unshift(a.customer)
      return s

    case 'addVehicle':
      s.vehicles.unshift(a.vehicle)
      return s

    case 'createBooking': {
      if (a.newCustomer && !s.customers.some((c) => c.id === a.newCustomer!.id)) s.customers.unshift(a.newCustomer)
      if (a.newVehicle && !s.vehicles.some((v) => v.id === a.newVehicle!.id)) s.vehicles.unshift(a.newVehicle)

      const nextNumber = Math.max(10450, ...s.jobs.map((j) => Number(j.number.replace('JOB-', '')) || 0)) + 1
      const jobId = nid('job')
      const promised = new Date(new Date(a.at).getTime() + a.durationMins * 60000).toISOString()

      const job: Job = {
        id: jobId,
        number: `JOB-${nextNumber}`,
        customerId: a.customerId,
        vehicleId: a.vehicleId,
        advisorId: me,
        status: 'booked',
        priority: 'normal',
        serviceType: a.serviceType,
        concern: a.concern,
        bookedFor: a.at,
        promisedFor: promised,
        createdAt: nowISO(),
        repairs: [],
        parts: [],
        labour: [],
        timeline: [{
          id: nid('tl'),
          at: nowISO(),
          kind: 'status',
          title: 'Booking created',
          detail: `${a.serviceType}${a.newCustomer ? ' · new customer account opened' : ''}${a.newVehicle ? ' · vehicle added to file' : ''}`,
          actorId: me,
        }],
        estimateStatus: 'none',
        notes: [],
      }
      s.jobs.push(job)

      s.bookings.push({
        id: nid('bkg'),
        customerId: a.customerId,
        vehicleId: a.vehicleId,
        serviceType: a.serviceType,
        at: a.at,
        durationMins: a.durationMins,
        jobId,
        status: 'confirmed',
        channel: a.channel,
        notes: a.notes,
      })

      return s
    }

    default:
      return prev
  }
}

function vehLabel(s: ShopState, vehicleId: ID) {
  const v = s.vehicles.find((x) => x.id === vehicleId)
  return v ? `${v.make} ${v.model}` : 'Vehicle'
}

function buildAdHocSession(id: ID, jobId: ID, techId: ID): DiagnosticSession {
  const codes: DTC[] = [DTC_LIBRARY.P0135, DTC_LIBRARY.C1275]
  return {
    id, jobId, device: 'AutoScan Pro X1', startedAt: nowISO(), technicianId: techId, battery: 12.6,
    modulesScanned: [
      { name: 'Engine Control Module', status: 'faults', faults: 1 },
      { name: 'Transmission Control', status: 'ok', faults: 0 },
      { name: 'ABS / Stability', status: 'faults', faults: 1 },
      { name: 'Airbag / Restraints', status: 'ok', faults: 0 },
      { name: 'Body Control Module', status: 'ok', faults: 0 },
      { name: 'Climate Control', status: 'ok', faults: 0 },
      { name: 'Instrument Cluster', status: 'ok', faults: 0 },
      { name: 'Gateway', status: 'ok', faults: 0 },
    ],
    codes,
    liveData: [
      { label: 'Coolant temperature', value: '90', unit: '°C', nominal: '85–95', ok: true },
      { label: 'Intake air temp', value: '29', unit: '°C', nominal: '15–45', ok: true },
      { label: 'MAF', value: '19.1', unit: 'g/s', nominal: '16–24', ok: true },
      { label: 'Rail pressure', value: '1,310', unit: 'bar', nominal: '1,250–1,450', ok: true },
      { label: 'EGR position', value: '34', unit: '%', nominal: '30–45', ok: true },
      { label: 'Fuel trim (short)', value: '+2.1', unit: '%', nominal: '−5 to +5', ok: true },
      { label: 'Battery voltage', value: '14.1', unit: 'V', nominal: '13.8–14.6', ok: true },
      { label: 'O2 heater current', value: '0.1', unit: 'A', nominal: '1.1–1.5', ok: false },
    ],
  }
}

export const STATUS_LABEL: Record<JobStatus, string> = {
  booked: 'Booked',
  'checked-in': 'Checked in',
  assigned: 'Assigned',
  diagnosing: 'Diagnosing',
  'awaiting-approval': 'Awaiting approval',
  'awaiting-parts': 'Awaiting parts',
  'in-progress': 'In progress',
  'quality-check': 'Quality check',
  ready: 'Ready for collection',
  completed: 'Completed',
}

/* ============================ toasts ============================ */

export interface Toast { id: string; title: string; body?: string; tone?: 'default' | 'ok' | 'bad'; action?: { label: string; to: string } }

/* ============================ context ============================ */

interface ShopCtx extends ShopState {
  dispatch: React.Dispatch<Action>
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  me: (typeof STAFF)[number]
  myRole: Role
  can: (p: Permission) => boolean
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  /* lookups */
  getJob: (id?: ID) => Job | undefined
  getCustomer: (id?: ID) => (typeof CUSTOMERS)[number] | undefined
  getVehicle: (id?: ID) => (typeof VEHICLES)[number] | undefined
  getStaff: (id?: ID) => (typeof STAFF)[number] | undefined
  getPart: (id?: ID) => Part | undefined
  getSupplier: (id?: ID) => (typeof SUPPLIERS)[number] | undefined
  getBay: (id?: ID) => Bay | undefined
  getInvoice: (id?: ID) => Invoice | undefined
  getDiag: (id?: ID) => DiagnosticSession | undefined
  totalsFor: (job: Job) => ReturnType<typeof jobTotals>
  vehicleLabel: (id?: ID) => string
}

const Ctx = createContext<ShopCtx | null>(null)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nid('toast')
    setToasts((prev) => [...prev, { ...t, id }])
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)), [])

  const value = useMemo<ShopCtx>(() => {
    const me = state.staff.find((s) => s.id === state.currentStaffId)!
    const myRole = state.roles.find((r) => r.id === me.roleId)!
    const getPart = (id?: ID) => state.parts.find((p) => p.id === id)
    return {
      ...state,
      dispatch,
      toasts,
      toast,
      dismissToast,
      me,
      myRole,
      theme,
      setTheme,
      can: (p) => myRole.permissions.includes(p),
      getJob: (id) => state.jobs.find((j) => j.id === id),
      getCustomer: (id) => state.customers.find((c) => c.id === id),
      getVehicle: (id) => state.vehicles.find((v) => v.id === id),
      getStaff: (id) => state.staff.find((x) => x.id === id),
      getPart,
      getSupplier: (id) => state.suppliers.find((x) => x.id === id),
      getBay: (id) => state.bays.find((b) => b.id === id),
      getInvoice: (id) => state.invoices.find((i) => i.id === id),
      getDiag: (id) => state.diagnostics.find((d) => d.id === id),
      totalsFor: (job) => jobTotals(job, { partPrice: (pid) => getPart(pid)?.price ?? 0, diagnosticFee: state.settings.diagnosticRate }),
      vehicleLabel: (id) => {
        const v = state.vehicles.find((x) => x.id === id)
        return v ? `${v.make} ${v.model}` : '—'
      },
    }
  }, [state, toasts, toast, dismissToast, theme, setTheme])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShop() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useShop must be used inside ShopProvider')
  return c
}
