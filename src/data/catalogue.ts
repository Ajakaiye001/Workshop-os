import type { Customer, DTC, Part, Role, StaffMember, Supplier, Vehicle, Bay } from './types'

/* ---------- clock helpers: everything is relative to "now" ---------- */

const BASE = new Date()
BASE.setSeconds(0, 0)

export function at(dayOffset: number, time = '09:00'): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(BASE)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
export function daysAgo(n: number, time = '10:30') { return at(-n, time) }

/* ---------- deterministic pseudo-random ---------- */
let _s = 20260825
export function rnd() {
  _s = (_s * 1664525 + 1013904223) % 4294967296
  return _s / 4294967296
}
export function pick<T>(arr: T[]): T { return arr[Math.floor(rnd() * arr.length)] }
export function ri(min: number, max: number) { return Math.floor(rnd() * (max - min + 1)) + min }

/* ============================ ROLES ============================ */

export const ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    blurb: 'Everything. Money, people, operations.',
    home: 'admin',
    permissions: [
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.assign', 'customers.view', 'customers.edit',
      'vehicles.view', 'diagnostics.run', 'parts.request', 'parts.approve', 'inventory.edit',
      'po.create', 'po.approve', 'finance.view', 'invoices.create', 'invoices.edit',
      'payments.process', 'reports.view', 'staff.manage', 'roles.manage', 'settings.manage',
    ],
  },
  {
    id: 'manager',
    name: 'Workshop Manager',
    blurb: 'Runs the floor: jobs, people, parts, throughput.',
    home: 'admin',
    permissions: [
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.assign', 'customers.view', 'customers.edit',
      'vehicles.view', 'diagnostics.run', 'parts.request', 'parts.approve', 'inventory.edit',
      'po.create', 'po.approve', 'reports.view', 'staff.manage',
    ],
  },
  {
    id: 'advisor',
    name: 'Service Advisor',
    blurb: 'Owns the customer conversation and the estimate.',
    home: 'admin',
    permissions: [
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.assign', 'customers.view', 'customers.edit',
      'vehicles.view', 'parts.request', 'invoices.create', 'payments.process',
    ],
  },
  {
    id: 'parts',
    name: 'Parts Manager',
    blurb: 'Stock, suppliers, purchase orders, goods in.',
    home: 'admin',
    permissions: [
      'jobs.view', 'vehicles.view', 'parts.request', 'parts.approve', 'inventory.edit',
      'po.create', 'po.approve', 'customers.view',
    ],
  },
  {
    id: 'technician',
    name: 'Technician',
    blurb: 'Assigned jobs, diagnostics, parts requests, notes.',
    home: 'tech',
    permissions: ['jobs.view', 'jobs.edit', 'vehicles.view', 'diagnostics.run', 'parts.request'],
  },
  {
    id: 'accountant',
    name: 'Accountant',
    blurb: 'Invoicing, payments, VAT, financial reporting.',
    home: 'admin',
    permissions: [
      'jobs.view', 'customers.view', 'vehicles.view', 'finance.view', 'invoices.create',
      'invoices.edit', 'payments.process', 'reports.view',
    ],
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    blurb: 'Bookings, check-in, keys, phones.',
    home: 'admin',
    permissions: ['jobs.view', 'jobs.create', 'customers.view', 'customers.edit', 'vehicles.view'],
  },
]

/* ============================ SUPPLIERS ============================ */

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'AutoParts Direct', account: 'APD-4471', contact: 'Declan Moore', phone: '01 456 8820', email: 'trade@autopartsdirect.ie', county: 'Dublin', leadTimeDays: 1, rating: 4.6, categories: ['Brakes', 'Filters', 'Engine', 'Emissions'], terms: '30 days net', ytdSpend: 84210 },
  { id: 'sup-2', name: 'Brady Motor Factors', account: 'BMF-1120', contact: 'Aoife Brady', phone: '090 649 3311', email: 'orders@bradymf.ie', county: 'Westmeath', leadTimeDays: 2, rating: 4.4, categories: ['Filters', 'Fluids', 'Electrical', 'Body'], terms: '30 days net', ytdSpend: 51890 },
  { id: 'sup-3', name: 'Celtic Auto Supplies', account: 'CAS-7788', contact: 'Ronan Fitzgerald', phone: '021 431 7702', email: 'sales@celticauto.ie', county: 'Cork', leadTimeDays: 2, rating: 4.1, categories: ['Suspension', 'Steering', 'Clutch', 'Brakes'], terms: '14 days net', ytdSpend: 38740 },
  { id: 'sup-4', name: 'Nordkamp Parts Group', account: 'NPG-2291', contact: 'Sanne de Vries', phone: '+31 10 244 8890', email: 'export@nordkamp.nl', county: 'Rotterdam', leadTimeDays: 4, rating: 4.8, categories: ['Engine', 'Emissions', 'Transmission', 'Climate'], terms: 'Pro-forma', ytdSpend: 96320 },
  { id: 'sup-5', name: "O'Halloran Motor Factors", account: 'OMF-3345', contact: 'Sinéad O’Halloran', phone: '061 302 118', email: 'parts@ohalloran.ie', county: 'Limerick', leadTimeDays: 2, rating: 4.0, categories: ['Body', 'Electrical', 'Fluids'], terms: '30 days net', ytdSpend: 22110 },
  { id: 'sup-6', name: 'Bosch Service Ireland', account: 'BSI-0091', contact: 'Karl Hendricks', phone: '01 890 4400', email: 'ie.trade@bosch-service.com', county: 'Dublin', leadTimeDays: 3, rating: 4.9, categories: ['Ignition', 'Electrical', 'Filters', 'Engine'], terms: '45 days net', ytdSpend: 67450 },
  { id: 'sup-7', name: 'Shannonside Truck & Van', account: 'STV-5512', contact: 'Michael Guerin', phone: '069 622 40', email: 'commercial@shannonside.ie', county: 'Limerick', leadTimeDays: 3, rating: 3.9, categories: ['Clutch', 'Transmission', 'Exhaust', 'Brakes'], terms: '30 days net', ytdSpend: 29870 },
  { id: 'sup-8', name: 'Elite German Spares', account: 'EGS-6603', contact: 'Petra Lang', phone: '045 887 210', email: 'orders@elitegerman.ie', county: 'Kildare', leadTimeDays: 2, rating: 4.7, categories: ['Engine', 'Suspension', 'Climate', 'Emissions'], terms: '30 days net', ytdSpend: 73990 },
  { id: 'sup-9', name: 'TyreLink Ireland', account: 'TLI-8802', contact: 'Gary Nolan', phone: '057 866 3120', email: 'trade@tyrelink.ie', county: 'Laois', leadTimeDays: 1, rating: 4.3, categories: ['Tyres'], terms: '14 days net', ytdSpend: 41260 },
  { id: 'sup-10', name: 'Vantage Electrical Components', account: 'VEC-9931', contact: 'Cliodhna Ward', phone: '091 774 500', email: 'sales@vantage-ec.ie', county: 'Galway', leadTimeDays: 3, rating: 4.2, categories: ['Electrical', 'Ignition', 'Climate'], terms: '30 days net', ytdSpend: 18540 },
]

