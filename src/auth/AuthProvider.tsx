import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useShop } from '../data/store'
import { accountByStaffId, authenticate, type Account, type AuthFailure } from './accounts'
import { Spinner } from '../components/ui'

/* ============================================================
   Session handling.

   The session is a signed-in staff id plus an expiry. It lives in
   localStorage when "keep me signed in" is ticked and sessionStorage
   otherwise, so closing the tab ends the session by default — which
   is what you want on a machine at a reception desk.

   A real deployment replaces the stored id with a token from the
   identity provider and re-validates it server-side on every request.
   ============================================================ */

const KEY = 'workshopos.session'
const REMEMBER_DAYS = 30

interface StoredSession { staffId: string; expiresAt: number }

function readStored(): StoredSession | null {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = store.getItem(KEY)
      if (!raw) continue
      const s = JSON.parse(raw) as StoredSession
      if (!s?.staffId || typeof s.expiresAt !== 'number') { store.removeItem(KEY); continue }
      if (Date.now() > s.expiresAt) { store.removeItem(KEY); continue }
      return s
    } catch {
      try { store.removeItem(KEY) } catch { /* storage unavailable */ }
    }
  }
  return null
}

function writeStored(s: StoredSession, remember: boolean) {
  try {
    const store = remember ? window.localStorage : window.sessionStorage
    const other = remember ? window.sessionStorage : window.localStorage
    other.removeItem(KEY)
    store.setItem(KEY, JSON.stringify(s))
  } catch { /* private mode — the session just won't survive a reload */ }
}

function clearStored() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try { store.removeItem(KEY) } catch { /* ignore */ }
  }
}

/* ---------------- context ---------------- */

type Status = 'restoring' | 'authenticated' | 'anonymous'

interface AuthCtx {
  status: Status
  account: Account | null
  signIn: (email: string, password: string, remember: boolean) => Promise<{ ok: true; account: Account } | { ok: false; reason: AuthFailure }>
  /** Demo shortcut: become another seeded account without typing a password. */
  switchAccount: (staffId: string) => Account | null
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const shop = useShop()
  const { dispatch } = shop
  const [status, setStatus] = useState<Status>('restoring')
  const [account, setAccount] = useState<Account | null>(null)

  // restore an existing session once, before anything renders behind the guard
  useEffect(() => {
    const stored = readStored()
    const acc = stored ? accountByStaffId(stored.staffId) : null
    if (acc && acc.active) {
      setAccount(acc)
      dispatch({ t: 'signIn', staffId: acc.staffId })
      setStatus('authenticated')
    } else {
      if (stored) clearStored()
      setStatus('anonymous')
    }
  }, [dispatch])

  const start = useCallback((acc: Account, remember: boolean) => {
    const expiresAt = Date.now() + (remember ? REMEMBER_DAYS : 1) * 86400_000
    writeStored({ staffId: acc.staffId, expiresAt }, remember)
    setAccount(acc)
    dispatch({ t: 'signIn', staffId: acc.staffId })
    setStatus('authenticated')
  }, [dispatch])

  const signIn = useCallback<AuthCtx['signIn']>(async (email, password, remember) => {
    const res = await authenticate(email, password)
    if (!res.ok) return res
    start(res.account, remember)
    return res
  }, [start])

  const switchAccount = useCallback<AuthCtx['switchAccount']>((staffId) => {
    const acc = accountByStaffId(staffId)
    if (!acc || !acc.active) return null
    start(acc, false)
    return acc
  }, [start])

  const signOut = useCallback(() => {
    clearStored()
    setAccount(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({ status, account, signIn, switchAccount, signOut }),
    [status, account, signIn, switchAccount, signOut],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

/* ---------------- route guards ---------------- */

function Restoring() {
  return (
    <div className="flex min-h-screen items-center justify-center text-ink-4">
      <Spinner size={20} />
    </div>
  )
}

/**
 * Blocks a subtree until there is a session. Sends anyone without one to
 * the sign-in screen, remembering where they were headed.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const loc = useLocation()
  if (status === 'restoring') return <Restoring />
  if (status === 'anonymous') {
    const next = `${loc.pathname}${loc.search}`
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children}</>
}

/**
 * Keeps each role in the surface built for it. A technician who lands on
 * /app is sent to the floor app rather than shown a wall of no-access panels.
 */
export function RequireSurface({ surface, children }: { surface: '/app' | '/tech'; children: React.ReactNode }) {
  const { status, account } = useAuth()
  if (status === 'restoring') return <Restoring />
  if (status === 'anonymous') return <>{children}</>
  if (account && account.home !== surface) return <Navigate to={account.home} replace />
  return <>{children}</>
}
