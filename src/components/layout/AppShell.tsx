import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { useAuth } from '../../auth/AuthProvider'
import type { Permission } from '../../data/types'
import { Avatar, Badge, Button, cx, Dot, Icon, IconButton, Kbd, MenuItem, Popover, Toaster, type IconName } from '../ui'
import { relative } from '../../lib/format'
import { CommandPalette } from './CommandPalette'
import { Wordmark } from './Wordmark'

interface NavItem { to: string; label: string; icon: IconName; perms?: Permission[]; end?: boolean; badge?: (s: ReturnType<typeof useShop>) => number | undefined }

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: '',
    items: [{ to: '/app', label: 'Overview', icon: 'gauge', perms: ['jobs.view'], end: true }],
  },
  {
    group: 'Workshop',
    items: [
      { to: '/app/jobs', label: 'Jobs', icon: 'clipboard', perms: ['jobs.view'], badge: (s) => s.jobs.filter((j) => ['awaiting-parts', 'awaiting-approval'].includes(j.status)).length },
      { to: '/app/bookings', label: 'Bookings', icon: 'calendar', perms: ['jobs.view'] },
      { to: '/app/bays', label: 'Bays', icon: 'grid', perms: ['jobs.view'] },
      { to: '/app/staff', label: 'Staff', icon: 'users', perms: ['staff.manage'] },
    ],
  },
  {
    group: 'Customers',
    items: [
      { to: '/app/customers', label: 'Customers', icon: 'building', perms: ['customers.view'] },
      { to: '/app/vehicles', label: 'Vehicles', icon: 'car', perms: ['vehicles.view'] },
    ],
  },
  {
    group: 'Parts',
    items: [
      { to: '/app/parts', label: 'Inventory', icon: 'box', perms: ['inventory.edit', 'parts.request'], badge: (s) => s.parts.filter((p) => p.qty - p.reserved <= 0).length },
      { to: '/app/purchasing', label: 'Purchasing', icon: 'truck', perms: ['po.create', 'po.approve'], badge: (s) => s.purchaseOrders.filter((p) => p.status === 'pending-approval').length },
      { to: '/app/suppliers', label: 'Suppliers', icon: 'layers', perms: ['po.create', 'po.approve'] },
    ],
  },
  {
    group: 'Money',
    items: [
      { to: '/app/invoices', label: 'Invoices', icon: 'receipt', perms: ['invoices.create', 'finance.view', 'payments.process'] },
      { to: '/app/reports', label: 'Reports', icon: 'chart', perms: ['reports.view'] },
    ],
  },
  {
    group: 'Admin',
    items: [{ to: '/app/settings', label: 'Settings', icon: 'cog', perms: ['settings.manage', 'roles.manage'] }],
  },
]