/* ============================ PARTS ============================ */

type PartSeed = [number, string, string, string, string, number, number, number, number, string]
// [n, partNumber, name, category, brand, cost, price, qty, reorderAt, location]

const PART_SEED: PartSeed[] = [
  [1, '11717810751', 'EGR Valve', 'Emissions', 'Pierburg', 232, 310, 0, 2, 'B4-12'],
  [2, '11717810752', 'EGR Gasket', 'Emissions', 'Elring', 12.5, 22, 14, 6, 'B4-13'],
  [3, '12137594937', 'Ignition Coil', 'Ignition', 'Bosch', 38, 62, 9, 4, 'C1-02'],
  [4, '12120037607', 'Spark Plug Set (4)', 'Ignition', 'NGK', 26, 48, 12, 5, 'C1-04'],
  [5, '34116878876', 'Front Brake Pad Set', 'Brakes', 'Brembo', 46, 82, 3, 6, 'A2-01'],
  [6, '34216873093', 'Rear Brake Pad Set', 'Brakes', 'Brembo', 39, 71, 7, 5, 'A2-02'],
  [7, '34116864046', 'Front Brake Discs (pair)', 'Brakes', 'ATE', 88, 149, 4, 3, 'A2-06'],
  [8, '34216864047', 'Rear Brake Discs (pair)', 'Brakes', 'ATE', 74, 128, 2, 3, 'A2-07'],
  [9, '11427566327', 'Oil Filter', 'Filters', 'Mann', 7.4, 14, 38, 12, 'A1-01'],
  [10, '13717811026', 'Air Filter', 'Filters', 'Mann', 14, 26, 21, 8, 'A1-03'],
  [11, '64319313519', 'Cabin Pollen Filter', 'Filters', 'Bosch', 11, 21, 17, 8, 'A1-05'],
  [12, '13327811227', 'Fuel Filter', 'Filters', 'Mahle', 22, 39, 6, 6, 'A1-07'],
  [13, 'CAST-5W30-5L', 'Engine Oil 5W-30 LL04 (5L)', 'Fluids', 'Castrol', 31, 54, 24, 10, 'D1-01'],
  [14, 'FEBI-G12-5L', 'Coolant G12+ (5L)', 'Fluids', 'Febi', 18, 32, 11, 5, 'D1-03'],
  [15, 'ATE-DOT4-1L', 'Brake Fluid DOT4 (1L)', 'Fluids', 'ATE', 6.8, 13, 19, 8, 'D1-05'],
  [16, 'ADB-10L', 'AdBlue (10L)', 'Fluids', 'BASF', 12, 22, 9, 6, 'D1-07'],
  [17, 'VAR-F21-AGM', 'Battery 80Ah AGM', 'Electrical', 'Varta', 148, 219, 5, 3, 'E2-01'],
  [18, '12317605479', 'Alternator 180A', 'Electrical', 'Valeo', 265, 389, 1, 1, 'E2-04'],
  [19, '12417640403', 'Starter Motor', 'Electrical', 'Bosch', 198, 295, 2, 1, 'E2-06'],
  [20, '12232249603', 'Glow Plug Set', 'Electrical', 'NGK', 42, 74, 6, 4, 'E2-08'],
  [21, '13627801682', 'MAF Sensor', 'Engine', 'Bosch', 96, 149, 2, 2, 'B1-03'],
  [22, '11657823256', 'Turbocharger', 'Engine', 'Garrett', 780, 1120, 0, 1, 'B5-01'],
  [23, '11318618317', 'Timing Chain Kit', 'Engine', 'INA', 214, 329, 1, 1, 'B3-02'],
  [24, '11517586925', 'Water Pump', 'Cooling', 'Graf', 78, 128, 4, 2, 'B2-05'],
  [25, '11537793960', 'Thermostat', 'Cooling', 'Wahler', 34, 59, 8, 4, 'B2-07'],
  [26, '17117795138', 'Radiator', 'Cooling', 'Nissens', 132, 198, 2, 1, 'B2-01'],
  [27, '17137640514', 'Expansion Tank', 'Cooling', 'Febi', 28, 49, 5, 3, 'B2-03'],
  [28, '31126768987', 'Front Lower Control Arm', 'Suspension', 'Lemförder', 88, 142, 3, 2, 'F1-02'],
  [29, '31316786001', 'Front Shock Absorbers (pair)', 'Suspension', 'Sachs', 156, 239, 2, 2, 'F1-05'],
  [30, '33536767334', 'Rear Coil Springs (pair)', 'Suspension', 'Lesjöfors', 74, 119, 4, 2, 'F1-08'],
  [31, '31356765933', 'Anti-Roll Bar Link', 'Suspension', 'Meyle', 16, 29, 13, 6, 'F1-10'],
  [32, '33416792361', 'Wheel Bearing Kit', 'Suspension', 'SKF', 58, 98, 5, 3, 'F2-02'],
  [33, '32106765235', 'Track Rod End', 'Steering', 'Lemförder', 27, 48, 7, 4, 'F3-01'],
  [34, '32416779244', 'Power Steering Pump', 'Steering', 'ZF', 245, 359, 1, 1, 'F3-04'],
  [35, '21207603248', 'Clutch Kit (3-piece)', 'Clutch', 'LuK', 288, 419, 2, 1, 'G1-01'],
  [36, '21207572843', 'Dual Mass Flywheel', 'Clutch', 'Sachs', 412, 589, 0, 1, 'G1-03'],
  [37, 'ZF-ATF-5L', 'Gearbox Oil ATF (5L)', 'Transmission', 'ZF', 62, 98, 6, 3, 'D1-09'],
  [38, 'DPF-CLN-K1', 'DPF Cleaning Kit', 'Emissions', 'Wynns', 24, 45, 8, 4, 'B4-02'],
  [39, '18307806411', 'Diesel Particulate Filter', 'Emissions', 'Bosal', 640, 929, 1, 1, 'B5-04'],
  [40, '11787589121', 'Lambda Sensor', 'Emissions', 'NTK', 78, 124, 3, 3, 'B4-06'],
  [41, '61612163750', 'Front Wiper Blade Set', 'Body', 'Bosch', 17, 32, 22, 8, 'H1-01'],
  [42, 'OSR-H7-NB', 'Headlight Bulb H7 (pair)', 'Body', 'Osram', 9, 18, 26, 10, 'H1-03'],
  [43, '51167186587', 'Door Mirror Glass', 'Body', 'Alkar', 34, 58, 4, 2, 'H1-06'],
  [44, '67128377430', 'Windscreen Washer Pump', 'Body', 'Febi', 19, 34, 6, 3, 'H1-08'],
  [45, '64116928326', 'Climate Control Sensor', 'Climate', 'Behr', 46, 79, 4, 2, 'C3-01'],
  [46, '64529295050', 'A/C Compressor', 'Climate', 'Denso', 348, 499, 1, 1, 'C3-04'],
  [47, '64509239992', 'A/C Condenser', 'Climate', 'Nissens', 118, 179, 2, 1, 'C3-06'],
  [48, 'EXH-FLEX-55', 'Exhaust Flex Pipe', 'Exhaust', 'Bosal', 22, 42, 5, 3, 'G2-02'],
  [49, 'MICH-2254517', 'Tyre 225/45 R17 91W', 'Tyres', 'Michelin', 92, 139, 8, 4, 'T-01'],
  [50, 'CONT-2055516', 'Tyre 205/55 R16 91V', 'Tyres', 'Continental', 68, 105, 12, 6, 'T-03'],
]

