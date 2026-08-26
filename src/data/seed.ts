import { at, BAYS, CUSTOMERS, DTC_LIBRARY, partByNumber, PARTS, ri, STAFF, SUPPLIERS, TECHS, VEHICLES } from './catalogue'
import type {
  AppNotification, Bay, Booking, DiagnosticSession, Invoice, InvoiceLine, Job, JobPart,
  JobStatus, LabourLine, Priority, PurchaseOrder, Repair, TimelineEvent, WorkshopSettings,
} from './types'

export const SETTINGS: WorkshopSettings = {
  name: 'Shannonside Motorworks',
  legalName: 'Shannonside Motorworks Ltd',
  address: 'Unit 12, Monksland Industrial Estate, Athlone, Co. Roscommon, N37 KP03',
  phone: '090 649 7720',
  email: 'service@shannonsidemotorworks.ie',
  vatNumber: 'IE 3841207 QH',
  vatRate: 0.23,
  labourRate: 75,
  diagnosticRate: 95,
  openHours: 'Mon–Fri 08:00–18:00 · Sat 09:00–13:00',
}

const uid = (() => { let n = 1000; return (p: string) => `${p}-${++n}` })()

/* ---------------- job construction helpers ---------------- */

const STAGE_ORDER: JobStatus[] = [
  'booked', 'checked-in', 'assigned', 'diagnosing', 'awaiting-approval',
  'awaiting-parts', 'in-progress', 'quality-check', 'ready', 'completed',
]

const STAGE_EVENT: Record<JobStatus, { title: string; kind: TimelineEvent['kind']; detail?: string }> = {
  booked: { title: 'Booking created', kind: 'status' },
  'checked-in': { title: 'Vehicle checked in', kind: 'status' },
  assigned: { title: 'Technician and bay assigned', kind: 'assign' },
  diagnosing: { title: 'Diagnostic scan started', kind: 'diag' },
  'awaiting-approval': { title: 'Estimate sent to customer', kind: 'customer' },
  'awaiting-parts': { title: 'Parts requested', kind: 'parts' },
  'in-progress': { title: 'Repair started', kind: 'status' },
  'quality-check': { title: 'Moved to quality check', kind: 'status' },
  ready: { title: 'Ready for collection', kind: 'status' },
  completed: { title: 'Job completed and handed over', kind: 'status' },
}

interface JobSpec {
  n: number
  cus: number
  veh: number
  st: JobStatus
  tech?: number
  bay?: number
  pr?: Priority
  svc: string
  concern: string
  /** day offset for the booking */
  day?: number
  start?: string
  codes?: string[]
  /** extra parts beyond those implied by codes: [partNumber, qty, status] */
  parts?: [string, number, JobPart['status']][]
  labour?: [string, number][]
  est?: Job['estimateStatus']
  waiting?: boolean
  advisor?: number
}

