import { ROLES, STAFF } from '../data/catalogue'
import type { RoleId } from '../data/types'

/* ============================================================
   PROTOTYPE CREDENTIALS — NOT SECURITY.

   These accounts ship inside the client bundle, so anyone who
   opens devtools can read every one of them. They exist to make
   the role model demonstrable, nothing more.

   Everything the app needs from an identity provider goes through
   `authenticate()` below. Swapping this file for a real backend
   call (Auth0, Clerk, Supabase, your own /api/session) is the only
   change needed on this side: it returns the same shape, and the
   rest of the app never touches credentials.
   ============================================================ */

/** Shown on the sign-in screen, because this is a demo. */
export const DEMO_PASSWORD = 'workshop2026'

export interface Account {
  staffId: string
  email: string
  name: string
  roleId: RoleId
  roleName: string
  /** Where this role lands after signing in. */
  home: '/app' | '/tech'
  /** Prototype only. A real system never holds this client-side. */
  password: string
  /** Suspended accounts can still be listed but cannot sign in. */
  active: boolean
}

export const ACCOUNTS: Account[] = STAFF.map((s) => {
  const role = ROLES.find((r) => r.id === s.roleId)!
  return {
    staffId: s.id,
    email: s.email,
    name: s.name,
    roleId: s.roleId,
    roleName: role.name,
    home: role.home === 'tech' ? '/tech' : '/app',
    password: DEMO_PASSWORD,
    active: true,
  }
})

/** One representative account per role, for the demo picker. */
export const DEMO_ACCOUNTS: Account[] = ROLES
  .map((r) => ACCOUNTS.find((a) => a.roleId === r.id))
  .filter((a): a is Account => !!a)

export const accountByEmail = (email: string) =>
  ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())

export const accountByStaffId = (staffId: string) => ACCOUNTS.find((a) => a.staffId === staffId)

export type AuthFailure = 'unknown-email' | 'wrong-password' | 'suspended'

export type AuthResult =
  | { ok: true; account: Account }
  | { ok: false; reason: AuthFailure }

/**
 * The single seam between the app and an identity provider.
 * Replace the body with a network call and nothing else changes.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  // a beat, so the signing-in state is visible rather than instant
  await new Promise((r) => setTimeout(r, 420))

  const account = accountByEmail(email)
  if (!account) return { ok: false, reason: 'unknown-email' }
  if (!account.active) return { ok: false, reason: 'suspended' }
  if (password !== account.password) return { ok: false, reason: 'wrong-password' }
  return { ok: true, account }
}

export const FAILURE_MESSAGE: Record<AuthFailure, string> = {
  'unknown-email': 'No account with that email address.',
  'wrong-password': 'That password is not right.',
  suspended: 'That account has been suspended. Ask an owner to reactivate it.',
}
