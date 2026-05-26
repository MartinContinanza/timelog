import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, AccountRow } from '@/types/database'
import { HOURS_TARGET, formatDate, getInitials } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empData } = await supabase
    .from('employees').select('*').eq('id', user.id).single()
  const employee = empData as EmployeeRow | null

  const now         = new Date()
  const firstName   = employee?.full_name?.split(' ')[0] ?? 'allí'
  const monthLabel  = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // RLS already filters to current user; eq('employee_id') is an extra safety filter
  const { data: entriesData } = await supabase
    .from('entries')
    .select('*, account:accounts(code, name)')
    .eq('employee_id', user.id)
    .gte('date', periodStart)
    .order('date', { ascending: false })

  type EntryFull = EntryRow & { account: Pick<AccountRow, 'code' | 'name'> | null }
  const entries = (entriesData ?? []) as EntryFull[]

  const totalHours    = entries.reduce((s, e) => s + e.hours, 0)
  const pct           = Math.round((totalHours / HOURS_TARGET) * 100)
  const daysWithHours = new Set(entries.map(e => e.date)).size
  const workingDays   = 23  // approximate for display
  const todayStr      = now.toISOString().split('T')[0]
  const todayHours    = entries.filter(e => e.date === todayStr).reduce((s, e) => s + e.hours, 0)
  const closeDay      = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  return (
    <>
      {/* Topbar */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Bienvenido/a, {firstName} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, textTransform: 'capitalize' }}>{monthLabel}</div>
        </div>
        <a href="/imputar" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva imputación
        </a>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px', flex: 1 }}>

        {/* Alert — days not logged */}
        {todayHours === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20, background: 'var(--warning-bg)', border: '1px solid #fcd34d', color: '#92400e' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>No registraste horas <strong>hoy</strong>. Recordá imputar antes del cierre del mes.</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard label="Horas imputadas" value={totalHours} suffix={`/ ${HOURS_TARGET}hs`}
            bar={pct} barColor={pct < 70 ? 'var(--warning)' : 'var(--cu)'}
            footer={`${pct}% completado · quedan ${HOURS_TARGET - totalHours}hs`} />
          <StatCard label="Días imputados" value={daysWithHours} suffix={`/ ${workingDays}`}
            bar={Math.round((daysWithHours / workingDays) * 100)} barColor="var(--warning)"
            footer={`${workingDays - daysWithHours} días restantes`} />
          <StatCard label="Hoy" value={todayHours} suffix="hs"
            bar={Math.min((todayHours / 8) * 100, 100)}
            barColor={todayHours === 0 ? 'var(--danger)' : 'var(--cu)'}
            footer={todayHours === 0 ? '⚠ Sin imputar hoy' : `${todayHours}hs registradas`}
            valueColor={todayHours === 0 ? 'var(--danger)' : undefined} />
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 6 }}>Estado del mes</div>
            <div style={{ marginTop: 2 }}>
              <span className={`badge ${pct >= 100 ? 'badge-green' : 'badge-amber'}`}>{pct >= 100 ? 'Completo' : 'En progreso'}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
              Cierre: {closeDay} de {now.toLocaleDateString('es-AR', { month: 'long' })}
            </div>
            {employee?.approver_id && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Sector: {employee.sector}</div>
            )}
          </div>
        </div>

        {/* Recent entries */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Últimas imputaciones
          <a href="/historial" className="btn btn-sm btn-ghost" style={{ fontSize: 12, color: 'var(--cu)' }}>Ver todo →</a>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p style={{ fontSize: 13 }}>No hay imputaciones este mes todavía.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha','Subcuenta','Actividad','Horas','Comentario'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 8).map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13 }}>{formatDate(e.date)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{e.account?.code ?? '—'}</td>
                    <td style={{ padding: '11px 16px' }}><span className="badge badge-blue">{e.activity_type}</span></td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600 }}>{e.hours}hs</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, suffix, bar, barColor, footer, valueColor }: {
  label: string; value: number; suffix?: string; bar: number
  barColor: string; footer: string; valueColor?: string
}) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: valueColor ?? 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)' }}>{suffix}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: barColor, borderRadius: 4, width: `${Math.min(bar, 100)}%`, transition: 'width .4s' }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: valueColor ?? 'var(--text3)' }}>{footer}</div>
    </div>
  )
}
