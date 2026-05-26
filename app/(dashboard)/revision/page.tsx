import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, MonthlyClosureRow } from '@/types/database'
import RevisionClient from './revision-client'

export default async function RevisionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empData } = await supabase
    .from('employees').select('*').eq('email', user.email!).single()
  const employee = empData as EmployeeRow | null

  const now = new Date()
  const period      = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const periodStart = `${period}-01`
  const hoursTarget = employee?.monthly_hours_target ?? 160

  // Current month entries
  const { data: entriesData } = await supabase
    .from('entries')
    .select('date, hours, status')
    .eq('employee_id', employee?.id ?? '')
    .gte('date', periodStart)

  const entries = (entriesData ?? []) as Pick<EntryRow, 'date' | 'hours' | 'status'>[]
  const totalHours   = entries.reduce((s, e) => s + e.hours, 0)
  const daysImputados = new Set(entries.map(e => e.date)).size

  // Count working days in the month that have passed
  const lastDay = Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
  let workingDaysPassed = 0
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay()
    if (dow !== 0 && dow !== 6) workingDaysPassed++
  }
  const missingDays = Math.max(workingDaysPassed - daysImputados, 0)

  // Current month closure
  const { data: closureData } = await supabase
    .from('monthly_closures')
    .select('*')
    .eq('employee_id', employee?.id ?? '')
    .eq('period', period)
    .single()
  const currentClosure = closureData as MonthlyClosureRow | null

  // Past closures
  const { data: pastClosuresData } = await supabase
    .from('monthly_closures')
    .select('*, approver:employees!monthly_closures_approver_id_fkey(full_name)')
    .eq('employee_id', employee?.id ?? '')
    .neq('period', period)
    .order('period', { ascending: false })
    .limit(12)

  type ClosureWithApprover = MonthlyClosureRow & { approver: { full_name: string } | null }
  const pastClosures = (pastClosuresData ?? []) as ClosureWithApprover[]

  // Approver name
  let approverName = 'Sin aprobador'
  if (employee?.approver_id) {
    const { data: apprData } = await supabase
      .from('employees').select('full_name').eq('id', employee.approver_id).single()
    if (apprData) approverName = (apprData as { full_name: string }).full_name
  }

  const closeDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <>
      <div style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '14px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Enviar a revisión</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, textTransform: 'capitalize' }}>
            Cierre mensual · {monthLabel}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', flex: 1 }}>
        <RevisionClient
          period={period}
          monthLabel={monthLabel}
          totalHours={totalHours}
          hoursTarget={hoursTarget}
          missingDays={missingDays}
          approverName={approverName}
          currentClosure={currentClosure}
          pastClosures={pastClosures}
          closeDay={closeDay}
        />
      </div>
    </>
  )
}