const FITMENTS: Record<string, string[]> = {
  Emissions: ['BMW 3 Series F30', 'BMW 5 Series F10', 'Volkswagen Passat B8', 'Audi A4 B9'],
  Ignition: ['Volkswagen Golf Mk7', 'Škoda Octavia III', 'Audi A3 8V', 'SEAT Leon 5F'],
  Brakes: ['BMW 3 Series F30', 'Ford Focus Mk3', 'Toyota Corolla E210', 'Nissan Qashqai J11'],
  Filters: ['Universal — multi-fit', 'Volkswagen Group 2.0 TDI', 'BMW N47/B47', 'Ford EcoBlue 1.5'],
  Fluids: ['Universal'],
  Electrical: ['BMW 3 Series F30', 'Mercedes C-Class W205', 'Volkswagen Golf Mk7'],
  Engine: ['BMW 320d F30', 'Volkswagen Passat 2.0 TDI', 'Audi A4 2.0 TDI'],
  Cooling: ['Ford Focus Mk3', 'Opel Astra K', 'Hyundai Tucson TL'],
  Suspension: ['BMW 3 Series F30', 'Volkswagen Golf Mk7', 'Toyota Corolla E210'],
  Steering: ['Ford Focus Mk3', 'Volkswagen Golf Mk7'],
  Clutch: ['Volkswagen Golf Mk7 2.0 TDI', 'Ford Transit Custom', 'Renault Trafic III'],
  Transmission: ['ZF 8HP', 'Volkswagen DSG DQ250'],
  Body: ['Universal — multi-fit'],
  Climate: ['BMW 3 Series F30', 'Mercedes C-Class W205', 'Audi A4 B9'],
  Exhaust: ['Universal — multi-fit'],
  Tyres: ['17" fitment', '16" fitment'],
}

