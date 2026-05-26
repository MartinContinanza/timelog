import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, AccountRow } from '@/types/database'

type EntryWithAccount = EntryRow & { account: Pick<AccountRow, 'code' | 'name'> | null }
type EmployeeReport = {
  employee: EmployeeRow
  entries: EntryWithAccount[]
  totalHours: number
  distribution: { code: string; name: string; hours: number; pct: number }[]
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; employee?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meData } = await supabase.from('employees').select('*').eq('email', user.email!).single()
  const me = meData as EmployeeRow | null

  const params = await searchParams
  const now    = new Date()
  const period = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [periodYear, periodMonth] = period.split('-').map(Number)

  // Available months (last 12)
  const months: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    })
  }

  const periodStart = `${period}-01`
  const periodEnd   = new Date(periodYear, periodMonth, 0).toISOString().split('T')[0]

  // All employees (for managers — if role permits)
  // For now, show only current user's data
  const { data: entriesData } = await supabase
    .from('entries')
    .select('*, account:accounts(code, name)')
    .eq('employee_id', me?.id ?? '')
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: false })

  const entries = (entriesData ?? []) as EntryWithAccount[]
  const totalHours = entries.reduce((s, e) => s + e.hours, 0)

  // Distribution by account
  const accountMap: Record<string, { code: string; name: string; hours: number }> = {}
  for (const e of entries) {
    const code = e.account?.code ?? 'SIN CÓDIGO'
    const name = e.account?.name ?? ''
    if (!accountMap[code]) accountMap[code] = { code, name, hours: 0 }
    accountMap[code].hours += e.hours
  }
  const distribution = Object.values(accountMap)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, pct: totalHours > 0 ? Math.round((d.hours / totalHours) * 100) : 0 }))

  const DIST_COLORS = ['var(--cu)', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff']

  const periodLabel = new Date(periodYear, periodMonth - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '14px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Reporte mensual</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Detalle por subcuenta</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <form method="GET">
            <select
              name="month"
              defaultValue={period}
              onChange={e => { const f = e.target.closest('form') as HTMLFormElement; f.submit() }}
              className="form-input"
              style={{ width: 180 }}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </form>
        </div>
      </div>

      <div style={{ padding: '24px 28px', flex: 1 }}>

        {/* Employee block */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow)', marginBottom: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--cu)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                {me?.initials ?? '??'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{me?.full_name ?? 'Usuario'}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                  Sector: {me?.sector ?? '—'} · {totalHours}hs imputadas · {periodLabel}
                </div>
              </div>
            </div>
            <span className={`badge ${totalHours >= (me?.monthly_hours_target ?? 160) ? 'badge-green' : 'badge-amber'}`}>
              {totalHours >= (me?.monthly_hours_target ?? 160) ? 'Completo' : 'En progreso'}
            </span>
          </div>

          {/* Distribution bars */}
          {distribution.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {distribution.map((d, i) => (
                <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text2)', width: 160, flexShrink: 0 }}>
                    {d.code}
                  </div>
                  <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: DIST_COLORS[i % DIST_COLORS.length], width: `${d.pct}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 36, textAlign: 'right' }}>{d.pct}%</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', width: 40, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{d.hours}hs</div>
                </div>
              ))}
            </div>
          )}

          {/* Entries table */}
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
              <p style={{ fontSize: 13 }}>Sin imputaciones en este período.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
              <thead>
                <tr>
                  {['Fecha','Subcuenta','Actividad','Horas','Comentario'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>
                      {e.account?.code ?? '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span className="badge badge-blue">{e.activity_type}</span>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{e.hours}hs</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, color: 'var(--text3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.comment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>
                    Total
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: 'var(--cu)', borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>
                    {totalHours}hs
                  </td>
                  <td style={{ borderTop: '2px solid var(--border)', background: 'var(--bg2)' }} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
