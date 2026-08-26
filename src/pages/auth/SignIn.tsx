import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, FAILURE_MESSAGE } from '../../auth/accounts'
import { Button, Callout, Checkbox, Field, Icon, Input, cx } from '../../components/ui'
import { Wordmark } from '../../components/layout/Wordmark'
import { asset } from '../../lib/asset'

export default function SignIn() {
  const { status, account, signIn } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [showDemo, setShowDemo] = useState(true)

  // already signed in? go where they were headed, or to their own surface
  useEffect(() => {
    if (status === 'authenticated' && account) {
      nav(next && next.startsWith('/') ? next : account.home, { replace: true })
    }
  }, [status, account, next, nav])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)

    const fe: typeof fieldErrors = {}
    if (!email.trim()) fe.email = 'Enter your email address'
    if (!password) fe.password = 'Enter your password'
    setFieldErrors(fe)
    if (Object.keys(fe).length) return

    setBusy(true)
    const res = await signIn(email, password, remember)
    setBusy(false)

    if (!res.ok) {
      setError(FAILURE_MESSAGE[res.reason])
      if (res.reason === 'wrong-password') setPassword('')
      return
    }
    nav(next && next.startsWith('/') ? next : res.account.home, { replace: true })
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setFieldErrors({})
  }

  return (
    <div data-theme="dark" className="mkt flex min-h-screen bg-paper text-ink lg:h-screen lg:overflow-hidden">
      {/* ---------- form ---------- */}
      <div className="flex w-full flex-col overflow-y-auto px-6 py-8 lg:w-[560px] lg:shrink-0 lg:px-12">
        <Link to="/" className="inline-flex w-fit items-center gap-2">
          <Wordmark size={19} />
        </Link>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-[-0.025em]">Sign in</h1>
          <p className="mt-2 text-sm text-ink-3">
            What you can see and do is set by your role.
          </p>

          {error && (
            <Callout tone="bad" icon="alert" className="mt-5" title="Could not sign you in">
              {error}
            </Callout>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" error={fieldErrors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })) }}
                placeholder="you@shannonsidemotorworks.ie"
                autoComplete="username"
                invalid={!!fieldErrors.email}
                autoFocus
              />
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  invalid={!!fieldErrors.password}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-2xs text-ink-4 transition-colors hover:text-ink-2"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-4">
              <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />
              <span className="cursor-default text-xs text-ink-4">Forgot password?</span>
            </div>

            <Button type="submit" variant="hv" size="lg" full loading={busy} className="h-12 text-md">
              {busy ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          {/* ---------- demo accounts ---------- */}
          <div className="mt-8 rounded-xl border border-line bg-surface">
            <button
              onClick={() => setShowDemo((s) => !s)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-hv text-hv-ink">
                <Icon name="users" size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Try a role</span>
                <span className="block text-2xs text-ink-4">Seven demo accounts, one click each</span>
              </span>
              <Icon name="chevronDown" size={14} className={cx('text-ink-4 transition-transform', showDemo && 'rotate-180')} />
            </button>

            {showDemo && (
              <div className="border-t border-line p-2">
                <ul className="max-h-[232px] space-y-1 overflow-y-auto">
                  {DEMO_ACCOUNTS.map((a) => (
                    <li key={a.staffId}>
                      <button
                        onClick={() => useDemo(a.email)}
                        className={cx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-raised',
                          email === a.email && 'bg-raised')}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{a.roleName}</span>
                          <span className="block truncate text-2xs text-ink-4">{a.name} · {a.email}</span>
                        </span>
                        <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-2xs text-ink-4">
                          {a.home === '/tech' ? 'Floor' : 'Admin'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="px-2.5 pb-1 pt-2 text-2xs leading-relaxed text-ink-4">
                  Password for all demo accounts: <span className="font-mono text-ink-3">{DEMO_PASSWORD}</span>
                </p>
              </div>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 text-2xs leading-relaxed text-ink-4">
            <Icon name="alert" size={13} className="mt-px shrink-0" />
            <span>
              Prototype sign-in. These accounts are held in the browser, not on a server, so this gates the interface
              but is not real security. It is built behind one function, so a real identity provider can replace it
              without touching the rest of the app.
            </span>
          </p>
        </div>

        <Link to="/" className="inline-flex w-fit items-center gap-1.5 text-xs text-ink-4 transition-colors hover:text-ink-2">
          <Icon name="chevronLeft" size={13} />
          Back to workshopos.ie
        </Link>
      </div>

      {/* ---------- side panel ---------- */}
      <div className="relative hidden flex-1 lg:block">
        <img
          src={asset("img/workshop-floor.jpg")}
          alt="A bright multi-bay workshop with cars on ramps and technicians at work"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute inset-0 bg-[oklch(0.14_0.012_260/0.74)]" />
        <span className="absolute inset-0 bg-gradient-to-r from-[var(--paper)] via-transparent to-transparent" />
        <span className="absolute inset-0 bg-gradient-to-t from-[oklch(0.14_0.012_260/0.85)] via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <blockquote className="mkt-display max-w-[20ch] text-[clamp(1.6rem,2.4vw,2.4rem)]">
            Everything about the car, in one place.
          </blockquote>
          <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-ink-2">
            Jobs, parts, staff and invoices behind one sign-in, with each person seeing only what their role needs.
          </p>
        </div>
      </div>
    </div>
  )
}