const CATEGORY_SUPPLIERS: Record<string, string[]> = {
  Emissions: ['sup-1', 'sup-4', 'sup-8'],
  Ignition: ['sup-6', 'sup-10', 'sup-1'],
  Brakes: ['sup-1', 'sup-3', 'sup-7'],
  Filters: ['sup-1', 'sup-2', 'sup-6'],
  Fluids: ['sup-2', 'sup-5'],
  Electrical: ['sup-10', 'sup-6', 'sup-2'],
  Engine: ['sup-4', 'sup-8', 'sup-6'],
  Cooling: ['sup-8', 'sup-1', 'sup-3'],
  Suspension: ['sup-3', 'sup-8', 'sup-1'],
  Steering: ['sup-3', 'sup-8'],
  Clutch: ['sup-7', 'sup-3'],
  Transmission: ['sup-4', 'sup-7'],
  Body: ['sup-5', 'sup-2'],
  Climate: ['sup-4', 'sup-8', 'sup-10'],
  Exhaust: ['sup-7', 'sup-1'],
  Tyres: ['sup-9'],
}

export const PARTS: Part[] = PART_SEED.map(([n, pn, name, category, brand, cost, price, qty, reorderAt, location]) => {
  const supIds = CATEGORY_SUPPLIERS[category] ?? ['sup-1']
  const offers = supIds.map((sid, i) => {
    const s = SUPPLIERS.find((x) => x.id === sid)!
    const drift = [1, 0.951, 1.048, 0.98][i % 4]
    return {
      supplierId: sid,
      price: Math.round(cost * drift * 100) / 100,
      etaDays: s.leadTimeDays + (i === 2 ? 2 : 0),
      stock: [12, 4, 0, 7][(n + i) % 4],
    }
  })
  const cheapest = [...offers].sort((a, b) => a.price - b.price)[0]
  return {
    id: `part-${n}`,
    partNumber: pn,
    name,
    category,
    brand,
    fits: FITMENTS[category] ?? ['Universal'],
    primarySupplierId: cheapest.supplierId,
    offers,
    cost,
    price,
    qty,
    reserved: qty > 4 ? (n % 3) : 0,
    onOrder: qty === 0 && n % 2 === 0 ? 1 : 0,
    reorderAt,
    location,
    usage90d: 3 + ((n * 7) % 34),
  }
})

export const partByNumber = (pn: string) => PARTS.find((p) => p.partNumber === pn)!

/* ============================ CUSTOMERS ============================ */

type CustSeed = [string, 'private' | 'fleet', string, string, string, string, string, string, number]
const CUST_SEED: CustSeed[] = [
  ['John Smith', 'private', '', '086 234 1187', 'j.smith@gmail.com', '14 Larkfield Grove', 'Dublin 6W', 'D6W AK21', 6],
  ['Aoife Ní Bhriain', 'private', '', '087 991 3320', 'aoife.nb@outlook.com', '2 Sliabh Bán Road', 'Roscommon', 'F42 YR68', 4],
  ['Seán Gallagher', 'private', '', '085 118 7742', 'sean.g@eircom.net', '31 Ashbourne Park', 'Athlone', 'N37 K294', 9],
  ['Ballinasloe Couriers', 'fleet', 'Ballinasloe Couriers Ltd', '090 964 2210', 'fleet@bcouriers.ie', 'Unit 7, Creagh Business Park', 'Ballinasloe', 'H53 T801', 3],
  ['Máire Donnelly', 'private', '', '086 445 9010', 'mdonnelly@gmail.com', '88 The Beeches', 'Mullingar', 'N91 F5V2', 7],
  ['Cormac Whelan', 'private', '', '083 220 4471', 'cwhelan@yahoo.ie', '5 Bishopsgate', 'Athlone', 'N37 XA88', 2],
  ['Midlands Care Services', 'fleet', 'Midlands Care Services CLG', '044 934 7711', 'transport@midlandscare.ie', 'Clonmore Business Campus', 'Mullingar', 'N91 PW44', 5],
  ['Niamh Fitzpatrick', 'private', '', '087 664 2093', 'niamh.fitz@gmail.com', '19 Riverside Court', 'Athlone', 'N37 HD09', 8],
  ['Pádraig Hogan', 'private', '', '086 771 3388', 'p.hogan@live.ie', 'Cloonark, Curraghboy', 'Roscommon', 'N37 V285', 11],
  ['Laura Kavanagh', 'private', '', '085 903 6614', 'lkavanagh@gmail.com', '42 Meadowbrook', 'Tullamore', 'R35 T712', 3],
  ['Athlone Plant Hire', 'fleet', 'Athlone Plant Hire Ltd', '090 647 8890', 'accounts@athloneplant.ie', 'Monksland Industrial Estate', 'Athlone', 'N37 KP03', 6],
  ['Dermot Byrne', 'private', '', '087 332 1176', 'dermotbyrne@gmail.com', '7 Sarsfield Terrace', 'Athlone', 'N37 R442', 4],
  ['Sorcha Lynch', 'private', '', '083 774 5502', 'sorcha.lynch@gmail.com', '12 Coosan Point Road', 'Athlone', 'N37 A039', 5],
  ['Kevin Mulligan', 'private', '', '086 220 9987', 'kmulligan@hotmail.com', 'Ardnasool, Kiltoom', 'Roscommon', 'N37 DK52', 10],
  ['Shannon Marine Services', 'fleet', 'Shannon Marine Services Ltd', '090 649 1140', 'ops@shannonmarine.ie', 'The Quay, Ballykeeran', 'Athlone', 'N37 CX61', 2],
  ['Órla Rafferty', 'private', '', '085 447 2218', 'orlarafferty@gmail.com', '66 Willow Park', 'Athlone', 'N37 E230', 6],
  ['Barry Concannon', 'private', '', '087 118 5563', 'bconcannon@eircom.net', '3 Garrycastle Lane', 'Athlone', 'N37 W117', 8],
  ['Emma Tierney', 'private', '', '086 992 3341', 'emma.tierney@gmail.com', '25 Retreat Heights', 'Athlone', 'N37 Y906', 1],
  ['Fergal Moran', 'private', '', '083 556 1094', 'fergal.moran@gmail.com', 'Baylin, Athlone', 'Westmeath', 'N37 P338', 12],
  ['Grange Veterinary Practice', 'fleet', 'Grange Veterinary Practice', '090 643 2200', 'admin@grangevet.ie', 'Golden Island Retail Park', 'Athlone', 'N37 F284', 4],
]

