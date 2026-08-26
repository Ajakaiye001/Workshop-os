import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, cx, type IconName } from '../../components/ui'
import { Mark, Wordmark } from '../../components/layout/Wordmark'

/* ============================================================
   The marketing surface runs its own visual world: graphite
   ground, hi-vis accent, Archivo carrying everything through
   its width axis. Committed colour, not restrained.

   Copy rule for this page: a garage owner should understand the
   offer without decoding a fault code. Product detail is allowed,
   but only after the plain-English promise has landed.
   ============================================================ */

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={cx('transition-[opacity,transform] duration-700 ease-out-expo', className)}
      style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(18px)', transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/** Photo with a reserved box, so nothing jumps as images arrive. */
function Photo({ src, alt, ratio = '4/3', className, imgClass, priority }: {
  src: string; alt: string; ratio?: string; className?: string; imgClass?: string; priority?: boolean
}) {
  return (
    <div className={cx('relative overflow-hidden bg-surface', className)} style={{ aspectRatio: ratio }}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cx('h-full w-full object-cover', imgClass)}
      />
    </div>
  )
}

export default function Landing() {
  return (
    <div data-theme="dark" className="mkt min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <TrustStrip />
      <Problem />
      <OneSystem />
      <SeeItWork />
      <HowItWorks />
      <Showcase />
      <Benefits />
      <Proof />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}

/* ---------------- nav ---------------- */

const NAV_LINKS = [
  ['What it does', '#one-system'],
  ['See it work', '#see-it-work'],
  ['How it works', '#how'],
  ['Pricing', '#pricing'],
] as const

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className={cx('sticky top-0 z-40 transition-colors duration-300', (scrolled || menuOpen) && 'border-b border-line bg-paper')}>
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center gap-8 px-6">
        <Link to="/" onClick={() => setMenuOpen(false)}><Wordmark size={19} /></Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map(([l, h]) => (
            <a key={l} href={h} className="text-sm text-ink-3 transition-colors hover:text-ink">{l}</a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link to="/signin" className="hidden text-sm text-ink-3 transition-colors hover:text-ink md:block">Sign in</Link>
          {/* below md the hamburger carries these, so the bar never crushes */}
          <Link
            to="/app"
            className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-hv px-4 text-sm font-semibold text-hv-ink transition-transform duration-150 hover:brightness-105 active:scale-[0.98] md:inline-flex"
          >
            Open the demo
            <Icon name="arrowRight" size={14} />
          </Link>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="-mr-1 flex h-10 w-10 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface md:hidden"
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-paper px-6 py-4 md:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map(([l, h]) => (
              <li key={l}>
                <a
                  href={h}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-md px-2 py-3 text-lg font-medium transition-colors hover:bg-surface"
                >
                  {l}
                  <Icon name="chevronRight" size={16} className="text-ink-4" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-hv text-md font-semibold text-hv-ink"
            >
              Open the demo
              <Icon name="arrowRight" size={16} />
            </Link>
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className="flex h-12 items-center justify-center rounded-lg border border-line-strong text-md font-medium"
            >
              Sign in
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}

/* ---------------- hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="field-grid pointer-events-none absolute inset-0 opacity-70" />
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.10] blur-[90px]"
        style={{ background: 'var(--hv)' }}
      />

      <div className="relative mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-12 px-6 pb-16 pt-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <div className="mkt-eyebrow mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-hv" />
            For independent garages
          </div>

          <h1 className="mkt-display text-[clamp(2.6rem,6.4vw,4.5rem)]">
            Diagnose.<br />Repair.<br />Manage.<br />
            <span className="text-hv">All connected.</span>
          </h1>

          <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-ink-2">
            One place for every job, every part and every invoice. You always know where a car is and what it is
            waiting on, without walking the floor to find out.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app" className="inline-flex h-12 items-center gap-2 rounded-lg bg-hv px-6 text-md font-semibold text-hv-ink transition-transform duration-150 hover:brightness-105 active:scale-[0.985]">
              Start free trial
              <Icon name="arrowRight" size={16} />
            </Link>
            <a href="#see-it-work" className="inline-flex h-12 items-center gap-2 rounded-lg border border-line-strong px-6 text-md font-medium transition-colors hover:bg-surface">
              <Icon name="play" size={14} />
              See it work
            </a>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-line pt-6">
            {[
              'Set up in an afternoon',
              'Works with the scan tool you own',
              'No contract',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-ink-3">
                <Icon name="check" size={14} className="shrink-0 text-hv" strokeWidth={2.6} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <Reveal delay={120}>
          <figure className="relative">
            <Photo
              src="/img/hero-mechanic.jpg"
              alt="A technician leaning into an engine bay with a work light, checking a wiring connector"
              ratio="4/5"
              priority
              className="rounded-2xl border border-line"
            />
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[oklch(0.14_0.012_260/0.72)] via-transparent to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <div className="text-sm font-semibold">Shannonside Motorworks, Athlone</div>
              <div className="mt-0.5 text-2xs text-ink-2">9 technicians · 8 bays · running on WorkshopOS</div>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- trust strip ---------------- */

function TrustStrip() {
  const names = ['Shannonside Motorworks', 'Kilbeggan Autocentre', 'Northgate Fleet Services', 'Bandon Motor Works', 'Liffey Commercials', 'Tramore Tyre & Service']
  return (
    <section className="border-y border-line bg-surface py-7">
      <div className="mx-auto max-w-[1180px] px-6">
        <p className="mkt-eyebrow mb-5 text-center text-ink-4">Running on the floor at independent workshops</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
          {names.map((n) => (
            <li key={n} className="text-sm font-semibold tracking-tight text-ink-4" style={{ fontVariationSettings: "'wdth' 88" }}>{n}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------------- problem ---------------- */

function Problem() {
  const tools = [
    { label: 'Diagnostic tool', note: 'Codes stay on the device' },
    { label: 'Paper job cards', note: 'Illegible by Thursday' },
    { label: 'Phone call to the factor', note: 'Twenty minutes on hold' },
    { label: 'Stock spreadsheet', note: 'Last updated in March' },
    { label: 'Accounting software', note: 'Retyped from the job card' },
    { label: 'WhatsApp to the customer', note: 'No record of what was agreed' },
  ]
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20 lg:py-28">
      <Reveal>
        <div className="max-w-[38ch]">
          <div className="mkt-eyebrow mb-4 text-ink-4">The problem</div>
          <h2 className="mkt-display text-[clamp(1.9rem,3.9vw,3rem)]">
            Six tools that never talk to each other.
          </h2>
          <p className="mt-5 text-md leading-relaxed text-ink-3">
            Most workshops run on this. Every one of them holds a piece of the same job, and none of them knows
            about the others.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <ul className="mt-10 flex flex-wrap gap-2.5">
          {tools.map((t, i) => (
            <li
              key={t.label}
              className="rounded-lg border border-dashed border-line bg-surface px-3.5 py-2.5"
              style={{ transform: `rotate(${(i % 3 - 1) * 0.8}deg)` }}
            >
              <div className="text-sm font-medium text-ink-2">{t.label}</div>
              <div className="mt-0.5 text-2xs text-ink-4">{t.note}</div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}

/* ---------------- one system ---------------- */

const MODULES = ['Diagnostics', 'Jobs', 'Parts', 'Purchasing', 'Staff', 'Customers', 'Invoices', 'Reports']

function OneSystem() {
  const points = [
    ['Every car on one screen', 'Who is working on it, which bay it is in, what it is waiting on.'],
    ['Nothing typed twice', 'The registration taken at reception is the one on the invoice.'],
    ['The parts desk sees the job', 'No more walking out to the bay to ask what is needed.'],
    ['The customer keeps up', 'They approve and pay from a link, instead of ringing at five.'],
  ]
  return (
    <section id="one-system" className="border-y border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <div className="max-w-[42ch]">
            <div className="mkt-eyebrow mb-4 text-ink-4">What it does</div>
            <h2 className="mkt-display text-[clamp(1.9rem,3.9vw,3rem)]">One system for the whole workshop.</h2>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
          <Reveal>
            <Photo
              src="/img/workshop-floor.jpg"
              alt="A bright multi-bay workshop with cars on ramps and technicians working at several bays"
              ratio="16/10"
              className="rounded-2xl border border-line"
            />
          </Reveal>

          <Reveal delay={100}>
            <dl className="divide-y divide-[color:var(--line)]">
              {points.map(([t, b]) => (
                <div key={t} className="py-4 first:pt-0 last:pb-0">
                  <dt className="flex items-start gap-2.5 text-lg font-semibold tracking-[-0.018em]">
                    <Icon name="check" size={17} className="mt-1 shrink-0 text-hv" strokeWidth={2.6} />
                    {t}
                  </dt>
                  <dd className="mt-1.5 pl-[27px] text-sm leading-relaxed text-ink-3">{b}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="mt-12 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-6">
            <span className="mkt-eyebrow mr-2 text-ink-4">All in one place</span>
            {MODULES.map((m) => (
              <span key={m} className="rounded-full border border-line bg-raised px-3 py-1 text-xs text-ink-2">{m}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- see it work (the animation, as a feature) ---------------- */

const FLOW = [
  {
    icon: 'scan' as IconName,
    label: 'The scan tool finds the fault',
    plain: 'You plug in. The codes land on the job instead of staying on the device.',
    tech: 'P0401 · EGR flow insufficient',
  },
  {
    icon: 'wrench' as IconName,
    label: 'It turns into a priced repair',
    plain: 'Labour time and the parts it needs come with it. No looking anything up.',
    tech: 'Replace EGR valve · 2.5 h labour',
  },
  {
    icon: 'box' as IconName,
    label: 'Stock is checked, the part is ordered',
    plain: 'Not on the shelf? Compare your suppliers on price and delivery, then order.',
    tech: '0 on shelf · AutoParts Direct €295, tomorrow',
  },
  {
    icon: 'receipt' as IconName,
    label: 'The invoice writes itself',
    plain: 'Parts, labour and VAT are already there. The customer pays from their phone.',
    tech: '€620.14 including VAT at 23%',
  },
]

function SeeItWork() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const { ref, shown } = useReveal<HTMLDivElement>()

  useEffect(() => {
    if (!playing || !shown) return
    const t = setInterval(() => setStep((s) => (s + 1) % FLOW.length), 3200)
    return () => clearInterval(t)
  }, [playing, shown])

  return (
    <section id="see-it-work" className="mx-auto max-w-[1180px] px-6 py-20 lg:py-28" ref={ref}>
      <Reveal>
        <div className="max-w-[46ch]">
          <div className="mkt-eyebrow mb-4 text-ink-4">See it work</div>
          <h2 className="mkt-display text-[clamp(1.9rem,3.9vw,3rem)]">One job, start to finish.</h2>
          <p className="mt-5 text-md leading-relaxed text-ink-3">
            A real BMW 320d that came in with an engine light. Four steps, and nobody retyped a thing.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        {/* plain-language steps, clickable */}
        <Reveal>
          <ol className="space-y-2">
            {FLOW.map((f, i) => {
              const active = i === step
              return (
                <li key={f.label}>
                  <button
                    onClick={() => { setStep(i); setPlaying(false) }}
                    className={cx('flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-300',
                      active ? 'border-[var(--hv-40)] bg-surface' : 'border-transparent hover:bg-surface/60')}
                  >
                    <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300',
                      active ? 'bg-hv text-hv-ink' : 'bg-surface text-ink-4')}>
                      <Icon name={f.icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="mkt-eyebrow text-ink-4">{String(i + 1).padStart(2, '0')}</span>
                        <span className={cx('text-md font-semibold tracking-[-0.015em]', !active && 'text-ink-2')}>{f.label}</span>
                      </span>
                      <span className={cx('mt-1 block text-sm leading-relaxed transition-colors', active ? 'text-ink-3' : 'text-ink-4')}>
                        {f.plain}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="mt-4 flex items-center gap-3 pl-4">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 text-2xs text-ink-4 transition-colors hover:text-ink-2"
            >
              <Icon name={playing ? 'pause' : 'play'} size={11} />
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className="text-2xs text-ink-4">or tap a step</span>
          </div>
        </Reveal>

        {/* the work order, as the software actually shows it */}
        <Reveal delay={120}>
          <div className="rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
            <div className="rounded-xl border border-line bg-raised">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <Mark size={16} />
                <span className="font-mono text-2xs text-ink-4">JOB-10482</span>
                <span className="text-2xs text-ink-4">·</span>
                <span className="text-2xs text-ink-3">2019 BMW 320d</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-sm bg-warn-bg px-1.5 py-0.5 text-2xs font-medium text-warn">
                  Awaiting parts
                </span>
              </div>

              <ul className="p-3">
                {FLOW.map((f, i) => {
                  const active = i === step
                  const done = i < step
                  return (
                    <li
                      key={f.label}
                      className={cx('flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-500',
                        active ? 'bg-sunken' : 'opacity-50')}
                    >
                      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-500',
                        active ? 'bg-hv text-hv-ink' : done ? 'bg-line text-ink-2' : 'bg-sunken text-ink-4')}>
                        <Icon name={f.icon} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{f.label}</span>
                        <span className="block truncate font-mono text-2xs text-ink-4">{f.tech}</span>
                      </span>
                      {active && <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-hv" />}
                    </li>
                  )
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-2xs text-ink-4">What the office sees while it happens</span>
                <span className="num font-mono text-sm font-semibold">€620.14</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 pl-1">
            <Link to="/app/jobs/job-32" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink">
              Open this job in the demo
              <Icon name="arrowRight" size={14} />
            </Link>
            <span className="text-2xs text-ink-4">No sign-up, real data</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- how it works ---------------- */

const STEPS = [
  { n: '01', t: 'Book it in', b: 'Take the call, add the customer and the car, and the job card opens itself. New customer? Add them as you go.' },
  { n: '02', t: 'Find the fault', b: 'Plug in the scan tool. Codes, freeze frame and history land on the job, not on a scrap of paper.' },
  { n: '03', t: 'Price the work', b: 'Turn a fault into a priced repair in one press. Labour time and the parts it needs come with it.' },
  { n: '04', t: 'Get the parts', b: 'Stock is checked instantly. If it is not on the shelf, compare your suppliers on price and delivery.' },
  { n: '05', t: 'Do the job', b: 'The technician sees the concern, the approved work and the parts, on a tablet in the bay. Nothing else.' },
  { n: '06', t: 'Get paid', b: 'The invoice is already written. The customer approves, tracks and pays from a link on their phone.' },
]

function HowItWorks() {
  return (
    <section id="how" className="border-y border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <div className="mkt-eyebrow mb-4 text-ink-4">How it works</div>
          <h2 className="mkt-display max-w-[16ch] text-[clamp(1.9rem,3.9vw,3rem)]">Six steps, start to finish.</h2>
        </Reveal>

        <div className="mt-12 divide-y divide-[color:var(--line)] border-y border-line">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 50}>
              <div className="group grid grid-cols-[minmax(0,1fr)] gap-3 py-7 md:grid-cols-[100px_190px_minmax(0,1fr)] md:items-baseline">
                <span
                  className="text-4xl font-bold leading-none text-ink-4 transition-colors duration-300 group-hover:text-hv"
                  style={{ fontVariationSettings: "'wdth' 118", letterSpacing: '-0.04em' }}
                >
                  {s.n}
                </span>
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{s.t}</h3>
                <p className="max-w-[62ch] text-md leading-relaxed text-ink-3">{s.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- feature showcase ---------------- */

function Showcase() {
  return (
    <section id="features" className="mx-auto max-w-[1180px] space-y-24 px-6 py-20 lg:py-28">
      <Feature
        eyebrow="Parts"
        title="Know what a part costs, and when it lands, before you promise anything."
        body="Every repair checks your shelf first. When stock is short, WorkshopOS puts your suppliers side by side on price and delivery, then turns your choice into an order that stays linked to the job."
        points={['Live stock, reserved against the car that needs it', 'Supplier price and delivery compared in one view', 'Goods in updates the shelf and unblocks the job']}
        photo={{ src: '/img/parts-wall.jpg', alt: 'A workshop wall hung with exhaust sections and catalytic converters', ratio: '3/4' }}
        visual={<PartsVisual />}
      />
      <Feature
        reverse
        eyebrow="On the floor"
        title="A screen for hands that are already busy."
        body="Technicians get their jobs, the customer's own words, the approved work and the parts. No pricing, no reports, no settings. Big targets, high contrast, and it works on a tablet mounted in the bay."
        points={['One tap to start work or mark it ready', 'Faults become repairs without leaving the bay', 'Parts requests reach the parts desk instantly']}
        photo={{ src: '/img/tech-under-lift.jpg', alt: 'A technician under a raised car, checking the underside with a tool in hand', ratio: '3/4' }}
        visual={<TechVisual />}
      />
      <Feature
        eyebrow="Your customers"
        title="They can see the same job you do."
        body="A link by text shows where the car is, what you found in plain English, what it costs including VAT, and a button to approve. Approval lands on the job the second they press it."
        points={['Live progress from check-in to collection', 'Approve or decline itemised work', 'Card payment before they arrive to collect']}
        photo={{ src: '/img/engine-bay.jpg', alt: 'A mechanic bent over an open engine bay in a service workshop', ratio: '3/4' }}
        visual={<PortalVisual />}
      />
    </section>
  )
}

function Feature({ eyebrow, title, body, points, visual, photo, reverse }: {
  eyebrow: string; title: string; body: string; points: string[]; visual: React.ReactNode
  photo: { src: string; alt: string; ratio: string }; reverse?: boolean
}) {
  return (
    <Reveal>
      <div className={cx('grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2 lg:items-center', reverse && 'lg:[&>*:first-child]:order-2')}>
        <div>
          <div className="mkt-eyebrow mb-4 text-hv">{eyebrow}</div>
          <h3 className="mkt-display text-[clamp(1.6rem,3vw,2.35rem)]">{title}</h3>
          <p className="mt-5 max-w-[54ch] text-md leading-relaxed text-ink-3">{body}</p>
          <ul className="mt-6 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink-2">
                <Icon name="check" size={15} className="mt-0.5 shrink-0 text-hv" strokeWidth={2.4} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* photo behind, product screen in front — the work and the software together.
            The card stays inside the photo box so it can never collide with the next section. */}
        <div className="relative">
          <Photo src={photo.src} alt={photo.alt} ratio={photo.ratio} className="rounded-2xl border border-line" />
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[oklch(0.14_0.012_260/0.35)]" />
          <div className="absolute bottom-4 right-4 w-[86%] max-w-[330px] sm:bottom-5 sm:right-5">
            {visual}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-1.5 shadow-lg">
      <div className="rounded-lg border border-line bg-paper">
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
          <span className="ml-1 truncate font-mono text-[10px] text-ink-4">{label}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function PartsVisual() {
  const offers = [
    { name: 'AutoParts Direct', price: '€295.00', eta: 'Tomorrow', best: true },
    { name: 'Nordkamp Parts', price: '€281.00', eta: '4 days', best: false },
  ]
  return (
    <Frame label="EGR Valve · 0 in stock">
      <div className="p-3">
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <li key={o.name} className={cx('flex items-center gap-2.5 rounded-md border px-2.5 py-2',
              o.best ? 'border-[var(--hv-40)] bg-hv-dim' : 'border-line')}>
              <span className={cx('flex h-3 w-3 shrink-0 items-center justify-center rounded-full border', o.best ? 'border-hv bg-hv' : 'border-line-strong')}>
                {o.best && <span className="h-1 w-1 rounded-full bg-hv-ink" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-2xs">{o.name}</span>
              <span className="num shrink-0 text-2xs font-semibold">{o.price}</span>
              <span className="w-14 shrink-0 text-right text-[10px] text-ink-4">{o.eta}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-[10px] text-ink-4">Stays linked to JOB-10482</span>
          <span className="rounded bg-hv px-2 py-0.5 text-[10px] font-semibold text-hv-ink">Order</span>
        </div>
      </div>
    </Frame>
  )
}

function TechVisual() {
  return (
    <Frame label="Bay 04 · tablet">
      <div className="p-3">
        <div className="text-md font-semibold tracking-[-0.02em]">BMW 320d</div>
        <div className="mt-1 inline-flex h-[17px] items-center rounded-xs border border-line-strong bg-surface px-1 font-mono text-[10px] uppercase">191-D-12345</div>
        <div className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-hv text-xs font-semibold text-hv-ink">
          <Icon name="play" size={13} />Start repair
        </div>
        <ul className="mt-2 space-y-1.5">
          {[['Replace EGR valve', true], ['Ignition coil, cyl 2', false]].map(([task, done]) => (
            <li key={task as string} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5">
              <span className={cx('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border', done ? 'border-transparent bg-hv text-hv-ink' : 'border-line-strong')}>
                {done ? <Icon name="check" size={8} strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-2xs">{task}</span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  )
}

function PortalVisual() {
  const steps = [['Checked in', 'done'], ['Repair approved', 'done'], ['Parts ordered', 'done'], ['Repair in progress', 'now'], ['Ready for collection', 'todo']]
  return (
    <Frame label="Text message from your garage">
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Your car</div>
        <div className="mt-0.5 text-md font-semibold tracking-[-0.02em]">BMW 320d</div>
        <ol className="mt-2.5 space-y-1.5">
          {steps.map(([label, state]) => (
            <li key={label as string} className="flex items-center gap-2">
              <span className={cx('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2',
                state === 'done' ? 'border-transparent bg-ink text-on-ink' : state === 'now' ? 'border-hv bg-hv' : 'border-line')}>
                {state === 'done' ? <Icon name="check" size={7} strokeWidth={3} /> : state === 'now' ? <span className="h-1 w-1 rounded-full bg-hv-ink" /> : null}
              </span>
              <span className={cx('text-2xs', state === 'todo' ? 'text-ink-4' : state === 'now' ? 'font-semibold' : 'text-ink-2')}>{label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-[10px] text-ink-4">Total including VAT</span>
          <span className="num text-2xs font-semibold">€620.14</span>
        </div>
      </div>
    </Frame>
  )
}

/* ---------------- benefits ---------------- */

function Benefits() {
  const items = [
    ['Less time on the phone', 'The parts desk can see what every bay is waiting on, so nobody walks out to ask.'],
    ['Less paperwork', 'Nothing is typed twice. The estimate becomes the job, the job becomes the invoice.'],
    ['Fewer parts mix-ups', 'Stock is reserved against the car that needs it, so nothing gets fitted to the wrong one.'],
    ['Honest answers on the phone', 'Every car, bay and technician on one screen, so you can say when it will be ready.'],
    ['Money in sooner', 'Invoices go out the day the work is done, not the following Friday.'],
    ['Happier customers', 'They approve from their phone and watch the progress without ringing.'],
  ]
  return (
    <section className="border-y border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <div className="mkt-eyebrow mb-4 text-ink-4">Why workshops move</div>
          <h2 className="mkt-display max-w-[20ch] text-[clamp(1.9rem,3.9vw,3rem)]">What changes in the first month.</h2>
        </Reveal>
        <dl className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-8 md:grid-cols-2">
          {items.map(([t, b], i) => (
            <Reveal key={t} delay={i * 40}>
              <div className="border-t border-line pt-5">
                <dt className="text-lg font-semibold tracking-[-0.018em]">{t}</dt>
                <dd className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-3">{b}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ---------------- proof ---------------- */

function Proof() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20 lg:py-28">
      <Reveal>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <Photo
            src="/img/tyre-hands.jpg"
            alt="Gloved hands checking a tyre on a car raised in a workshop"
            ratio="1/1"
            className="rounded-2xl border border-line"
          />
          <figure>
            <blockquote className="mkt-display text-[clamp(1.5rem,3.2vw,2.4rem)] leading-[1.1]">
              “We stopped losing an hour a day to the phone. The lad on the parts desk can see what every bay is
              waiting on.”
            </blockquote>
            <figcaption className="mt-6 text-sm text-ink-3">
              <span className="font-semibold text-ink">Paul Hanrahan</span> · Workshop Manager, Shannonside Motorworks
              <div className="mt-1 text-2xs text-ink-4">9 technicians · 8 bays · Athlone</div>
            </figcaption>
          </figure>
        </div>
      </Reveal>

      <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-3">
        {[
          ['Invoices used to go out on Friday. Now they go out the same day the car leaves.', 'Fiona Cassidy', 'Accountant, Kilbeggan Autocentre'],
          ['I can see the fault codes from the last visit before I even lift the bonnet.', 'Andrzej Kowalczyk', 'Technician, Northgate Fleet'],
          ['Customers approve at lunchtime instead of ringing back at five.', 'Eoin Barrett', 'Service Advisor, Bandon Motor Works'],
        ].map(([q, name, role], i) => (
          <Reveal key={name} delay={i * 80}>
            <figure className="border-t border-line pt-5">
              <blockquote className="text-md leading-relaxed text-ink-2">“{q}”</blockquote>
              <figcaption className="mt-3 text-2xs text-ink-4">
                <span className="font-medium text-ink-3">{name}</span> · {role}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal delay={150}>
        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[['6.5 h', 'admin saved per advisor, weekly'], ['31%', 'fewer jobs stuck waiting on parts'], ['4 days', 'faster average payment'], ['92%', 'estimates approved online']].map(([v, l]) => (
            <div key={l} className="bg-raised px-5 py-6">
              <div className="num text-3xl font-semibold tracking-[-0.03em]">{v}</div>
              <div className="mt-1.5 text-2xs leading-relaxed text-ink-4">{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs text-ink-4">
          Prototype content. The quotes, names, workshops and figures on this page are illustrative, not real customers.
        </p>
      </Reveal>
    </section>
  )
}

/* ---------------- pricing ---------------- */

const TIERS = [
  {
    name: 'Starter', price: '€89', per: 'per month', blurb: 'One or two bays, an owner who still turns spanners.',
    features: ['Up to 3 users', 'Jobs, customers and vehicles', 'Estimates and invoicing', 'Basic stock control', 'Customer portal', 'Email support'],
    cta: 'Start free trial', highlight: false,
  },
  {
    name: 'Professional', price: '€229', per: 'per month', blurb: 'The full platform for a working independent workshop.',
    features: ['Up to 15 users', 'Everything in Starter', 'Scan tool integration', 'Supplier comparison and ordering', 'Bay and shift planning', 'Reporting and margins', 'Roles and permissions', 'Phone support'],
    cta: 'Start free trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', per: 'talk to us', blurb: 'Multi-site groups and fleet contracts.',
    features: ['Unlimited users and sites', 'Everything in Professional', 'Fleet accounts and monthly billing', 'Accounting integrations', 'Single sign-on', 'Setup and data migration', 'Named account manager'],
    cta: 'Book a call', highlight: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="border-y border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <div className="max-w-[46ch]">
            <div className="mkt-eyebrow mb-4 text-ink-4">Pricing</div>
            <h2 className="mkt-display text-[clamp(1.9rem,3.9vw,3rem)]">Priced per workshop, not per headache.</h2>
            <p className="mt-5 text-md leading-relaxed text-ink-3">
              Every plan includes the technician app, the customer portal and as many job cards as you can get through.
              Prototype pricing, shown to make the shape of the offer clear.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div className={cx('flex h-full flex-col rounded-xl border p-6',
                t.highlight ? 'border-[var(--hv-40)] bg-hv-dim' : 'border-line bg-raised')}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-[-0.018em]">{t.name}</h3>
                  {t.highlight && <span className="rounded-sm bg-hv px-1.5 py-0.5 text-2xs font-bold text-hv-ink">Most workshops</span>}
                </div>
                <p className="mt-1.5 text-sm text-ink-3">{t.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="num text-4xl font-semibold tracking-[-0.035em]">{t.price}</span>
                  <span className="text-sm text-ink-4">{t.per}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                      <Icon name="check" size={14} className={cx('mt-0.5 shrink-0', t.highlight ? 'text-hv' : 'text-ink-4')} strokeWidth={2.4} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/app"
                  className={cx('mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-transform duration-150 active:scale-[0.985]',
                    t.highlight ? 'bg-hv text-hv-ink hover:brightness-105' : 'border border-line-strong hover:bg-surface')}
                >
                  {t.cta}
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <Reveal>
        <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-2xl bg-hv px-8 py-16 text-hv-ink sm:px-14">
          <div className="field-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="mkt-display max-w-[16ch] text-[clamp(2rem,4.4vw,3.4rem)]">
              Run your workshop from one connected platform.
            </h2>
            <p className="mt-5 max-w-[50ch] text-md leading-relaxed opacity-80">
              Fourteen days free. Bring your parts list and your open jobs, and see the difference by the end of the week.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[color:var(--hv-ink)] px-6 text-md font-semibold text-hv transition-transform duration-150 active:scale-[0.985]">
                Start free trial
                <Icon name="arrowRight" size={16} />
              </Link>
              <Link to="/portal/job-32" className="inline-flex h-12 items-center gap-2 rounded-lg border border-[color:var(--hv-ink)]/30 px-6 text-md font-medium transition-colors hover:bg-[color:var(--hv-ink)]/10">
                See what the customer sees
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ---------------- footer ---------------- */

function Footer() {
  const cols = [
    ['Product', ['Technician app', 'Workshop admin', 'Customer portal', 'Parts and ordering', 'Reporting']],
    ['Company', ['About', 'Careers', 'Customers', 'Press', 'Contact']],
    ['Help', ['Help centre', 'Getting started', 'Scan tool support', 'API documentation', 'Status']],
    ['Legal', ['Privacy', 'Terms', 'Data processing', 'Security']],
  ] as const
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1180px] px-6 py-14">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark size={17} />
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-ink-4">
              Workshop management software built around the job card, for independent garages and multi-bay workshops.
            </p>
            <div className="mt-5 flex items-center gap-2 text-2xs text-ink-4">
              <span className="h-1.5 w-1.5 rounded-full bg-hv" />
              A prototype, built to show the product idea
            </div>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <div className="mkt-eyebrow mb-3.5 text-ink-4">{title}</div>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l}><span className="cursor-default text-sm text-ink-3 transition-colors hover:text-ink">{l}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-2xs text-ink-4">
          <span>© {new Date().getFullYear()} WorkshopOS. Prototype content throughout.</span>
          <div className="flex gap-4">
            <Link to="/app" className="hover:text-ink">Workshop admin</Link>
            <Link to="/tech" className="hover:text-ink">Technician app</Link>
            <Link to="/portal/job-32" className="hover:text-ink">Customer portal</Link>
          </div>
        </div>
        <p className="mt-4 text-2xs leading-relaxed text-ink-4">
          Photographs by Sten Rademaker, Jimmy Nilsson Masth, Mehmet Talha Onuk, engin akyurt and Kate Ibragimova on
          Unsplash. The people pictured are not connected to WorkshopOS.
        </p>
      </div>
    </footer>
  )
}
