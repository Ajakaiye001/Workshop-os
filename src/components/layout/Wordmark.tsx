export function Mark({ size = 22, invert }: { size?: number; invert?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7.5" fill={invert ? 'var(--hv)' : 'var(--ink)'} />
      <path
        d="M7.4 10.2h3.35l2.15 7.55 2.25-7.55h2.9l2.25 7.55 2.15-7.55h3.35l-3.72 11.6h-3.3l-2.28-7.2-2.28 7.2h-3.3z"
        fill={invert ? 'var(--ink)' : 'var(--hv)'}
      />
    </svg>
  )
}

export function Wordmark({ size = 18, invert, className }: { size?: number; invert?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <Mark size={size + 6} invert={invert} />
      <span
        style={{
          fontFamily: 'Archivo, Inter, sans-serif',
          fontVariationSettings: "'wdth' 108",
          fontWeight: 700,
          fontSize: size,
          letterSpacing: '-0.028em',
        }}
      >
        Workshop<span style={{ color: 'var(--ink-3)' }}>OS</span>
      </span>
    </span>
  )
}