export const CUSTOMERS: Customer[] = CUST_SEED.map(([name, type, company, phone, email, address, city, eircode, yrs], i) => ({
  id: `cus-${i + 1}`,
  name,
  type,
  company: company || undefined,
  phone,
  email,
  address,
  city,
  eircode,
  since: at(-yrs * 365, '09:00'),
  preferredContact: type === 'fleet' ? 'email' : (i % 3 === 0 ? 'phone' : i % 3 === 1 ? 'sms' : 'email'),
  notes: type === 'fleet' ? 'Account customer — invoice monthly, PO number required on all jobs.' : undefined,
}))

/* ============================ VEHICLES ============================ */

type VehSeed = [number, string, string, string, number, string, string, 'Diesel' | 'Petrol' | 'Hybrid' | 'Electric', 'Manual' | 'Automatic', string, string, number]
const VEH_SEED: VehSeed[] = [
  [1, 'BMW', '320d', 'M Sport Saloon', 2019, '191-D-12345', 'WBA8A1109KA512776', 'Diesel', 'Automatic', '2.0 B47D20', 'Mineral Grey', 124832],
  [1, 'Volkswagen', 'Tiguan', 'Life 2.0 TDI', 2021, '211-D-40118', 'WVGZZZ5NZMW812440', 'Diesel', 'Automatic', '2.0 TDI DFGA', 'Deep Black', 61204],
  [2, 'Toyota', 'Corolla', 'Hybrid Luna Sport', 2022, '221-RN-1187', 'SB1KZ3JE40E118220', 'Hybrid', 'Automatic', '1.8 VVT-i', 'Silver', 38940],
  [3, 'Ford', 'Focus', 'Titanium 1.5 EcoBlue', 2018, '181-WH-6620', 'WF05XXGCH5JR41288', 'Diesel', 'Manual', '1.5 EcoBlue', 'Moondust Silver', 156770],
  [3, 'Hyundai', 'Tucson', 'Executive 1.6 CRDi', 2020, '201-WH-2214', 'TMAJ3815AKJ440921', 'Diesel', 'Manual', '1.6 CRDi', 'Titan Grey', 88210],
  [4, 'Renault', 'Trafic', 'LL29 Business+', 2020, '201-G-9930', 'VF1FL000265412887', 'Diesel', 'Manual', '2.0 dCi', 'White', 194380],
  [4, 'Ford', 'Transit Custom', '300 Limited L1H1', 2021, '211-G-4471', 'WF0YXXTTGYMK22014', 'Diesel', 'Manual', '2.0 EcoBlue', 'White', 141920],
  [5, 'Audi', 'A4', '35 TDI S line', 2019, '192-WH-3308', 'WAUZZZF41KA118773', 'Diesel', 'Automatic', '2.0 TDI DEUA', 'Manhattan Grey', 109440],
  [6, 'Škoda', 'Octavia', 'Style 2.0 TDI', 2020, '201-WH-8802', 'TMBJJ7NE9L0224118', 'Diesel', 'Manual', '2.0 TDI DTTA', 'Race Blue', 97650],
  [7, 'Volkswagen', 'Caddy', 'Maxi 2.0 TDI', 2019, '191-WH-5540', 'WV1ZZZ2KZKX118904', 'Diesel', 'Manual', '2.0 TDI DFSD', 'Candy White', 168220],
  [7, 'Peugeot', '2008', 'Allure 1.2 PureTech', 2022, '221-WH-1120', 'VF3UKHNSMMS412887', 'Petrol', 'Manual', '1.2 PureTech', 'Vertigo Blue', 29840],
  [8, 'Volkswagen', 'Golf', 'Highline 1.6 TDI', 2017, '171-WH-4409', 'WVWZZZAUZHW118220', 'Diesel', 'Manual', '1.6 TDI CRKB', 'Tungsten Silver', 178330],
  [9, 'Mercedes-Benz', 'C-Class', 'C220d AMG Line', 2019, '191-RN-2280', 'WDD2050141R442190', 'Diesel', 'Automatic', '2.0 OM654', 'Obsidian Black', 132110],
  [10, 'Nissan', 'Qashqai', 'SV 1.5 dCi', 2018, '181-OY-7714', 'SJNFAAJ11U2118440', 'Diesel', 'Manual', '1.5 dCi K9K', 'Gun Metallic', 145600],
  [11, 'Toyota', 'Hilux', 'Invincible D-4D', 2021, '211-WH-3390', 'AHTKB3CD802118773', 'Diesel', 'Automatic', '2.8 D-4D', 'White Pearl', 87440],
  [11, 'Isuzu', 'D-Max', 'Utility Double Cab', 2020, '201-WH-6612', 'MPATFS85JLT118220', 'Diesel', 'Manual', '1.9 RZ4E', 'Splash White', 121870],
  [12, 'Opel', 'Astra', 'SC 1.4i Turbo', 2019, '191-WH-9081', 'W0LBD6EL5K8118440', 'Petrol', 'Manual', '1.4 Turbo', 'Dark Caramel', 76220],
  [13, 'Volvo', 'XC40', 'Momentum D3', 2020, '201-WH-1174', 'YV1XZ72VDL2118904', 'Diesel', 'Automatic', '2.0 D3', 'Fusion Red', 68930],
  [14, 'BMW', '520d', 'SE Touring', 2018, '181-RN-4402', 'WBAJC5104JB118220', 'Diesel', 'Automatic', '2.0 B47D20', 'Sophisto Grey', 187440],
  [15, 'Ford', 'Ranger', 'Wildtrak 2.0 EcoBlue', 2021, '211-WH-8830', 'WF0ER5FE1MLB18220', 'Diesel', 'Automatic', '2.0 EcoBlue', 'Sea Grey', 74110],
  [16, 'Kia', 'Sportage', 'K2 1.6 CRDi', 2021, '211-WH-2260', 'U5YPH81BDML118440', 'Diesel', 'Manual', '1.6 CRDi', 'Penta Metal', 54780],
  [17, 'Seat', 'Leon', 'FR 2.0 TDI', 2019, '191-WH-7719', 'VSSZZZ5FZKR118220', 'Diesel', 'Manual', '2.0 TDI DFHA', 'Mystery Blue', 118440],
  [18, 'Dacia', 'Sandero', 'Comfort TCe 90', 2023, '231-WH-1102', 'UU1DJF00369118440', 'Petrol', 'Manual', '1.0 TCe', 'Iron Blue', 18220],
  [19, 'Land Rover', 'Discovery Sport', 'S D165', 2020, '201-WH-4418', 'SALCA2AN0LH118220', 'Diesel', 'Automatic', '2.0 Ingenium', 'Santorini Black', 102340],
  [20, 'Volkswagen', 'Passat', 'Business 2.0 TDI', 2019, '191-WH-3341', 'WVWZZZ3CZKE118220', 'Diesel', 'Automatic', '2.0 TDI DFCA', 'Pyrite Silver', 163890],
]

