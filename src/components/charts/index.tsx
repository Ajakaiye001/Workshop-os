import { useState } from 'react'
import { cx } from '../ui'

/* Data-viz palette: one accent (hi-vis) plus muted analytic hues.
   Series colours never repeat inside a chart, and each is legible on both themes. */
export const SERIES = [
  'var(--hv)',
  'oklch(0.62 0.13 250)',
  'oklch(0.66 0.12 300)',
  'oklch(0.68 0.12 195)',
  'oklch(0.72 0.13 62)',
  'oklch(0.60 0.10 160)',
]

interface Pt { label: string; value: number; secondary?: number }

/* ---------------- vertical bars with optional stacked secondary ---------------- */

export function BarChart({ data, height = 168, format = (n: number) => String(Math.round(n)), stackLabels }: {
  data: Pt[]; height?: number; format?: (n: number) => string; stackLabels?: [string, string]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value + (d.secondary ?? 0))) * 1.12 || 1
  const ticks = 4
  return (
    <div>
      {stackLabels && (
        <div className="mb-3 flex items-center gap-4">
          {stackLabels.map((l, i) => (
            <span key={l} className="flex items-center gap-1.5 text-2xs text-ink-3">
              <span className="h-2 w-2 rounded-xs" style={{ background: SERIES[i] }} />{l}
            </span>
          ))}
        </div>
      )}
      <div className="relative" style={{ height }}>
        {Array.from({ length: ticks + 1 }).map((_, i) => (
          <div key={i} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(i / ticks) * 100}%` }}>
            <span className="num w-10 shrink-0 text-right text-2xs text-ink-4">{format((max * i) / ticks)}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-[3px]">
          {data.map((d, i) => {
            const h = (d.value / max) * 100
            const h2 = ((d.secondary ?? 0) / max) * 100
            return (
              <div
                key={d.label + i}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {hover === i && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-raised px-2 py-1 text-2xs shadow-pop">
                    <div className="font-medium">{d.label}</div>
                    <div className="num text-ink-3">{format(d.value)}{d.secondary !== undefined && ` · ${format(d.secondary)}`}</div>
                  </div>
                )}
                {d.secondary !== undefined && (
                  <div className="w-full rounded-t-[2px] transition-opacity" style={{ height: `${h2}%`, background: SERIES[1], opacity: hover === null || hover === i ? 1 : 0.4 }} />
                )}
                <div
                  className={cx('w-full transition-opacity', d.secondary === undefined && 'rounded-t-[2px]')}
                  style={{ height: `${h}%`, background: SERIES[0], opacity: hover === null || hover === i ? 1 : 0.4 }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="ml-12 mt-1.5 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-2xs text-ink-4">{d.label}</div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- area / line ---------------- */

export function AreaChart({ data, height = 180, format = (n: number) => String(Math.round(n)) }: { data: Pt[]; height?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 640
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1
  const min = 0
  const x = (i: number) => (i / (data.length - 1)) * w
  const y = (v: number) => height - ((v - min) / (max - min)) * (height - 10) - 5
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
            setHover(Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))
          }}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--hv)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--hv)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1="0" x2={w} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#areaFill)" />
          <path d={line} fill="none" stroke="var(--hv)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && data[hover] && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(data[hover].value)} r="3.5" fill="var(--hv)" stroke="var(--raised)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute top-1 rounded border border-line bg-raised px-2 py-1 text-2xs shadow-pop"
            style={{ left: `${(hover / (data.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}>
            <div className="font-medium">{data[hover].label}</div>
            <div className="num text-ink-3">{format(data[hover].value)}</div>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-2xs text-ink-4">
        {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0).map((d) => <span key={d.label}>{d.label}</span>)}
      </div>
    </div>
  )
}

/* ---------------- donut ---------------- */

export function Donut({ data, size = 132, thickness = 16, centre }: { data: Pt[]; size?: number; thickness?: number; centre?: { value: string; label: string } }) {
  const total = data.reduce((t, d) => t + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * c
          const el = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={SERIES[i % SERIES.length]} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
        {centre && (
          <g className="rotate-90" style={{ transformOrigin: 'center' }}>
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--ink)"
              style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{centre.value}</text>
            <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fill="var(--ink-4)" style={{ fontSize: 9.5 }}>{centre.label}</text>
          </g>
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-xs" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="truncate text-ink-2">{d.label}</span>
            <span className="num ml-auto shrink-0 font-medium">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- horizontal ranked bars ---------------- */

export function RankedBars({ data, format = (n: number) => String(n), tone = 'var(--hv)' }: { data: Pt[]; format?: (n: number) => string; tone?: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="truncate text-xs text-ink-2">{d.label}</span>
            <span className="num shrink-0 text-xs font-medium">{format(d.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(d.value / max) * 100}%`, background: tone }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
