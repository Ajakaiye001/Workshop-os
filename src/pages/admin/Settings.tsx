import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../../data/store'
import { PERMISSION_GROUPS } from '../../data/types'
import type { Permission, RoleId } from '../../data/types'
import {
  Avatar, Badge, Button, Callout, Checkbox, Field, Icon, Input, PageHeader, Panel, SectionLabel,
  Select, Switch, Table, Td, Th, Tr, cx,
} from '../../components/ui'
import { NoAccess } from '../../components/layout/AppShell'
import { eur } from '../../lib/format'

const SECTIONS = [
  { id: 'general', label: 'Workshop', icon: 'building' as const },
  { id: 'roles', label: 'Roles & permissions', icon: 'shield' as const },
  { id: 'rates', label: 'Rates & VAT', icon: 'euro' as const },
  { id: 'bays', label: 'Bays', icon: 'grid' as const },
  { id: 'integrations', label: 'Integrations', icon: 'link' as const },
]

export default function Settings() {
  const { section = 'general' } = useParams()
  const nav = useNavigate()
  const shop = useShop()

  if (!shop.can('settings.manage') && !shop.can('roles.manage')) return <NoAccess perm="settings.manage" />

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader title="Settings" sub={shop.settings.name} />

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav>
          <ul className="space-y-px">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => nav(s.id === 'general' ? '/app/settings' : `/app/settings/${s.id}`)}
                  className={cx('flex h-8 w-full items-center gap-2.5 rounded px-2.5 text-sm transition-colors',
                    section === s.id ? 'bg-raised font-medium text-ink shadow-xs' : 'text-ink-2 hover:bg-sunken')}
                >
                  <Icon name={s.icon} size={14} className={section === s.id ? 'text-ink' : 'text-ink-4'} />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {section === 'general' && <General />}
          {section === 'roles' && <Roles />}
          {section === 'rates' && <Rates />}
          {section === 'bays' && <BaySettings />}
          {section === 'integrations' && <Integrations />}
        </div>
      </div>
    </div>
  )
}

/* ---------------- general ---------------- */

function General() {
  const shop = useShop()
  const s = shop.settings
  return (
    <div className="space-y-5">
      <Panel title="Workshop details" subtitle="Appears on estimates, invoices and the customer portal" bodyClass="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trading name"><Input defaultValue={s.name} /></Field>
          <Field label="Legal entity"><Input defaultValue={s.legalName} /></Field>
          <Field label="Phone"><Input defaultValue={s.phone} /></Field>
          <Field label="Email"><Input defaultValue={s.email} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input defaultValue={s.address} /></Field>
          <Field label="Opening hours" className="sm:col-span-2"><Input defaultValue={s.openHours} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => shop.toast({ title: 'Workshop details saved', tone: 'ok' })}>Save changes</Button>
        </div>
      </Panel>

      <Panel title="Customer communication" bodyClass="p-4">
        <CommsToggles />
      </Panel>
    </div>
  )
}

const COMMS = [
  { key: 'ready', label: 'Text the customer when a vehicle is ready', hint: 'Sends the portal link with the collection time', on: true },
  { key: 'estimate', label: 'Email the estimate as soon as it is created', hint: 'Approval lands back on the work order', on: true },
  { key: 'nct', label: 'Send a service reminder 30 days before NCT', hint: 'Uses the NCT date on the vehicle record', on: true },
  { key: 'review', label: 'Ask for a review two days after collection', hint: 'Only for jobs that completed without a comeback', on: false },
]

function CommsToggles() {
  const shop = useShop()
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(COMMS.map((c) => [c.key, c.on])),
  )
  return (
    <div className="space-y-3">
      {COMMS.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-6 border-b border-line pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <div className="text-sm">{c.label}</div>
            <div className="mt-0.5 text-2xs text-ink-4">{c.hint}</div>
          </div>
          <Switch
            checked={on[c.key]}
            srLabel={c.label}
            onChange={(v) => {
              setOn((prev) => ({ ...prev, [c.key]: v }))
              shop.toast({ title: v ? 'Turned on' : 'Turned off', body: c.label })
            }}
          />
        </div>
      ))}
    </div>
  )
}

/* ---------------- roles ---------------- */