export const VEHICLES: Vehicle[] = VEH_SEED.map(([cus, make, model, variant, year, reg, vin, fuel, transmission, engine, colour, mileage], i) => ({
  id: `veh-${i + 1}`,
  customerId: `cus-${cus}`,
  make, model, variant, year, reg, vin, fuel, transmission, engine, colour, mileage,
  nctDue: at(ri(20, 400), '09:00'),
  lastServiced: at(-ri(120, 500), '09:00'),
}))

/* ============================ STAFF ============================ */

type StaffSeed = [string, string, string, string, boolean, number, string[]]
const STAFF_SEED: StaffSeed[] = [
  ['Mike O’Brien', 'technician', '08:00', '17:00', true, 38, ['Diagnostics', 'BMW / Mercedes', 'Engine management']],
  ['Sarah Deegan', 'technician', '08:00', '17:00', true, 36, ['Diagnostics', 'Hybrid & EV', 'Electrical']],
  ['James Kelleher', 'technician', '08:00', '17:00', true, 34, ['Brakes & suspension', 'Commercial vehicles']],
  ['Tomás Ó Súilleabháin', 'technician', '10:00', '19:00', true, 35, ['Transmission', 'Clutch & DMF']],
  ['Rebecca Nolan', 'technician', '08:00', '17:00', false, 33, ['Servicing', 'NCT preparation']],
  ['Andrzej Kowalczyk', 'technician', '10:00', '19:00', true, 37, ['Engine rebuild', 'Turbo & DPF']],
  ['Ciara Hennessy', 'technician', '08:00', '16:00', true, 32, ['Air conditioning', 'Servicing']],
  ['Liam Prendergast', 'technician', '08:00', '17:00', false, 36, ['Diagnostics', 'ADAS calibration']],
  ['David Igwe', 'technician', '12:00', '20:00', true, 34, ['Tyres & alignment', 'Brakes']],
  ['Katarzyna Nowak', 'advisor', '08:00', '17:00', true, 0, []],
  ['Eoin Barrett', 'advisor', '09:00', '18:00', true, 0, []],
  ['Grace Mullen', 'parts', '08:00', '17:00', true, 0, []],
  ['Paul Hanrahan', 'manager', '07:30', '17:30', true, 0, []],
  ['Fiona Cassidy', 'accountant', '09:00', '15:00', false, 0, []],
  ['Amy Ryan', 'receptionist', '08:00', '16:30', true, 0, []],
  ['Declan Shanahan', 'owner', '08:00', '18:00', true, 0, []],
]

