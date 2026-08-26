# WorkshopOS

An interactive, high-fidelity prototype of a workshop management platform for
independent automotive garages. Four connected experiences, one codebase, one
in-memory data model.

```bash
npm install
npm run dev      # http://localhost:4260
npm run build    # typecheck + production bundle
npm run preview  # http://localhost:4261
```

## The four surfaces

| Route | Surface | Who | Access |
|---|---|---|---|
| `/` | Marketing site | Prospects | Public |
| `/signin` | Sign in | Staff | Public |
| `/app` | Workshop admin | Owner, manager, advisor, parts, accountant, receptionist | Session required |
| `/tech` | Technician app (always dark) | Technicians on the floor | Session required |
| `/portal/:jobId` | Customer portal | The vehicle owner | Link only, see below |

Switch **role** from the avatar in the top right — the navigation, the actions
and the financial columns change immediately with that role's permissions.

## Signing in

`/app` and `/tech` are behind a session. Anyone without one is sent to
`/signin` with a `next` parameter, and lands back where they were headed once
they sign in. Each role goes to the surface built for it: technicians to
`/tech`, everyone else to `/app`, and a technician who opens an `/app` URL is
redirected rather than shown a wall of no-access panels.

Every seeded staff member has an account. The sign-in screen lists one per role
with a single click to fill it in; the password for all of them is
`workshop2026`. **Keep me signed in** stores the session in `localStorage` for
30 days, otherwise it lives in `sessionStorage` and ends with the tab — which is
the right default for a shared machine at a reception desk.

> **This is prototype authentication, not security.** The accounts live in
> `src/auth/accounts.ts` and ship inside the client bundle, so anyone can read
> them. It exists to make the role model demonstrable. Every credential check
> goes through one function, `authenticate()`, and the session shape is the only
> thing the rest of the app knows about — point that function at a real identity
> provider and nothing else on this side changes. A real deployment must also
> enforce permissions server-side; the checks here are UI affordances and can be
> bypassed by anyone with devtools.
>
> The customer portal is deliberately reachable by link without a session, the
> way a "your car is ready" text works. In production those links need an
> unguessable token with an expiry — right now the job id is guessable.

## Flows that actually work

1. **Diagnose → repair → parts → purchase order.**
   Open a job → Diagnostics → *Connect and scan*. Modules read one by one, fault
   codes land with freeze-frame data. Expand a code → *Add repair to work order*.
   The repair, its labour and its parts appear on the job with live stock checked.
   A part that is out of stock offers *Source* → supplier comparison on price and
   ETA → purchase order linked back to the job.
2. **Low stock → PO → approve → receive → inventory updated.**
   Inventory → *Order* on a low line, or Purchasing → *Approve* → *Send order* →
   *Receive*. Receiving increments stock, reserves against the waiting job, moves
   that job from *Awaiting parts* to *In progress*, and raises a notification.
3. **Estimate → customer approval → invoice → payment.**
   Job → Estimate & invoice → *Send to customer*. Open `/portal/:id` to approve as
   the customer. Complete the job → *Generate invoice* → record a payment.
4. **Sign in → role → permissions → access-controlled UI.**
   Sign in as the Parts Manager and Reports and Invoices are not in the nav at
   all. Sign in as the Technician and you land on the floor app instead.
   Settings → Roles. Remove `finance.view` from Workshop Manager, then sign in as
   Paul Hanrahan: revenue metrics, job values and Invoices vanish from the nav.
5. **Customer → vehicle → history → current repair → invoice.**
   Every entity links to the next. ⌘K searches jobs, vehicles, customers, parts,
   invoices, POs and staff.
6. **Booking a customer who is not on file yet.**
   Bookings → *New booking* → *＋ Add a new customer* in the picker. The customer
   and vehicle forms open inline, validate, and are created together with the
   booking and the work order in one step. Typing a registration that already
   exists warns you and names the current owner instead of making a duplicate.
   The same forms are behind *Add customer* on the Customers page and
   *Add vehicle* on a customer profile.

## Architecture

```
src/
  data/
    types.ts       domain model (Job is the spine)
    catalogue.ts   roles, suppliers, 50 parts, 20 customers, 25 vehicles,
                   16 staff, 8 bays, DTC library
    seed.ts        38 work orders, 15 POs, 20 invoices, bookings, notifications
    store.tsx      React context + reducer — every mutation in the app
  auth/            accounts + authenticate(), session, route guards
  lib/             format (en-IE, EUR), money (23% Irish VAT), totals
  components/      ui kit, domain bits, SVG charts, app shell
  features/        Diagnostics console, SourcePart modal (shared surfaces)
  pages/           admin / tech / portal / marketing
```

State is a single reducer over an in-memory dataset, cloned per action. Every
component reads through `useShop()`. Swapping the seed for API calls means
replacing the initial state and turning each reducer case into a request — the
component layer does not change.

Dates are generated relative to *today* at load, so the board always looks live.
Refreshing the page resets the dataset.

## Notes

- Irish VAT at 23% on parts, labour and fees, applied to the net figure after
  any goodwill discount. VAT number, Eircodes, county registrations and euro
  pricing throughout.
- No component library and no chart library: the UI kit and the charts are in
  this repo.
- Design decisions and tokens: [DESIGN.md](DESIGN.md). Product thinking:
  [PRODUCT.md](PRODUCT.md).

## Credits and licence

Photographs are from [Unsplash](https://unsplash.com) under the Unsplash
Licence, by Sten Rademaker, Jimmy Nilsson Masth, Mehmet Talha Onuk, engin
akyurt and Kate Ibragimova. They are credited in the site footer as well. **The
people pictured have no connection to WorkshopOS.**

Typefaces are Google Fonts: Inter, Archivo and JetBrains Mono, all under the
SIL Open Font Licence.

Everything else in this repository is prototype work. WorkshopOS is not a real
company, Shannonside Motorworks is not a real workshop, and the customers,
vehicles, testimonials and figures throughout are invented to demonstrate the
product idea.