function clockFor(index: number, base: string) {
  const [h, m] = base.split(':').map(Number)
  const total = h * 60 + m + index * 17
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildJob(s: JobSpec): Job {
  const stageIdx = STAGE_ORDER.indexOf(s.st)
  const day = s.day ?? 0
  const start = s.start ?? '08:45'
  const timeline: TimelineEvent[] = []
  const repairs: Repair[] = []
  const parts: JobPart[] = []
  const labour: LabourLine[] = []
  const techId = s.tech ? `stf-${s.tech}` : undefined

  // stages reached
  const reached = STAGE_ORDER.slice(0, stageIdx + 1).filter((st) => {
    if (st === 'diagnosing' && !s.codes) return false
    if (st === 'awaiting-approval' && !s.codes && s.st !== 'awaiting-approval') return false
    if (st === 'awaiting-parts' && !(s.parts?.length || s.codes?.length)) return false
    return true
  })

  reached.forEach((st, i) => {
    const ev = STAGE_EVENT[st]
    timeline.push({
      id: uid('tl'),
      at: at(day, clockFor(i, start)),
      kind: ev.kind,
      title: ev.title,
      detail: st === 'assigned' && techId
        ? `${STAFF.find((x) => x.id === techId)?.name} · ${BAYS.find((b) => b.id === `bay-${s.bay}`)?.name ?? 'unassigned bay'}`
        : undefined,
      actorId: techId,
    })
  })

  // repairs + parts derived from diagnostic codes
  s.codes?.forEach((code, i) => {
    const dtc = DTC_LIBRARY[code]
    if (!dtc) return
    const rid = uid('rep')
    const approved = stageIdx >= STAGE_ORDER.indexOf('awaiting-parts')
    repairs.push({
      id: rid,
      title: dtc.suggestedRepair.title,
      fromCode: code,
      description: dtc.detail,
      labourHours: dtc.suggestedRepair.labourHours,
      status: s.st === 'completed' || s.st === 'ready' ? 'done'
        : s.st === 'in-progress' || s.st === 'quality-check' ? 'in-progress'
        : approved ? 'approved' : 'recommended',
      createdAt: at(day, clockFor(reached.length + i, start)),
    })
    dtc.suggestedRepair.parts.forEach((p) => {
      const part = partByNumber(p.partNumber)
      parts.push({
        id: uid('jp'),
        partId: part.id,
        qty: p.qty,
        unitPrice: part.price,
        status: part.qty >= p.qty ? (stageIdx >= 6 ? 'reserved' : 'in-stock') : 'ordered',
        repairId: rid,
      })
    })
    labour.push({
      id: uid('lab'),
      description: dtc.suggestedRepair.title,
      hours: dtc.suggestedRepair.labourHours,
      rate: SETTINGS.labourRate,
      repairId: rid,
      technicianId: techId,
    })
  })

  s.parts?.forEach(([pn, qty, status]) => {
    const part = partByNumber(pn)
    parts.push({ id: uid('jp'), partId: part.id, qty, unitPrice: part.price, status })
  })
  s.labour?.forEach(([desc, hrs]) => {
    labour.push({ id: uid('lab'), description: desc, hours: hrs, rate: SETTINGS.labourRate, technicianId: techId })
  })

  const veh = VEHICLES[s.veh - 1]
  const checkIn = stageIdx >= 1 ? {
    mileage: veh.mileage,
    fuelLevel: [0.25, 0.5, 0.75, 0.4, 0.6][s.n % 5],
    keysReceived: true,
    condition: [
      { area: 'Front bumper', note: s.n % 3 === 0 ? 'Scuff to lower left corner, pre-existing' : 'No damage noted' },
      { area: 'Wheels', note: s.n % 4 === 0 ? 'Kerb rash, nearside front alloy' : 'No damage noted' },
      { area: 'Interior', note: 'Clean, no items of value left in vehicle' },
      { area: 'Tyres', note: s.n % 5 === 0 ? 'Nearside rear at 2.4 mm — advise' : 'All above 4 mm' },
    ],
    concerns: s.concern,
    photos: 4 + (s.n % 5),
    at: at(day, clockFor(1, start)),
    byId: `stf-${s.advisor ?? 15}`,
  } : undefined

  return {
    id: `job-${s.n}`,
    number: `JOB-${10450 + s.n}`,
    customerId: `cus-${s.cus}`,
    vehicleId: `veh-${s.veh}`,
    technicianId: techId,
    bayId: s.bay ? `bay-${s.bay}` : undefined,
    advisorId: `stf-${s.advisor ?? 10}`,
    status: s.st,
    priority: s.pr ?? 'normal',
    serviceType: s.svc,
    concern: s.concern,
    bookedFor: at(day, start),
    promisedFor: at(day, s.st === 'completed' ? '16:00' : '17:30'),
    createdAt: at(day - (day === 0 ? 3 : 2), '11:20'),
    completedAt: s.st === 'completed' ? at(day, '15:40') : undefined,
    checkIn,
    diagnosticSessionId: s.codes ? `diag-${s.n}` : undefined,
    repairs,
    parts,
    labour,
    timeline,
    estimateStatus: s.est ?? (s.codes ? (stageIdx >= 5 ? 'approved' : stageIdx === 4 ? 'sent' : 'draft') : 'none'),
    estimateSentAt: stageIdx >= 4 ? at(day, clockFor(reached.length + 1, start)) : undefined,
    estimateDecidedAt: stageIdx >= 5 ? at(day, clockFor(reached.length + 2, start)) : undefined,
    notes: [],
    waiting: s.waiting,
  }
}

/* ---------------- the live board ---------------- */

const SPECS: JobSpec[] = [
  {
    n: 32, cus: 1, veh: 1, st: 'awaiting-parts', tech: 1, bay: 4, pr: 'high', day: 0, start: '08:55',
    svc: 'Diagnostic investigation',
    concern: 'Engine management light on. Customer reports loss of power on the motorway and a smell of fuel at idle.',
    codes: ['P0401', 'P0302', 'B1234'], advisor: 10,
  },
  {
    n: 33, cus: 4, veh: 6, st: 'in-progress', tech: 3, bay: 1, pr: 'urgent', day: 0, start: '07:50',
    svc: 'Brake overhaul',
    concern: 'Grinding from the front under braking. Van is off the road until fixed — courier fleet.',
    parts: [['34116878876', 1, 'reserved'], ['34116864046', 1, 'reserved'], ['ATE-DOT4-1L', 1, 'in-stock']],
    labour: [['Front pads and discs, both sides', 2.2], ['Brake fluid change and bleed', 0.8]],
    est: 'approved',
  },
  {
    n: 34, cus: 8, veh: 8, st: 'awaiting-approval', tech: 2, bay: 3, pr: 'normal', day: 0, start: '09:10',
    svc: 'Diagnostic investigation',
    concern: 'Intermittent glow plug light and rough running when cold.',
    codes: ['P0087'], advisor: 11,
  },
  {
    n: 35, cus: 3, veh: 4, st: 'diagnosing', tech: 8, bay: 3, pr: 'normal', day: 0, start: '09:30',
    svc: 'Diagnostic investigation',
    concern: 'ABS light comes on above 50 km/h then clears when restarted.',
    codes: ['C1275'],
  },
  {
    n: 36, cus: 12, veh: 17, st: 'ready', tech: 7, bay: 6, pr: 'normal', day: 0, start: '08:15',
    svc: 'Full service',
    concern: 'Annual service. Also asked us to look at the air conditioning, not as cold as it was.',
    parts: [['11427566327', 1, 'in-stock'], ['13717811026', 1, 'in-stock'], ['64319313519', 1, 'in-stock'], ['CAST-5W30-5L', 1, 'in-stock']],
    labour: [['Full service, oil and three filters', 1.8], ['Air conditioning performance check and re-gas', 1.0]],
    est: 'approved',
  },
  {
    n: 37, cus: 5, veh: 7, st: 'awaiting-parts', tech: 6, bay: 2, pr: 'high', day: 0, start: '08:05',
    svc: 'Turbo investigation',
    concern: 'Whistle under acceleration and engine goes into limp mode on a hill.',
    codes: ['P0234'],
  },
  {
    n: 38, cus: 9, veh: 13, st: 'in-progress', tech: 4, bay: 5, pr: 'normal', day: 0, start: '08:30',
    svc: 'Clutch replacement',
    concern: 'Clutch slipping in fifth and sixth. Judder from a standstill.',
    parts: [['21207603248', 1, 'reserved'], ['21207572843', 1, 'ordered']],
    labour: [['Clutch and dual mass flywheel replacement', 6.5]],
    est: 'approved',
  },
  {
    n: 39, cus: 16, veh: 21, st: 'checked-in', pr: 'normal', day: 0, start: '10:00',
    svc: 'NCT preparation',
    concern: 'NCT due in three weeks, wants it checked over first.',
    advisor: 15,
  },
  {
    n: 40, cus: 7, veh: 10, st: 'in-progress', tech: 9, bay: 7, pr: 'normal', day: 0, start: '09:00',
    svc: 'Tyres and alignment',
    concern: 'Pulling to the left and the fronts are worn on the inside edge.',
    parts: [['CONT-2055516', 2, 'reserved']],
    labour: [['Two front tyres fitted and balanced', 0.8], ['Four wheel alignment', 1.2]],
    est: 'approved',
  },
  {
    n: 41, cus: 14, veh: 19, st: 'awaiting-parts', tech: 1, bay: 4, pr: 'normal', day: 0, start: '11:20',
    svc: 'Diagnostic investigation',
    concern: 'DPF light on. Mostly short trips around town.',
    codes: ['P2002'],
  },
  {
    n: 42, cus: 2, veh: 3, st: 'completed', tech: 2, bay: 6, pr: 'normal', day: 0, start: '08:00',
    svc: 'Hybrid health check',
    concern: 'Hybrid system check and interim service.',
    parts: [['11427566327', 1, 'in-stock'], ['64319313519', 1, 'in-stock']],
    labour: [['Hybrid battery health check and interim service', 1.5]],
    est: 'approved',
  },
  {
    n: 43, cus: 11, veh: 15, st: 'quality-check', tech: 3, bay: 1, pr: 'normal', day: 0, start: '08:20',
    svc: 'Suspension repair',
    concern: 'Knocking from the front over speed bumps.',
    parts: [['31126768987', 2, 'reserved'], ['31356765933', 2, 'in-stock']],
    labour: [['Front lower arms and drop links, both sides', 3.4]],
    est: 'approved',
  },
  {
    n: 44, cus: 18, veh: 23, st: 'assigned', tech: 5, bay: 5, pr: 'low', day: 0, start: '13:00',
    svc: 'Interim service',
    concern: 'First service since purchase. No faults reported.',
  },
  {
    n: 45, cus: 20, veh: 25, st: 'awaiting-approval', tech: 6, bay: 2, pr: 'normal', day: 0, start: '09:45',
    svc: 'Cooling system investigation',
    concern: 'Heater blowing cold on short journeys and the temperature gauge sits low.',
    codes: ['P0128'], advisor: 11,
  },
  {
    n: 46, cus: 6, veh: 9, st: 'ready', tech: 7, bay: 6, pr: 'normal', day: 0, start: '08:10',
    svc: 'Full service',
    concern: 'Service and NCT prep.',
    parts: [['11427566327', 1, 'in-stock'], ['13717811026', 1, 'in-stock'], ['13327811227', 1, 'in-stock'], ['CAST-5W30-5L', 1, 'in-stock']],
    labour: [['Full service with fuel filter', 2.2]],
    est: 'approved',
  },
  {
    n: 47, cus: 13, veh: 18, st: 'in-progress', tech: 2, bay: 3, pr: 'high', day: 0, start: '10:15',
    svc: 'Electrical fault',
    concern: 'Car would not start twice this week. Dashboard lights flickering.',
    codes: ['U0100'],
  },
  {
    n: 48, cus: 15, veh: 20, st: 'booked', pr: 'normal', day: 0, start: '14:30',
    svc: 'Air conditioning service',
    concern: 'A/C not cold. Booked in for a leak test.',
  },
  {
    n: 49, cus: 17, veh: 22, st: 'in-progress', tech: 4, bay: 5, pr: 'normal', day: 0, start: '09:20',
    svc: 'Timing chain',
    concern: 'Rattle on cold start for a couple of seconds.',
    parts: [['11318618317', 1, 'reserved'], ['CAST-5W30-5L', 1, 'in-stock']],
    labour: [['Timing chain kit replacement', 7.5]],
    est: 'approved',
  },
  {
    n: 50, cus: 19, veh: 24, st: 'awaiting-parts', tech: 1, bay: 4, pr: 'normal', day: 0, start: '11:00',
    svc: 'Emissions fault',
    concern: 'Engine light on, failed emissions at the NCT.',
    codes: ['P0135'],
  },
  {
    n: 51, cus: 10, veh: 14, st: 'in-progress', tech: 9, bay: 7, pr: 'normal', day: 0, start: '12:00',
    svc: 'Brake service',
    concern: 'Squealing from the rear.',
    parts: [['34216873093', 1, 'in-stock'], ['34216864047', 1, 'reserved']],
    labour: [['Rear pads and discs', 1.8]],
    est: 'approved',
  },
  {
    n: 52, cus: 1, veh: 2, st: 'booked', pr: 'normal', day: 1, start: '09:00',
    svc: 'Full service',
    concern: 'Second car, due its annual service.',
  },
  {
    n: 53, cus: 4, veh: 7, st: 'booked', pr: 'high', day: 1, start: '08:00',
    svc: 'Diagnostic investigation',
    concern: 'Fleet van — intermittent limp mode reported by driver.',
  },
  {
    n: 54, cus: 11, veh: 16, st: 'booked', pr: 'normal', day: 2, start: '10:30',
    svc: 'Commercial service',
    concern: 'Scheduled fleet service, 120k interval.',
  },
  {
    n: 55, cus: 7, veh: 11, st: 'completed', tech: 5, bay: 6, pr: 'normal', day: 0, start: '08:40',
    svc: 'Interim service',
    concern: 'Oil and filter, plus a wiper blade change.',
    parts: [['11427566327', 1, 'in-stock'], ['CAST-5W30-5L', 1, 'in-stock'], ['61612163750', 1, 'in-stock']],
    labour: [['Interim service', 1.0]],
    est: 'approved',
  },
]

/* --- historical completed jobs, one per invoice --- */

const HIST_TEMPLATES: { svc: string; concern: string; parts: [string, number][]; labour: [string, number][] }[] = [
  { svc: 'Full service', concern: 'Annual service.', parts: [['11427566327', 1], ['13717811026', 1], ['64319313519', 1], ['CAST-5W30-5L', 1]], labour: [['Full service', 1.8]] },
  { svc: 'Brake service', concern: 'Brakes felt spongy.', parts: [['34116878876', 1], ['ATE-DOT4-1L', 1]], labour: [['Front pads, fluid change', 1.6]] },
  { svc: 'Battery and charging', concern: 'Slow to start in the mornings.', parts: [['VAR-F21-AGM', 1]], labour: [['Battery replacement and coding', 0.7]] },
  { svc: 'Suspension repair', concern: 'Clunk from the rear.', parts: [['31316786001', 1], ['31356765933', 2]], labour: [['Front shocks and drop links', 3.0]] },
  { svc: 'Cooling system repair', concern: 'Losing coolant.', parts: [['11517586925', 1], ['FEBI-G12-5L', 1]], labour: [['Water pump and coolant', 3.2]] },
  { svc: 'Tyres', concern: 'Two front tyres needed.', parts: [['MICH-2254517', 2]], labour: [['Fit and balance, alignment check', 1.0]] },
  { svc: 'Air conditioning', concern: 'A/C not cold.', parts: [['64509239992', 1]], labour: [['Condenser replacement and re-gas', 2.6]] },
  { svc: 'Emissions repair', concern: 'Engine light on.', parts: [['11787589121', 1]], labour: [['Lambda sensor replacement', 1.0]] },
  { svc: 'Interim service', concern: 'Oil and filter change.', parts: [['11427566327', 1], ['CAST-5W30-5L', 1]], labour: [['Interim service', 1.0]] },
  { svc: 'Steering repair', concern: 'Knocking on full lock.', parts: [['32106765235', 2]], labour: [['Track rod ends and alignment', 2.2]] },
  { svc: 'Glow plugs', concern: 'Hard starting when cold.', parts: [['12232249603', 1]], labour: [['Glow plug set replacement', 2.0]] },
  { svc: 'Full service', concern: 'Service before a long trip.', parts: [['11427566327', 1], ['13717811026', 1], ['13327811227', 1], ['CAST-5W30-5L', 1]], labour: [['Full service with fuel filter', 2.2]] },
  { svc: 'Alternator', concern: 'Battery light on.', parts: [['12317605479', 1]], labour: [['Alternator replacement', 2.4]] },
  { svc: 'NCT preparation', concern: 'NCT prep and re-test.', parts: [['OSR-H7-NB', 1], ['61612163750', 1]], labour: [['NCT preparation inspection', 1.2]] },
  { svc: 'Wheel bearing', concern: 'Humming noise at speed.', parts: [['33416792361', 1]], labour: [['Front wheel bearing replacement', 2.0]] },
  { svc: 'Exhaust repair', concern: 'Blowing from under the car.', parts: [['EXH-FLEX-55', 1]], labour: [['Flex pipe replacement', 1.4]] },
]

const HIST_SPECS: JobSpec[] = HIST_TEMPLATES.map((t, i) => ({
  n: 1 + i,
  cus: ((i * 3) % 20) + 1,
  veh: ((i * 5) % 25) + 1,
  st: 'completed' as JobStatus,
  tech: (i % 9) + 1,
  bay: (i % 8) + 1,
  day: -(3 + i * 2),
  start: ['08:15', '09:00', '10:30', '11:45', '13:15'][i % 5],
  svc: t.svc,
  concern: t.concern,
  parts: t.parts.map(([pn, q]) => [pn, q, 'in-stock'] as [string, number, JobPart['status']]),
  labour: t.labour,
  est: 'approved' as const,
}))
// keep customer↔vehicle consistent
HIST_SPECS.forEach((s) => { s.cus = Number(VEHICLES[s.veh - 1].customerId.split('-')[1]) })

export const JOBS: Job[] = [...HIST_SPECS, ...SPECS].map(buildJob)

/* extra colour on the hero job */
const hero = JOBS.find((j) => j.id === 'job-32')!
hero.notes = [
  { id: 'n1', at: at(0, '09:52'), byId: 'stf-1', body: 'Intake face is heavily coked. Recommending the manifold is cleaned while the valve is off — no extra parts, adds about 20 minutes.' },
  { id: 'n2', at: at(0, '10:06'), byId: 'stf-1', body: 'Swap-tested the coil from cylinder 2 to 3, misfire followed the coil. Coil confirmed as the fault.' },
]
hero.timeline.push(
  { id: 'tl-h1', at: at(0, '10:20'), kind: 'money', title: 'Purchase order PO-1028 created', detail: 'AutoParts Direct · EGR valve and gasket · €327.00', actorId: 'stf-12' },
  { id: 'tl-h2', at: at(0, '10:34'), kind: 'customer', title: 'Customer approved estimate', detail: 'Approved online · €620.14 incl. VAT', actorId: undefined },
)
hero.timeline.sort((a, b) => a.at.localeCompare(b.at))

/* ---------------- bays reflect the live board ---------------- */

export const BAYS_SEEDED: Bay[] = BAYS.map((b) => {
  const job = JOBS.find((j) => j.bayId === b.id && ['assigned', 'diagnosing', 'in-progress', 'quality-check', 'awaiting-parts'].includes(j.status) && j.bookedFor.slice(0, 10) === at(0).slice(0, 10))
  return job ? { ...b, jobId: job.id, status: 'occupied' as const } : b
})

/* ---------------- diagnostics ---------------- */

export const DIAGNOSTICS: DiagnosticSession[] = SPECS.filter((s) => s.codes).map((s) => {
  const codes = s.codes!.map((c) => DTC_LIBRARY[c]).filter(Boolean)
  const faultsBySystem = new Map<string, number>()
  codes.forEach((c) => faultsBySystem.set(c.system, (faultsBySystem.get(c.system) ?? 0) + 1))
  const modules = [
    'Engine Control Module', 'Transmission Control', 'ABS / Stability', 'Airbag / Restraints',
    'Body Control Module', 'Climate Control', 'Instrument Cluster', 'Gateway',
  ]
  const map: Record<string, string> = {
    Engine: 'Engine Control Module', Emissions: 'Engine Control Module', Transmission: 'Transmission Control',
    Chassis: 'ABS / Stability', Climate: 'Climate Control', Body: 'Body Control Module', Network: 'Gateway',
  }
  return {
    id: `diag-${s.n}`,
    jobId: `job-${s.n}`,
    device: 'AutoScan Pro X1',
    startedAt: at(s.day ?? 0, '09:42'),
    completedAt: s.st === 'diagnosing' ? undefined : at(s.day ?? 0, '09:49'),
    technicianId: `stf-${s.tech ?? 1}`,
    battery: 12.4 + ((s.n % 5) * 0.1),
    modulesScanned: modules.map((m) => {
      const faults = codes.filter((c) => map[c.system] === m).length
      return { name: m, status: faults ? ('faults' as const) : ('ok' as const), faults }
    }),
    codes,
    liveData: [
      { label: 'Coolant temperature', value: '88', unit: '°C', nominal: '85–95', ok: true },
      { label: 'Intake air temp', value: '31', unit: '°C', nominal: '15–45', ok: true },
      { label: 'MAF', value: '18.2', unit: 'g/s', nominal: '16–24', ok: true },
      { label: 'Rail pressure', value: s.codes?.includes('P0087') ? '810' : '1,340', unit: 'bar', nominal: '1,250–1,450', ok: !s.codes?.includes('P0087') },
      { label: 'EGR position', value: s.codes?.includes('P0401') ? '11' : '36', unit: '%', nominal: '30–45', ok: !s.codes?.includes('P0401') },
      { label: 'Fuel trim (short)', value: s.codes?.includes('P0302') ? '+9.4' : '+1.2', unit: '%', nominal: '−5 to +5', ok: !s.codes?.includes('P0302') },
      { label: 'Battery voltage', value: '14.2', unit: 'V', nominal: '13.8–14.6', ok: true },
      { label: 'DPF soot load', value: s.codes?.includes('P2002') ? '112' : '34', unit: '%', nominal: '0–80', ok: !s.codes?.includes('P2002') },
    ],
  }
})

/* ---------------- purchase orders ---------------- */

function po(
  n: number, supplierId: string, status: PurchaseOrder['status'],
  lines: [string, number, number, string?][], day: number, shipping = 9.5, note?: string,
): PurchaseOrder {
  return {
    id: `po-${n}`,
    number: `PO-${1014 + n}`,
    supplierId,
    status,
    shipping,
    createdAt: at(day, '10:20'),
    createdById: 'stf-12',
    approvedById: ['approved', 'ordered', 'partial', 'received'].includes(status) ? 'stf-13' : undefined,
    approvedAt: ['approved', 'ordered', 'partial', 'received'].includes(status) ? at(day, '11:05') : undefined,
    expectedAt: at(day + (status === 'received' ? 0 : 2), '11:00'),
    receivedAt: status === 'received' ? at(day + 2, '09:15') : undefined,
    note,
    lines: lines.map(([pn, qty, unitCost, jobId]) => ({
      id: uid('pol'),
      partId: partByNumber(pn).id,
      qty,
      received: status === 'received' ? qty : status === 'partial' ? Math.max(1, qty - 1) : 0,
      unitCost,
      jobId,
    })),
  }
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  po(14, 'sup-1', 'pending-approval', [['11717810751', 1, 295, 'job-32'], ['11717810752', 1, 22, 'job-32']], 0, 10, 'Next-day delivery requested — customer waiting on vehicle.'),
  po(13, 'sup-4', 'ordered', [['11657823256', 1, 742, 'job-37']], 0, 38, 'Garrett reman unit, surcharge refundable on return of old core.'),
  po(12, 'sup-8', 'pending-approval', [['18307806411', 1, 612, 'job-41']], 0, 24),
  po(11, 'sup-6', 'approved', [['11787589121', 2, 74, 'job-50'], ['12137594937', 2, 36]], 0, 9.5),
  po(10, 'sup-3', 'ordered', [['21207572843', 1, 398, 'job-38'], ['21207603248', 1, 281]], -1, 14),
  po(9, 'sup-1', 'received', [['34116878876', 4, 44], ['34216873093', 4, 37], ['34116864046', 2, 86]], -3, 12),
  po(8, 'sup-9', 'received', [['CONT-2055516', 8, 66], ['MICH-2254517', 4, 90]], -4, 0),
  po(7, 'sup-2', 'received', [['11427566327', 20, 7.1], ['13717811026', 12, 13.4], ['64319313519', 12, 10.5], ['CAST-5W30-5L', 10, 30]], -6, 15),
  po(6, 'sup-10', 'received', [['VAR-F21-AGM', 4, 142]], -8, 18),
  po(5, 'sup-8', 'partial', [['31126768987', 4, 84], ['31356765933', 8, 15]], -2, 11),
  po(4, 'sup-4', 'draft', [['64529295050', 1, 341]], 0, 26, 'Waiting on customer decision before ordering.'),
  po(3, 'sup-5', 'received', [['61612163750', 10, 16], ['OSR-H7-NB', 12, 8.4]], -11, 8),
  po(2, 'sup-7', 'rejected', [['21207603248', 2, 305]], -5, 20, 'Rejected — Celtic Auto quoted €281 for the same LuK kit.'),
  po(1, 'sup-6', 'received', [['12232249603', 4, 40], ['13327811227', 8, 21]], -14, 9.5),
  po(15, 'sup-3', 'draft', [['33416792361', 2, 55], ['32106765235', 4, 26]], 0, 10, 'Stock top-up, both below reorder point.'),
]

/* link ordered job parts back to the purchase order that covers them */
PURCHASE_ORDERS.forEach((po) => {
  po.lines.forEach((line) => {
    if (!line.jobId) return
    const j = JOBS.find((x) => x.id === line.jobId)
    const jp = j?.parts.find((p) => p.partId === line.partId && (p.status === 'ordered' || p.status === 'out'))
    if (jp) {
      jp.poId = po.id
      jp.status = po.status === 'received' ? 'reserved' : 'ordered'
    }
  })
})

/* ---------------- invoices ---------------- */

function invoiceFromJob(job: Job, n: number, status: Invoice['status'], dayIssued: number): Invoice {
  const lines: InvoiceLine[] = []
  job.parts.forEach((jp) => {
    const p = PARTS.find((x) => x.id === jp.partId)!
    lines.push({
      id: uid('il'), kind: 'part', description: p.name, detail: `${p.brand} · ${p.partNumber}`,
      qty: jp.qty, unitPrice: jp.unitPrice, vatRate: SETTINGS.vatRate,
    })
  })
  job.labour.forEach((l) => {
    lines.push({
      id: uid('il'), kind: 'labour', description: l.description, detail: `${l.hours} h @ €${l.rate.toFixed(2)}/h`,
      qty: l.hours, unitPrice: l.rate, vatRate: SETTINGS.vatRate,
    })
  })
  if (job.repairs.length) {
    lines.push({
      id: uid('il'), kind: 'fee', description: 'Diagnostic scan and report',
      detail: 'AutoScan Pro X1 · full module scan', qty: 1, unitPrice: SETTINGS.diagnosticRate, vatRate: SETTINGS.vatRate,
    })
  }
  lines.push({
    id: uid('il'), kind: 'fee', description: 'Environmental and consumables charge',
    detail: 'Waste oil, cleaners, fasteners', qty: 1, unitPrice: 12.5, vatRate: SETTINGS.vatRate,
  })
  const gross = lines.reduce((t, l) => t + l.qty * l.unitPrice * (1 + l.vatRate), 0)
  const payments =
    status === 'paid'
      ? [{ id: uid('pay'), at: at(dayIssued + 1, '14:10'), amount: Math.round(gross * 100) / 100, method: (['card', 'transfer', 'cash'] as const)[n % 3], ref: `TRX-${48210 + n}` }]
      : status === 'part-paid'
      ? [{ id: uid('pay'), at: at(dayIssued + 2, '11:30'), amount: Math.round(gross * 0.4 * 100) / 100, method: 'card' as const, ref: `TRX-${48210 + n}` }]
      : []
  return {
    id: `inv-${n}`,
    number: `INV-2026-${String(1180 + n).padStart(4, '0')}`,
    jobId: job.id,
    customerId: job.customerId,
    vehicleId: job.vehicleId,
    issuedAt: at(dayIssued, '16:20'),
    dueAt: at(dayIssued + 30, '17:00'),
    status,
    lines,
    discount: n % 7 === 0 ? 25 : 0,
    payments,
    poRef: CUSTOMERS.find((c) => c.id === job.customerId)?.type === 'fleet' ? `CPO-${9200 + n}` : undefined,
  }
}

const completedJobs = JOBS.filter((j) => j.status === 'completed')
const readyJobs = JOBS.filter((j) => j.status === 'ready' || j.status === 'quality-check')

export const INVOICES: Invoice[] = [
  ...completedJobs.slice(0, 16).map((j, i) => {
    const dayIssued = Math.round((new Date(j.bookedFor).getTime() - new Date(at(0)).getTime()) / 86400000)
    const status: Invoice['status'] =
      i % 9 === 3 ? 'overdue' : i % 5 === 1 ? 'sent' : i % 11 === 7 ? 'part-paid' : 'paid'
    return invoiceFromJob(j, i + 1, status, dayIssued)
  }),
  ...readyJobs.slice(0, 3).map((j, i) => invoiceFromJob(j, 17 + i, 'sent', 0)),
  invoiceFromJob(JOBS.find((j) => j.id === 'job-42')!, 20, 'draft', 0),
]

INVOICES.forEach((inv) => {
  const job = JOBS.find((j) => j.id === inv.jobId)
  if (job && !job.invoiceId) job.invoiceId = inv.id
})

/* ---------------- bookings ---------------- */

const SERVICE_TYPES = ['Full service', 'Interim service', 'Diagnostic investigation', 'Brake service', 'NCT preparation', 'Air conditioning service', 'Tyres and alignment', 'Timing belt', 'Clutch replacement']

export const BOOKINGS: Booking[] = [
  ...JOBS.filter((j) => new Date(j.bookedFor) >= new Date(at(0, '00:00'))).map((j, i) => ({
    id: `bkg-${i + 1}`,
    customerId: j.customerId,
    vehicleId: j.vehicleId,
    serviceType: j.serviceType,
    at: j.bookedFor,
    durationMins: [60, 90, 120, 180, 240][i % 5],
    jobId: j.id,
    status: (j.status === 'booked' ? 'confirmed' : 'arrived') as Booking['status'],
    channel: (['phone', 'online', 'fleet', 'walk-in'] as const)[i % 4],
  })),
  ...Array.from({ length: 12 }, (_, i) => {
    const veh = VEHICLES[(i * 7) % 25]
    return {
      id: `bkg-f${i + 1}`,
      customerId: veh.customerId,
      vehicleId: veh.id,
      serviceType: SERVICE_TYPES[i % SERVICE_TYPES.length],
      at: at(1 + Math.floor(i / 3), ['08:30', '10:00', '11:30', '14:00', '15:30'][i % 5]),
      durationMins: [60, 90, 120, 180][i % 4],
      status: 'confirmed' as const,
      channel: (['online', 'phone', 'fleet'] as const)[i % 3],
      notes: i % 4 === 0 ? 'Customer will wait in reception.' : undefined,
    }
  }),
]

/* ---------------- notifications ---------------- */

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'nt-1', at: at(0, '11:42'), kind: 'parts', title: 'Parts arrived for BMW 320d', body: 'EGR valve and gasket booked in against JOB-10482. Bay 04 can proceed.', read: false, link: '/app/jobs/job-32' },
  { id: 'nt-2', at: at(0, '11:15'), kind: 'approval', title: 'Purchase order PO-1028 needs approval', body: 'AutoParts Direct · €327.00 · raised by Grace Mullen', read: false, link: '/app/purchasing/po-14', forPermission: 'po.approve' },
  { id: 'nt-3', at: at(0, '10:34'), kind: 'money', title: 'Customer approved repair', body: 'John Smith approved €620.14 of work on JOB-10482.', read: false, link: '/app/jobs/job-32' },
  { id: 'nt-4', at: at(0, '10:02'), kind: 'stock', title: 'Low stock: Front Brake Pad Set', body: '3 remaining, reorder point is 6. Used on 9 jobs in the last 90 days.', read: false, link: '/app/parts/part-5', forPermission: 'inventory.edit' },
  { id: 'nt-5', at: at(0, '09:48'), kind: 'job', title: 'Ford Focus is ready for collection', body: 'JOB-10486 passed quality check. Customer not yet called.', read: true, link: '/app/jobs/job-36' },
  { id: 'nt-6', at: at(0, '09:12'), kind: 'job', title: 'Estimate awaiting customer approval', body: 'Audi A4 · JOB-10484 · €412.30 sent 2 hours ago, no response.', read: true, link: '/app/jobs/job-34' },
  { id: 'nt-7', at: at(0, '08:30'), kind: 'stock', title: 'Out of stock: Dual Mass Flywheel', body: 'JOB-10488 needs one. On order with Celtic Auto Supplies, ETA tomorrow.', read: true, link: '/app/parts/part-36', forPermission: 'inventory.edit' },
  { id: 'nt-8', at: at(-1, '16:20'), kind: 'money', title: 'Invoice overdue', body: 'INV-2026-1184 · Ballinasloe Couriers · 12 days past due.', read: true, link: '/app/invoices', forPermission: 'finance.view' },
  { id: 'nt-9', at: at(-1, '15:05'), kind: 'system', title: 'AutoScan Pro X1 firmware updated', body: 'Coverage added for 2024 model year Stellantis platforms.', read: true },
  { id: 'nt-10', at: at(-1, '12:40'), kind: 'job', title: 'Rebecca Nolan called in sick', body: 'Three jobs on Bay 05 need reassigning for today.', read: true, link: '/app/staff', forPermission: 'staff.manage' },
]

/* ---------------- derived stock reconciliation ---------------- */

PARTS.forEach((p) => {
  const reserved = JOBS.filter((j) => !['completed'].includes(j.status))
    .flatMap((j) => j.parts)
    .filter((jp) => jp.partId === p.id && jp.status === 'reserved')
    .reduce((t, jp) => t + jp.qty, 0)
  const onOrder = PURCHASE_ORDERS
    .filter((o) => ['approved', 'ordered', 'partial'].includes(o.status))
    .flatMap((o) => o.lines)
    .filter((l) => l.partId === p.id)
    .reduce((t, l) => t + (l.qty - l.received), 0)
  p.reserved = reserved
  p.onOrder = onOrder
})

export { SUPPLIERS, PARTS, CUSTOMERS, VEHICLES, STAFF, TECHS, ri }