export const STAFF: StaffMember[] = STAFF_SEED.map(([name, roleId, start, end, onDuty, rate, specialisms], i) => {
  const billed = roleId === 'technician' ? 96 + ((i * 13) % 48) : 0
  return {
    id: `stf-${i + 1}`,
    name,
    roleId: roleId as StaffMember['roleId'],
    email: `${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').split(' ')[0]}@shannonsidemotorworks.ie`,
    phone: `08${(6 + (i % 3))} ${100 + i * 7} ${2000 + i * 131}`,
    initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    hourlyRate: rate || undefined,
    specialisms,
    shift: { start, end, days: [1, 2, 3, 4, 5] },
    onDuty,
    hiredOn: at(-(400 + i * 97), '09:00'),
    stats: {
      jobsCompleted: roleId === 'technician' ? 18 + ((i * 5) % 17) : 0,
      billedHours: billed,
      availableHours: roleId === 'technician' ? 152 : 0,
      reworkRate: roleId === 'technician' ? Math.round(((i % 4) * 0.9 + 0.4) * 10) / 10 : 0,
      avgJobHours: roleId === 'technician' ? Math.round((2.1 + (i % 5) * 0.4) * 10) / 10 : 0,
    },
  }
})

export const TECHS = STAFF.filter((s) => s.roleId === 'technician')

/* ============================ BAYS ============================ */

export const BAYS: Bay[] = [
  { id: 'bay-1', name: 'Bay 01', kind: 'Lift', status: 'free' },
  { id: 'bay-2', name: 'Bay 02', kind: 'Lift', status: 'free' },
  { id: 'bay-3', name: 'Bay 03', kind: 'Diagnostic', status: 'free' },
  { id: 'bay-4', name: 'Bay 04', kind: 'Diagnostic', status: 'free' },
  { id: 'bay-5', name: 'Bay 05', kind: 'General', status: 'free' },
  { id: 'bay-6', name: 'Bay 06', kind: 'General', status: 'free' },
  { id: 'bay-7', name: 'Bay 07', kind: 'Alignment', status: 'free' },
  { id: 'bay-8', name: 'Bay 08', kind: 'NCT prep', status: 'blocked', note: 'Brake tester recalibration until 14:00' },
]

/* ============================ DTC LIBRARY ============================ */

