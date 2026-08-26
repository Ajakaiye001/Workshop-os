/* ============================================================
   WorkshopOS — domain model
   The Job (work order) is the spine. Every other entity either
   feeds it or is produced by it.
   ============================================================ */

export type ID = string

/* ---------- Access control ---------- */

export const PERMISSIONS = [
  'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.assign',
  'customers.view', 'customers.edit',
  'vehicles.view',
  'diagnostics.run',
  'parts.request', 'parts.approve', 'inventory.edit',
  'po.create', 'po.approve',
  'finance.view', 'invoices.create', 'invoices.edit', 'payments.process',
  'reports.view',
  'staff.manage', 'roles.manage', 'settings.manage',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export type RoleId =
  | 'owner' | 'manager' | 'advisor' | 'parts' | 'technician' | 'accountant' | 'receptionist'

export interface Role {
  id: RoleId
  name: string
  blurb: string
  /** Which experience this role lands in by default */
  home: 'admin' | 'tech'
  permissions: Permission[]
}

export const PERMISSION_GROUPS: { label: string; items: { key: Permission; label: string; hint: string }[] }[] = [
  {
    label: 'Jobs & workshop',
    items: [
      { key: 'jobs.view', label: 'View jobs', hint: 'See the job board and work order detail' },
      { key: 'jobs.create', label: 'Create jobs', hint: 'Open a work order from a booking or walk-in' },
      { key: 'jobs.edit', label: 'Edit jobs', hint: 'Change status, add repairs, edit labour' },
      { key: 'jobs.assign', label: 'Assign jobs', hint: 'Set technician, bay and priority' },
      { key: 'diagnostics.run', label: 'Run diagnostics', hint: 'Connect the scan tool and log fault codes' },
    ],
  },
  {
    label: 'Customers & vehicles',
    items: [
      { key: 'customers.view', label: 'View customers', hint: 'Customer directory and service history' },
      { key: 'customers.edit', label: 'Edit customers', hint: 'Create and update customer records' },
      { key: 'vehicles.view', label: 'View vehicles', hint: 'Vehicle profiles, VIN, mileage history' },
    ],
  },
  {
    label: 'Parts & purchasing',
    items: [
      { key: 'parts.request', label: 'Create parts request', hint: 'Request a part against a work order' },
      { key: 'parts.approve', label: 'Approve parts purchase', hint: 'Release a request to a supplier' },
      { key: 'inventory.edit', label: 'Edit inventory', hint: 'Adjust stock, thresholds and locations' },
      { key: 'po.create', label: 'Create purchase order', hint: 'Raise a PO with a supplier' },
      { key: 'po.approve', label: 'Approve purchase order', hint: 'Authorise spend and send to supplier' },
    ],
  },
  {
    label: 'Money',
    items: [
      { key: 'finance.view', label: 'View financial data', hint: 'Margins, revenue, outstanding balances' },
      { key: 'invoices.create', label: 'Create invoices', hint: 'Generate an invoice from a work order' },
      { key: 'invoices.edit', label: 'Edit invoices', hint: 'Adjust lines, discounts and VAT' },
      { key: 'payments.process', label: 'Process payments', hint: 'Record and reconcile payments' },
      { key: 'reports.view', label: 'View reports', hint: 'Analytics across the whole workshop' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { key: 'staff.manage', label: 'Manage staff', hint: 'Add people, set shifts, view attendance' },
      { key: 'roles.manage', label: 'Manage roles & permissions', hint: 'Change what each role can do' },
      { key: 'settings.manage', label: 'Manage workshop settings', hint: 'Rates, VAT, bays, branding' },
    ],
  },
]

/* ---------- People ---------- */

export interface Customer {
  id: ID
  name: string
  type: 'private' | 'fleet'
  company?: string
  phone: string
  email: string
  address: string
  city: string
  eircode: string
  since: string
  notes?: string
  preferredContact: 'phone' | 'email' | 'sms'
}

export interface StaffMember {
  id: ID
  name: string
  roleId: RoleId
  email: string
  phone: string
  initials: string
  hourlyRate?: number
  specialisms?: string[]
  shift: { start: string; end: string; days: number[] }
  onDuty: boolean
  hiredOn: string
  /** rolling 30-day stats */
  stats: { jobsCompleted: number; billedHours: number; availableHours: number; reworkRate: number; avgJobHours: number }
}

/* ---------- Vehicles ---------- */

export interface Vehicle {
  id: ID
  customerId: ID
  make: string
  model: string
  variant: string
  year: number
  reg: string
  vin: string
  fuel: 'Diesel' | 'Petrol' | 'Hybrid' | 'Electric'
  transmission: 'Manual' | 'Automatic'
  engine: string
  colour: string
  mileage: number
  nctDue: string
  lastServiced?: string
}

/* ---------- Parts, suppliers, stock ---------- */

export type StockStatus = 'in-stock' | 'low' | 'out' | 'ordered' | 'reserved'

export interface Supplier {
  id: ID
  name: string
  account: string
  contact: string
  phone: string
  email: string
  county: string
  leadTimeDays: number
  rating: number
  categories: string[]
  terms: string
  ytdSpend: number
}

export interface SupplierOffer {
  supplierId: ID
  price: number
  etaDays: number
  stock: number
}

export interface Part {
  id: ID
  partNumber: string
  name: string
  category: string
  brand: string
  fits: string[]
  primarySupplierId: ID
  offers: SupplierOffer[]
  cost: number
  price: number
  qty: number
  reserved: number
  onOrder: number
  reorderAt: number
  location: string
  usage90d: number
}

/* ---------- Diagnostics ---------- */

export type Severity = 'low' | 'medium' | 'high'

export interface DTC {
  code: string
  system: 'Engine' | 'Transmission' | 'Body' | 'Chassis' | 'Network' | 'Emissions' | 'Climate'
  title: string
  severity: Severity
  state: 'confirmed' | 'pending' | 'stored'
  freezeFrame: { label: string; value: string }[]
  detail: string
  suggestedRepair: {
    title: string
    labourHours: number
    parts: { partNumber: string; qty: number }[]
    notes: string
  }
}

export interface ModuleScan {
  name: string
  status: 'ok' | 'faults' | 'no-comms'
  faults: number
}

export interface DiagnosticSession {
  id: ID
  jobId: ID
  device: string
  startedAt: string
  completedAt?: string
  technicianId: ID
  modulesScanned: ModuleScan[]
  codes: DTC[]
  battery: number
  liveData: { label: string; value: string; unit: string; nominal: string; ok: boolean }[]
}

/* ---------- Work order ---------- */

export type JobStatus =
  | 'booked' | 'checked-in' | 'assigned' | 'diagnosing' | 'awaiting-approval'
  | 'awaiting-parts' | 'in-progress' | 'quality-check' | 'ready' | 'completed'

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export interface JobPart {
  id: ID
  partId: ID
  qty: number
  unitPrice: number
  status: StockStatus
  poId?: ID
  repairId?: ID
}

export interface LabourLine {
  id: ID
  description: string
  hours: number
  rate: number
  repairId?: ID
  technicianId?: ID
}

export interface Repair {
  id: ID
  title: string
  fromCode?: string
  description: string
  labourHours: number
  status: 'recommended' | 'approved' | 'declined' | 'in-progress' | 'done'
  createdAt: string
}

export interface TimelineEvent {
  id: ID
  at: string
  kind: 'status' | 'note' | 'parts' | 'diag' | 'money' | 'assign' | 'customer' | 'photo'
  title: string
  detail?: string
  actorId?: ID
}

export interface CheckIn {
  mileage: number
  fuelLevel: number
  keysReceived: boolean
  condition: { area: string; note: string }[]
  concerns: string
  photos: number
  at: string
  byId: ID
}

export interface JobNote {
  id: ID
  at: string
  byId: ID
  body: string
}

export interface Job {
  id: ID
  number: string
  customerId: ID
  vehicleId: ID
  technicianId?: ID
  bayId?: ID
  advisorId?: ID
  status: JobStatus
  priority: Priority
  serviceType: string
  concern: string
  bookedFor: string
  promisedFor: string
  createdAt: string
  completedAt?: string
  checkIn?: CheckIn
  diagnosticSessionId?: ID
  repairs: Repair[]
  parts: JobPart[]
  labour: LabourLine[]
  timeline: TimelineEvent[]
  estimateStatus: 'none' | 'draft' | 'sent' | 'approved' | 'declined'
  estimateSentAt?: string
  estimateDecidedAt?: string
  invoiceId?: ID
  discount?: number
  notes: JobNote[]
  waiting?: boolean
}

/* ---------- Purchasing ---------- */

export type POStatus = 'draft' | 'pending-approval' | 'approved' | 'ordered' | 'partial' | 'received' | 'rejected'

export interface POLine {
  id: ID
  partId: ID
  qty: number
  received: number
  unitCost: number
  jobId?: ID
}

export interface PurchaseOrder {
  id: ID
  number: string
  supplierId: ID
  status: POStatus
  lines: POLine[]
  shipping: number
  createdAt: string
  createdById: ID
  approvedById?: ID
  approvedAt?: string
  expectedAt?: string
  receivedAt?: string
  note?: string
}

/* ---------- Money ---------- */

export type InvoiceStatus = 'draft' | 'sent' | 'part-paid' | 'paid' | 'overdue' | 'void'

export interface InvoiceLine {
  id: ID
  kind: 'part' | 'labour' | 'fee'
  description: string
  detail?: string
  qty: number
  unitPrice: number
  vatRate: number
}

export interface Payment {
  id: ID
  at: string
  amount: number
  method: 'card' | 'cash' | 'transfer' | 'account'
  ref: string
}

export interface Invoice {
  id: ID
  number: string
  jobId: ID
  customerId: ID
  vehicleId: ID
  issuedAt: string
  dueAt: string
  status: InvoiceStatus
  lines: InvoiceLine[]
  discount: number
  payments: Payment[]
  poRef?: string
}

/* ---------- Workshop ---------- */

export interface Bay {
  id: ID
  name: string
  kind: 'General' | 'Diagnostic' | 'Lift' | 'Alignment' | 'NCT prep' | 'Tyres'
  jobId?: ID
  status: 'free' | 'occupied' | 'blocked'
  note?: string
}

export interface Booking {
  id: ID
  customerId: ID
  vehicleId: ID
  serviceType: string
  at: string
  durationMins: number
  jobId?: ID
  status: 'confirmed' | 'arrived' | 'no-show' | 'cancelled'
  channel: 'phone' | 'online' | 'walk-in' | 'fleet'
  notes?: string
}

export interface AppNotification {
  id: ID
  at: string
  kind: 'parts' | 'approval' | 'job' | 'stock' | 'money' | 'system'
  title: string
  body: string
  read: boolean
  link?: string
  forPermission?: Permission
}

export interface WorkshopSettings {
  name: string
  legalName: string
  address: string
  phone: string
  email: string
  vatNumber: string
  vatRate: number
  labourRate: number
  diagnosticRate: number
  openHours: string
}