export function AppShell() {
  const shop = useShop()
  const nav = useNavigate()
  const loc = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { setMobileNav(false) }, [loc.pathname])

  const visible = NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.perms || i.perms.some((p) => shop.can(p))) }))
    .filter((g) => g.items.length)

  const unread = shop.notifications.filter((n) => !n.read && (!n.forPermission || shop.can(n.forPermission))).length

  return (
    <div className="flex min-h-screen bg-paper">
      {/* ---------- sidebar ---------- */}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-[236px] shrink-0 flex-col border-r border-line bg-panel transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        mobileNav ? 'translate-x-0 shadow-lg' : '-translate-x-full',
      )}>
        <div className="flex h-14 items-center justify-between px-4 shrink-0">
          <Link to="/app" className="flex items-center gap-2">
            <Wordmark size={17} />
          </Link>
          <IconButton icon="x" label="Close menu" size="sm" className="lg:hidden" onClick={() => setMobileNav(false)} />
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mb-3 flex h-8 items-center gap-2 rounded border border-line bg-surface px-2.5 text-sm text-ink-4 transition-colors hover:border-line-strong hover:text-ink-3"
        >
          <Icon name="search" size={14} />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {visible.map((g) => (
            <div key={g.group} className={cx(g.group && 'mt-4')}>
              {g.group && <div className="px-2 pb-1 text-2xs font-medium uppercase tracking-[0.1em] text-ink-4">{g.group}</div>}
              <ul className="space-y-px">
                {g.items.map((item) => {
                  const badge = item.badge?.(shop)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => cx(
                          'group relative flex h-8 items-center gap-2.5 rounded px-2 text-sm transition-colors duration-100',
                          isActive ? 'bg-raised text-ink font-medium shadow-xs' : 'text-ink-2 hover:bg-sunken hover:text-ink',
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <span className={cx('absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full transition-all duration-200',
                              isActive ? 'bg-hv opacity-100' : 'opacity-0')} />
                            <Icon name={item.icon} size={15} className={cx('shrink-0', isActive ? 'text-ink' : 'text-ink-4 group-hover:text-ink-3')} />
                            <span className="flex-1 truncate">{item.label}</span>
                            {!!badge && (
                              <span className="num inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-warn-bg px-1 text-2xs font-semibold text-warn">
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-2">
          <ExperienceSwitcher />
        </div>
      </aside>

      {mobileNav && <div className="fixed inset-0 z-30 bg-[oklch(0.2_0.02_260/0.4)] lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* ---------- main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper/85 px-4 backdrop-blur-md">
          <IconButton icon="menu" label="Open menu" size="sm" className="lg:hidden" onClick={() => setMobileNav(true)} />
          <Breadcrumbs />
          <div className="flex-1" />
          <ShiftClock />
          <IconButton
            icon={shop.theme === 'light' ? 'moon' : 'sun'}
            label={shop.theme === 'light' ? 'Switch to dark' : 'Switch to light'}
            size="sm"
            onClick={() => shop.setTheme(shop.theme === 'light' ? 'dark' : 'light')}
          />
          <NotificationBell unread={unread} />
          <div className="mx-1 h-5 w-px bg-line" />
          <RoleSwitcher />
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster toasts={shop.toasts} onDismiss={shop.dismissToast} onNavigate={(to) => nav(to)} />
    </div>
  )
}

/* ---------------- breadcrumbs ---------------- */

function Breadcrumbs() {
  const loc = useLocation()
  const shop = useShop()
  const parts = loc.pathname.split('/').filter(Boolean).slice(1)
  if (!parts.length) return <span className="text-sm font-medium">Overview</span>

  const label = (seg: string, i: number): string => {
    if (i === 0) return seg.charAt(0).toUpperCase() + seg.slice(1)
    if (seg.startsWith('job-')) return shop.getJob(seg)?.number ?? seg
    if (seg.startsWith('cus-')) return shop.getCustomer(seg)?.name ?? seg
    if (seg.startsWith('veh-')) { const v = shop.getVehicle(seg); return v ? `${v.make} ${v.model}` : seg }
    if (seg.startsWith('part-')) return shop.getPart(seg)?.name ?? seg
    if (seg.startsWith('po-')) return shop.purchaseOrders.find((p) => p.id === seg)?.number ?? seg
    if (seg.startsWith('inv-')) return shop.getInvoice(seg)?.number ?? seg
    if (seg.startsWith('stf-')) return shop.getStaff(seg)?.name ?? seg
    if (seg.startsWith('sup-')) return shop.getSupplier(seg)?.name ?? seg
    return seg.charAt(0).toUpperCase() + seg.slice(1)
  }

  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-sm">
      {parts.map((seg, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <Icon name="chevronRight" size={12} className="shrink-0 text-ink-4" />}
          {i === parts.length - 1 ? (
            <span className="truncate font-medium">{label(seg, i)}</span>
          ) : (
            <Link to={`/app/${parts.slice(0, i + 1).join('/')}`} className="truncate text-ink-3 hover:text-ink">{label(seg, i)}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}

/* ---------------- shift clock ---------------- */

function ShiftClock() {
  const [now, setNow] = useState(new Date())
  const shop = useShop()
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])
  const onDuty = shop.staff.filter((s) => s.onDuty && s.roleId === 'technician').length
  return (
    <div className="mr-1 hidden items-center gap-3 md:flex">
      <span className="num font-mono text-xs text-ink-3">
        {now.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-ink-3">
        <Dot tone="ok" />
        <span className="num">{onDuty}</span> techs on duty
      </span>
    </div>
  )
}

/* ---------------- notifications ---------------- */

function NotificationBell({ unread }: { unread: number }) {
  const shop = useShop()
  const nav = useNavigate()
  const list = shop.notifications.filter((n) => !n.forPermission || shop.can(n.forPermission))
  const kindIcon: Record<string, IconName> = { parts: 'box', approval: 'check', job: 'clipboard', stock: 'alert', money: 'euro', system: 'info' }
  return (
    <Popover
      width={380}
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded text-ink-2 transition-colors hover:bg-sunken hover:text-ink">
          <Icon name="bell" size={16} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-hv px-1 text-[9px] font-bold text-hv-ink num">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={() => shop.dispatch({ t: 'readNotification' })} className="text-2xs text-ink-3 hover:text-ink">Mark all read</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {list.slice(0, 12).map((n) => (
              <button
                key={n.id}
                onClick={() => { shop.dispatch({ t: 'readNotification', id: n.id }); if (n.link) nav(n.link); close() }}
                className={cx('flex w-full items-start gap-2.5 border-b border-line px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-sunken',
                  !n.read && 'bg-hv-dim')}
              >
                <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line',
                  n.read ? 'bg-sunken text-ink-4' : 'bg-raised text-ink-2')}>
                  <Icon name={kindIcon[n.kind] ?? 'info'} size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cx('truncate text-xs', n.read ? 'text-ink-2' : 'font-medium text-ink')}>{n.title}</span>
                    <span className="ml-auto shrink-0 text-2xs text-ink-4">{relative(n.at)}</span>
                  </span>
                  <span className="mt-0.5 block text-2xs leading-relaxed text-ink-3">{n.body}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hv" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  )
}

/* ---------------- role switcher ---------------- */

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const shop = useShop()
  const auth = useAuth()
  const nav = useNavigate()
  const demoUsers = shop.roles.map((r) => ({ role: r, staff: shop.staff.find((s) => s.roleId === r.id)! })).filter((x) => x.staff)

  return (
    <Popover
      width={300}
      trigger={({ toggle, open }) => (
        <button onClick={toggle} className={cx('flex items-center gap-2 rounded pl-1 pr-1.5 py-1 transition-colors hover:bg-sunken', open && 'bg-sunken')}>
          <Avatar name={shop.me.name} size={26} />
          {!compact && (
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight">{shop.me.name}</span>
              <span className="block text-2xs leading-tight text-ink-4">{shop.myRole.name}</span>
            </span>
          )}
          <Icon name="chevronDown" size={12} className="text-ink-4" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-line bg-surface px-3.5 py-2.5">
            <div className="text-2xs font-medium uppercase tracking-[0.09em] text-ink-4">Demo — sign in as</div>
            <p className="mt-1 text-2xs leading-relaxed text-ink-3">
              Navigation and actions change with the role's permissions.
            </p>
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {demoUsers.map(({ role, staff }) => (
              <button
                key={role.id}
                onClick={() => {
                  auth.switchAccount(staff.id)
                  close()
                  nav(role.home === 'tech' ? '/tech' : '/app')
                  shop.toast({ title: `Signed in as ${staff.name}`, body: `${role.name} · ${role.permissions.length} permissions`, tone: 'ok' })
                }}
                className={cx('flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-sunken',
                  staff.id === shop.currentStaffId && 'bg-sunken')}
              >
                <Avatar name={staff.name} size={26} tone={staff.id === shop.currentStaffId ? 'hv' : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{staff.name}</span>
                  <span className="block truncate text-2xs text-ink-4">{role.name}</span>
                </span>
                {role.home === 'tech' && <Badge tone="neutral">Floor</Badge>}
                {staff.id === shop.currentStaffId && <Icon name="check" size={14} className="shrink-0 text-hv-ink" />}
              </button>
            ))}
          </div>
          <div className="border-t border-line py-1">
            <MenuItem icon="shield" onClick={() => { nav('/app/settings/roles'); close() }}>Roles and permissions</MenuItem>
            <MenuItem icon="external" onClick={() => { nav('/'); close() }}>Back to workshopos.ie</MenuItem>
            <MenuItem icon="logout" tone="bad" onClick={() => { auth.signOut(); close(); nav('/signin', { replace: true }) }}>Sign out</MenuItem>
          </div>
        </div>
      )}
    </Popover>
  )
}

/* ---------------- experience switcher ---------------- */

export function ExperienceSwitcher() {
  const nav = useNavigate()
  const loc = useLocation()
  const shop = useShop()
  const auth = useAuth()
  const current = loc.pathname.startsWith('/tech') ? 'tech' : loc.pathname.startsWith('/portal') ? 'portal' : 'admin'
  const items: { id: string; label: string; icon: IconName; to: string; hint: string }[] = [
    { id: 'admin', label: 'Workshop admin', icon: 'gauge', to: '/app', hint: 'Front and back office' },
    { id: 'tech', label: 'Technician app', icon: 'wrench', to: '/tech', hint: 'Optimised for the floor' },
    { id: 'portal', label: 'Customer portal', icon: 'users', to: '/portal/job-32', hint: 'What the customer sees' },
  ]
  return (
    <Popover
      align="left"
      width={264}
      trigger={({ toggle, open }) => (
        <button onClick={toggle} className={cx('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-sunken', open && 'bg-sunken')}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-raised text-ink-2">
            <Icon name={items.find((i) => i.id === current)!.icon} size={13} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{items.find((i) => i.id === current)!.label}</span>
            <span className="block truncate text-2xs text-ink-4">Switch experience</span>
          </span>
          <Icon name="chevronDown" size={12} className="text-ink-4" />
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => {
                if (i.id === 'tech' && shop.myRole.id !== 'technician') {
                  const tech = shop.staff.find((s) => s.roleId === 'technician' && s.onDuty)!
                  auth.switchAccount(tech.id)
                }
                nav(i.to); close()
              }}
              className={cx('flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sunken', current === i.id && 'bg-sunken')}
            >
              <Icon name={i.icon} size={14} className="mt-0.5 shrink-0 text-ink-4" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{i.label}</span>
                <span className="block text-2xs text-ink-4">{i.hint}</span>
              </span>
              {current === i.id && <Icon name="check" size={13} className="mt-0.5 shrink-0 text-ink-3" />}
            </button>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <MenuItem icon="external" onClick={() => { nav('/'); close() }}>Marketing site</MenuItem>
          </div>
        </div>
      )}
    </Popover>
  )
}

export function PermissionGate({ perm, children, fallback }: { perm: Permission; children: React.ReactNode; fallback?: React.ReactNode }) {
  const shop = useShop()
  if (!shop.can(perm)) return <>{fallback ?? null}</>
  return <>{children}</>
}

export function NoAccess({ perm }: { perm: string }) {
  const shop = useShop()
  return (
    <div className="mx-auto max-w-md rounded-lg border border-line bg-raised p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sunken text-ink-4">
        <Icon name="lock" size={18} />
      </div>
      <h2 className="text-md font-semibold">Not available on your role</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-3">
        {shop.myRole.name} does not have the <span className="font-mono text-xs text-ink-2">{perm}</span> permission.
        An Owner can grant it in role settings.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button size="sm" onClick={() => history.back()}>Go back</Button>
        {shop.can('roles.manage') && (
          <Link to="/app/settings/roles">
            <Button size="sm" variant="primary">Open role settings</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