export const DTC_LIBRARY: Record<string, DTC> = {
  P0401: {
    code: 'P0401',
    system: 'Emissions',
    title: 'Exhaust Gas Recirculation Flow Insufficient',
    severity: 'medium',
    state: 'confirmed',
    detail:
      'The engine control module commanded EGR flow and measured less differential pressure than expected across the valve. Typically carbon build-up on the valve seat or a stuck pintle. Left untreated it will raise NOx output and can fail an emissions test.',
    freezeFrame: [
      { label: 'Engine speed', value: '1,840 rpm' },
      { label: 'Coolant temp', value: '89 °C' },
      { label: 'Load', value: '46 %' },
      { label: 'EGR commanded', value: '38 %' },
      { label: 'EGR actual', value: '11 %' },
      { label: 'Occurrences', value: '7' },
    ],
    suggestedRepair: {
      title: 'Replace EGR valve and gasket',
      labourHours: 2.5,
      parts: [{ partNumber: '11717810751', qty: 1 }, { partNumber: '11717810752', qty: 1 }],
      notes: 'Clean intake manifold face on removal. Reset adaptation values and road test to confirm flow within tolerance.',
    },
  },
  P0302: {
    code: 'P0302',
    system: 'Engine',
    title: 'Cylinder 2 Misfire Detected',
    severity: 'high',
    state: 'confirmed',
    detail:
      'Crankshaft speed irregularity attributed to cylinder 2 exceeded threshold under load. Coil, plug, injector or compression. Continued driving risks catalyst damage.',
    freezeFrame: [
      { label: 'Engine speed', value: '2,410 rpm' },
      { label: 'Misfire count cyl 2', value: '318' },
      { label: 'Fuel trim (short)', value: '+9.4 %' },
      { label: 'Load', value: '62 %' },
      { label: 'Occurrences', value: '12' },
    ],
    suggestedRepair: {
      title: 'Replace ignition coil and plug set (cyl 2)',
      labourHours: 1.2,
      parts: [{ partNumber: '12137594937', qty: 1 }, { partNumber: '12120037607', qty: 1 }],
      notes: 'Swap-test coil to cylinder 3 to confirm before ordering. Check for oil in plug well.',
    },
  },
  B1234: {
    code: 'B1234',
    system: 'Climate',
    title: 'Climate Control Sensor Fault — Interior Temperature',
    severity: 'low',
    state: 'stored',
    detail:
      'Interior temperature sensor reading out of plausible range against ambient. Usually a blocked aspirator fan or a failed thermistor. Comfort issue only.',
    freezeFrame: [
      { label: 'Sensor reading', value: '−40 °C' },
      { label: 'Ambient', value: '14 °C' },
      { label: 'Occurrences', value: '3' },
    ],
    suggestedRepair: {
      title: 'Replace interior climate sensor',
      labourHours: 0.8,
      parts: [{ partNumber: '64116928326', qty: 1 }],
      notes: 'Check aspirator hose is clear before condemning the sensor.',
    },
  },
  P2002: {
    code: 'P2002',
    system: 'Emissions',
    title: 'Diesel Particulate Filter Efficiency Below Threshold',
    severity: 'high',
    state: 'confirmed',
    detail:
      'Differential pressure across the DPF stayed high after a completed regeneration cycle. Filter is loaded with ash rather than soot.',
    freezeFrame: [
      { label: 'Soot load', value: '112 %' },
      { label: 'Ash load', value: '78 %' },
      { label: 'Regens since fault', value: '4' },
      { label: 'Distance since regen', value: '210 km' },
    ],
    suggestedRepair: {
      title: 'Forced regeneration, then DPF replacement if unresolved',
      labourHours: 3.5,
      parts: [{ partNumber: 'DPF-CLN-K1', qty: 1 }],
      notes: 'Attempt forced regen first. Quote DPF replacement as a second stage if soot load does not drop below 40 %.',
    },
  },
  P0128: {
    code: 'P0128',
    system: 'Engine',
    title: 'Coolant Thermostat Below Regulating Temperature',
    severity: 'medium',
    state: 'confirmed',
    detail: 'Coolant did not reach the modelled operating temperature within the expected time. Thermostat stuck open.',
    freezeFrame: [
      { label: 'Coolant at fault', value: '71 °C' },
      { label: 'Expected', value: '88 °C' },
      { label: 'Ambient', value: '11 °C' },
    ],
    suggestedRepair: {
      title: 'Replace thermostat and refill coolant',
      labourHours: 1.6,
      parts: [{ partNumber: '11537793960', qty: 1 }, { partNumber: 'FEBI-G12-5L', qty: 1 }],
      notes: 'Vacuum-fill the system and run a bleed cycle.',
    },
  },
  C1275: {
    code: 'C1275',
    system: 'Chassis',
    title: 'Front Left Wheel Speed Sensor — Signal Erratic',
    severity: 'medium',
    state: 'pending',
    detail: 'Intermittent signal dropout above 40 km/h. ABS and traction control disabled while active.',
    freezeFrame: [
      { label: 'Speed at fault', value: '52 km/h' },
      { label: 'Dropouts', value: '19' },
    ],
    suggestedRepair: {
      title: 'Inspect front left wheel bearing / sensor ring',
      labourHours: 1.4,
      parts: [{ partNumber: '33416792361', qty: 1 }],
      notes: 'Check reluctor ring for damage before replacing bearing kit.',
    },
  },
  P0234: {
    code: 'P0234',
    system: 'Engine',
    title: 'Turbocharger Overboost Condition',
    severity: 'high',
    state: 'confirmed',
    detail: 'Actual boost exceeded commanded boost by more than 350 mbar. Sticking variable geometry mechanism is the usual cause.',
    freezeFrame: [
      { label: 'Boost commanded', value: '1,420 mbar' },
      { label: 'Boost actual', value: '1,810 mbar' },
      { label: 'Engine speed', value: '3,050 rpm' },
    ],
    suggestedRepair: {
      title: 'Replace turbocharger',
      labourHours: 6.5,
      parts: [{ partNumber: '11657823256', qty: 1 }, { partNumber: 'CAST-5W30-5L', qty: 1 }],
      notes: 'Prime the new unit before start. Inspect intercooler for oil carry-over.',
    },
  },
  P0135: {
    code: 'P0135',
    system: 'Emissions',
    title: 'O2 Sensor Heater Circuit — Bank 1 Sensor 1',
    severity: 'medium',
    state: 'confirmed',
    detail: 'Heater circuit resistance out of range. Sensor slow to reach closed loop, raising cold-start emissions.',
    freezeFrame: [
      { label: 'Heater current', value: '0.1 A' },
      { label: 'Expected', value: '1.3 A' },
    ],
    suggestedRepair: {
      title: 'Replace upstream lambda sensor',
      labourHours: 1.0,
      parts: [{ partNumber: '11787589121', qty: 1 }],
      notes: 'Use anti-seize sparingly, torque to 45 Nm.',
    },
  },
  U0100: {
    code: 'U0100',
    system: 'Network',
    title: 'Lost Communication With ECM/PCM',
    severity: 'high',
    state: 'stored',
    detail: 'A momentary CAN bus dropout was recorded. Frequently a corroded connector or a failing battery causing voltage sag on crank.',
    freezeFrame: [
      { label: 'Battery at fault', value: '9.6 V' },
      { label: 'Occurrences', value: '2' },
    ],
    suggestedRepair: {
      title: 'Replace battery and re-test charging system',
      labourHours: 0.7,
      parts: [{ partNumber: 'VAR-F21-AGM', qty: 1 }],
      notes: 'Register the new battery to the power management module.',
    },
  },
  P0087: {
    code: 'P0087',
    system: 'Engine',
    title: 'Fuel Rail Pressure Too Low',
    severity: 'high',
    state: 'confirmed',
    detail: 'Rail pressure fell below the commanded value under load. Restricted fuel filter is the first check.',
    freezeFrame: [
      { label: 'Rail commanded', value: '1,350 bar' },
      { label: 'Rail actual', value: '810 bar' },
      { label: 'Load', value: '88 %' },
    ],
    suggestedRepair: {
      title: 'Replace fuel filter and re-test rail pressure',
      labourHours: 1.1,
      parts: [{ partNumber: '13327811227', qty: 1 }],
      notes: 'If pressure is still low, quote for high-pressure pump testing.',
    },
  },
}
