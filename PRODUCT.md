# WorkshopOS

**Diagnose. Repair. Manage. All connected.**

Workshop management software for independent garages and multi-bay automotive
workshops. One platform covering diagnostics, work orders, parts, inventory,
purchasing, staff, customers and invoicing.

`register: product` (the app) · `register: brand` (the marketing site at `/`)

## The problem

A typical independent workshop runs on six disconnected tools: a diagnostic
device that keeps its codes to itself, paper job cards, a phone call to the
motor factor, a stock spreadsheet last updated in March, accounting software
everything is retyped into, and WhatsApp to the customer. Nothing joins up, so
the same information is typed four times and nobody can answer "when will my
car be ready" without walking to the bay.

## The idea

The **work order is the spine**. Every module reads from it and writes back to
it. A fault code becomes a priced repair; the repair checks stock; a shortfall
becomes a purchase order; goods-in unblocks the job; the completed job becomes
an invoice with Irish VAT already calculated. Information entered once is used
everywhere.

## Users

| Role | Where they live | What they need |
|---|---|---|
| Owner | Admin | Everything. Money, people, throughput. |
| Workshop Manager | Admin | The floor: jobs, bays, technicians, parts. |
| Service Advisor | Admin | The customer conversation and the estimate. |
| Parts Manager | Admin | Stock, suppliers, purchase orders, goods in. |
| Technician | Technician app | Their jobs, diagnostics, parts requests, notes. Nothing else. |
| Accountant | Admin | Invoicing, payments, VAT, financial reporting. |
| Receptionist | Admin | Bookings, check-in, keys, phones. |
| Customer | Portal | Where is my car, what does it cost, approve, pay. |

Access is **role plus permission**, not hardcoded levels. Twenty-one
permissions, editable per role in Settings → Roles, applied live.

## Tone

Plain, specific, unhurried. The voice of someone who has actually stood in a
workshop: "Waiting on parts — do not start", not "Status: BLOCKED". No
exclamation marks, no growth-hacking. Numbers are exact and in euro.

## Anti-references

Not a legacy garage management system: no dense grey toolbars, no modal-on-modal,
no eight-level menus. Not a generic SaaS template either: no gradient hero
metrics, no identical icon-card grids, no racing stripes or chequered flags.
Automotive is a context, not a costume.

## Strategic principles

1. **The work order is the only object that matters.** Everything links back to it.
2. **Never ask for information the system already has.** Registration typed at
   reception is the registration on the invoice.
3. **Show the blockage, not the status.** "Waiting on EGR Valve" beats "Awaiting parts".
4. **The technician screen is a tool, not a dashboard.** Strip everything that is
   not the job in front of them.
5. **The customer sees the same truth the workshop does.**
