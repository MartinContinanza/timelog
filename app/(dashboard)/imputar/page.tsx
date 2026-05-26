import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AccountRow, EmployeeRow, EntryRow } from '@/types/database'
import ImputarForm from './imputar-form'

export default async function ImputarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load accounts and employee in parallel
  const [{ data: accsData }, { data: empData }] = await Promise.all([
    supabase.from('accounts').select('*').eq('active', true).order('code'),
    supabase.from('employees').select('*').eq('email', user.email!).single(),
  ])

  const accounts = (accsData ?? []) as AccountRow[]
  const employee = empData as EmployeeRow | null

  // Current month entries for mini-calendar
  const now = new Date()
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data: entriesData } = await supabase
    .from('entries')
    .select('date, hours')
    .eq('employee_id', employee?.id ?? '')
    .gte('date', periodStart)

  const entries = (entriesData ?? []) as Pick<EntryRow, 'date' | 'hours'>[]

  // Build date → total hours map
  const hoursMap: Record<string, number> = {}
  for (const e of entries) {
    hoursMap[e.date] = (hoursMap[e.date] ?? 0) + e.hours
  }

  const totalHours  = Object.values(hoursMap).reduce((s, h) => s + h, 0)
  const hoursTarget = employee?.monthly_hours_target ?? 160
  const monthName   = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '14px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Imputar horas</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Registrá tu tiempo de trabajo</div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ImputarForm
          accounts={accounts}
          hoursMap={hoursMap}
          totalHours={totalHours}
          hoursTarget={hoursTarget}
          year={now.getFullYear()}
          month={now.getMonth()}
          monthName={monthName}
        />
      </div>
    </>
  )
}
