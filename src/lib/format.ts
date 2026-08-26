export const eur = (n: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(n)

export const eur0 = (n: number) => eur(n, { cents: false })

export const num = (n: number, d = 0) =>
  new Intl.NumberFormat('en-IE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)

export const pct = (n: number, d = 0) => `${num(n * 100, d)}%`

const D = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

export const time = (v: string | Date) =>
  D(v).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })

export const dateShort = (v: string | Date) =>
  D(v).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })

export const dateMed = (v: string | Date) =>
  D(v).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })

export const dateLong = (v: string | Date) =>
  D(v).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const dateTime = (v: string | Date) => `${dateShort(v)} · ${time(v)}`

export function isToday(v: string | Date) {
  const d = D(v)
  const n = new Date()
  return d.toDateString() === n.toDateString()
}

export function relative(v: string | Date) {
  const diff = Date.now() - D(v).getTime()
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 1) return 'just now'
  if (mins > 0) {
    if (mins < 60) return `${mins}m ago`
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
    const days = Math.round(mins / 1440)
    if (days < 30) return `${days}d ago`
    return dateShort(v)
  }
  const a = Math.abs(mins)
  if (a < 60) return `in ${a}m`
  if (a < 60 * 24) return `in ${Math.round(a / 60)}h`
  return `in ${Math.round(a / 1440)}d`
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
