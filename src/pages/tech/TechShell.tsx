import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useShop } from '../../data/store'
import { useAuth } from '../../auth/AuthProvider'
import { Avatar, Badge, Icon, MenuItem, Popover, Toaster } from '../../components/ui'
import { Mark } from '../../components/layout/Wordmark'

export default function TechShell() {
  const shop = useShop()
  const auth = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])


  const me = shop.me
  const mine = shop.jobs.filter((j) => j.technicianId === me.id && !['completed'].includes(j.status))
  const isDetail = loc.pathname !== '/tech'

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
          {isDetail ? (
            <button onClick={() => nav('/tech')} className="-ml-1 flex h-9 items-center gap-1 rounded px-2 text-sm text-ink-2 transition-colors hover:bg-sunken hover:text-ink">
              <Icon name="chevronLeft" size={16} />
              Jobs
            </button>
          ) : (
            <Link to="/tech" className="flex items-center gap-2">
              <Mark size={24} />
              <span className="text-sm font-semibold tracking-tight">Floor</span>
            </Link>
          )}

          <div className="flex-1" />

          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone={me.onDuty ? 'hv' : 'neutral'}>{me.onDuty ? 'On duty' : 'Off duty'}</Badge>
            <span className="num font-mono text-xs text-ink-3">
              {me.shift.start}–{me.shift.end}
            </span>
          </div>
          <span className="num font-mono text-sm text-ink-2">
            {now.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>

          <Popover
            width={250}
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-2 rounded p-1 transition-colors hover:bg-sunken">
                <Avatar name={me.name} size={30} tone="hv" />
                <Icon name="chevronDown" size={12} className="text-ink-4" />
              </button>
            )}
          >
            {(close) => (
              <div>
                <div className="border-b border-line px-3.5 py-2.5">
                  <div className="text-sm font-medium">{me.name}</div>
                  <div className="text-2xs text-ink-4">{shop.myRole.name} · {mine.length} open jobs</div>
                </div>
                <div className="py-1">
                  <div className="px-3 pb-1 pt-1.5 text-2xs uppercase tracking-[0.09em] text-ink-4">Switch technician</div>
                  {shop.staff.filter((s) => s.roleId === 'technician').slice(0, 6).map((s) => (
                    <MenuItem key={s.id} icon={s.id === me.id ? 'check' : undefined}
                      onClick={() => { auth.switchAccount(s.id); nav('/tech'); close() }}>
                      {s.name}
                    </MenuItem>
                  ))}
                </div>
                <div className="border-t border-line py-1">
                  <MenuItem icon="gauge" onClick={() => { const mgr = shop.staff.find((s) => s.roleId === 'manager')!; auth.switchAccount(mgr.id); nav('/app'); close() }}>
                    Back to workshop admin
                  </MenuItem>
                  <MenuItem icon="logout" tone="bad" onClick={() => { auth.signOut(); close(); nav('/signin', { replace: true }) }}>
                    Sign out
                  </MenuItem>
                </div>
              </div>
            )}
          </Popover>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-5">
        <Outlet />
      </main>

      <Toaster toasts={shop.toasts} onDismiss={shop.dismissToast} onNavigate={(to) => nav(to)} />
    </div>
  )
}