function Roles() {
  const shop = useShop()
  const [selected, setSelected] = useState<RoleId>('technician')
  const role = shop.roles.find((r) => r.id === selected)!
  const canEdit = shop.can('roles.manage')

  function toggle(p: Permission, on: boolean) {
    const next = on ? [...role.permissions, p] : role.permissions.filter((x) => x !== p)
    shop.dispatch({ t: 'setRolePermissions', roleId: role.id, permissions: next })
  }

  return (
    <div className="space-y-5">
      {!canEdit && (
        <Callout tone="neutral" icon="lock" title="Read only">
          Your role can see permissions but not change them. Only an Owner can edit roles.
        </Callout>
      )}

      <Panel title="Roles" subtitle="Seven roles ship by default. Permissions are per role, not per person." bodyClass="p-0">
        <Table>
          <thead><tr><Th>Role</Th><Th>What it is for</Th><Th>People</Th><Th align="right">Permissions</Th><Th>Lands in</Th></tr></thead>
          <tbody>
            {shop.roles.map((r) => {
              const people = shop.staff.filter((s) => s.roleId === r.id)
              return (
                <Tr key={r.id} onClick={() => setSelected(r.id)} selected={selected === r.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      {selected === r.id && <Badge tone="hv">Editing</Badge>}
                    </div>
                  </Td>
                  <Td><span className="text-xs text-ink-3">{r.blurb}</span></Td>
                  <Td>
                    <div className="flex -space-x-1.5">
                      {people.slice(0, 4).map((p) => <Avatar key={p.id} name={p.name} size={22} />)}
                      {people.length > 4 && <span className="ml-2.5 self-center text-2xs text-ink-4">+{people.length - 4}</span>}
                      {people.length === 0 && <span className="text-2xs text-ink-4">Nobody</span>}
                    </div>
                  </Td>
                  <Td align="right"><span className="num text-sm">{r.permissions.length}</span></Td>
                  <Td><Badge tone="neutral">{r.home === 'tech' ? 'Technician app' : 'Admin'}</Badge></Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </Panel>

      <Panel
        title={`${role.name} permissions`}
        subtitle={`${role.permissions.length} of 21 granted · changes apply immediately to everyone with this role`}
        bodyClass="p-4"
        actions={
          <div className="flex gap-1.5">
            <Button size="sm" disabled={!canEdit} onClick={() => shop.dispatch({ t: 'setRolePermissions', roleId: role.id, permissions: [] })}>Clear all</Button>
            <Button size="sm" variant="primary" disabled={!canEdit}
              onClick={() => {
                const target = shop.staff.find((s) => s.roleId === role.id)
                shop.toast({
                  title: `${role.name} updated`,
                  body: target ? `Sign in as ${target.name} to see the effect` : 'Nobody currently holds this role',
                  tone: 'ok',
                })
              }}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.label}>
              <SectionLabel>{g.label}</SectionLabel>
              <div className="mt-2 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {g.items.map((item) => (
                  <Checkbox
                    key={item.key}
                    checked={role.permissions.includes(item.key)}
                    disabled={!canEdit}
                    onChange={(on) => toggle(item.key, on)}
                    label={item.label}
                    hint={item.hint}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-md border border-line bg-surface p-3.5">
          <div className="flex items-start gap-2.5">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-4" />
            <div className="text-2xs leading-relaxed text-ink-3">
              <span className="font-medium text-ink-2">Try it. </span>
              Take <span className="font-mono">finance.view</span> off the Workshop Manager, then switch user with the
              avatar in the top right. Revenue metrics, job values and the invoices section disappear from the
              navigation without a reload.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- rates ---------------- */

function Rates() {
  const shop = useShop()
  const s = shop.settings
  return (
    <div className="space-y-5">
      <Panel title="Labour rates" bodyClass="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Standard labour" hint="Per hour, ex VAT"><Input defaultValue={s.labourRate} /></Field>
          <Field label="Diagnostic" hint="Flat fee per scan"><Input defaultValue={s.diagnosticRate} /></Field>
          <Field label="Consumables" hint="Added to every job"><Input defaultValue="12.50" /></Field>
        </div>
        <div className="mt-4 rounded-md border border-line bg-surface p-3">
          <SectionLabel>Worked example</SectionLabel>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">2.5 hours labour</dt><dd className="num">{eur(2.5 * s.labourRate)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Diagnostic scan</dt><dd className="num">{eur(s.diagnosticRate)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Consumables</dt><dd className="num">{eur(12.5)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1"><dt className="text-ink-3">VAT @ 23%</dt><dd className="num">{eur((2.5 * s.labourRate + s.diagnosticRate + 12.5) * 0.23)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total</dt><dd className="num">{eur((2.5 * s.labourRate + s.diagnosticRate + 12.5) * 1.23)}</dd></div>
          </dl>
        </div>
      </Panel>

      <Panel title="VAT" subtitle="Irish rates" bodyClass="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Standard rate" hint="Applies to parts and labour">
            <Select defaultValue="23">
              <option value="23">23% — standard</option>
              <option value="13.5">13.5% — reduced</option>
              <option value="0">0% — exempt</option>
            </Select>
          </Field>
          <Field label="VAT number"><Input defaultValue={s.vatNumber} /></Field>
        </div>
        <Callout tone="neutral" icon="info" className="mt-4" title="How VAT is applied">
          Motor repair labour and parts are both charged at the standard 23% rate. Every estimate, invoice and purchase
          order in WorkshopOS calculates VAT on the net figure after any goodwill discount.
        </Callout>
      </Panel>
    </div>
  )
}

/* ---------------- bays ---------------- */

function BaySettings() {
  const shop = useShop()
  return (
    <Panel title="Bays" subtitle={`${shop.bays.length} configured`} bodyClass="p-0"
      actions={<Button size="sm" icon="plus">Add bay</Button>}>
      <Table>
        <thead><tr><Th>Bay</Th><Th>Type</Th><Th>Status</Th><Th>Currently</Th><Th>Note</Th></tr></thead>
        <tbody>
          {shop.bays.map((b) => (
            <Tr key={b.id}>
              <Td mono>{b.name}</Td>
              <Td><Badge tone="neutral">{b.kind}</Badge></Td>
              <Td>
                <Badge tone={b.status === 'occupied' ? 'ok' : b.status === 'blocked' ? 'bad' : 'neutral'}>
                  {b.status === 'occupied' ? 'Working' : b.status === 'blocked' ? 'Out of service' : 'Free'}
                </Badge>
              </Td>
              <Td><span className="text-sm">{b.jobId ? shop.vehicleLabel(shop.getJob(b.jobId)?.vehicleId) : '—'}</span></Td>
              <Td><span className="text-xs text-ink-3">{b.note ?? '—'}</span></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  )
}

/* ---------------- integrations ---------------- */

function Integrations() {
  const items = [
    { name: 'AutoScan Pro X1', kind: 'Diagnostic tool', status: 'Connected', detail: 'Serial APX1-44718 · firmware 4.2.1 · last sync 6 minutes ago', on: true },
    { name: 'AutoParts Direct', kind: 'Supplier catalogue', status: 'Connected', detail: 'Live pricing and stock, 42,000 lines', on: true },
    { name: 'Nordkamp Parts Group', kind: 'Supplier catalogue', status: 'Connected', detail: 'Live pricing, 3–4 day lead time', on: true },
    { name: 'Stripe', kind: 'Payments', status: 'Connected', detail: 'Card payments through the customer portal', on: true },
    { name: 'Xero', kind: 'Accounting', status: 'Connected', detail: 'Invoices and purchase orders sync nightly', on: true },
    { name: 'Vehicle lookup (Irish registration)', kind: 'Data', status: 'Connected', detail: 'Make, model, engine and NCT status from a registration', on: true },
    { name: 'Twilio', kind: 'SMS', status: 'Not connected', detail: 'Text customers when a vehicle is ready', on: false },
  ]
  return (
    <Panel title="Integrations" subtitle="What WorkshopOS talks to" bodyClass="p-0">
      <ul>
        {items.map((i) => (
          <li key={i.name} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line',
              i.on ? 'bg-hv-dim text-hv-ink' : 'bg-sunken text-ink-4')}>
              <Icon name={i.on ? 'check' : 'plus'} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{i.name}</span>
                <Badge tone="neutral">{i.kind}</Badge>
              </span>
              <span className="mt-0.5 block truncate text-2xs text-ink-4">{i.detail}</span>
            </span>
            <Button size="sm" variant={i.on ? 'secondary' : 'primary'}>{i.on ? 'Configure' : 'Connect'}</Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
