import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, AccountRow } from '@/types/database'
import HistorialTable from './historial-table'
import MonthSelect from './month-select'

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empData } = await supabase
    .from('employees').select('*').eq('id', user.id).single()
  const employee = empData as EmployeeRow | null

  const params = await searchParams
  const now = new Date()
  const period = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [y, m] = period.split('-').map(Number)
  const periodStart = `${period}-01`
  const periodEnd = new Date(y, m, 0).toISOString().split('T')[0]

  // Last 12 months for picker
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }
  })

  const { data: entriesData } = await supabase
    .from('entries')
    .select('*, account:accounts(id, code, name, sector)')
    .eq('employee_id', user.id)
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: false })

  type EntryWithAccount = EntryRow & { account: Pick<AccountRow, 'id' | 'code' | 'name' | 'sector'> | null }
  const entries = (entriesData ?? []) as EntryWithAccount[]

  const { data: accsData } = await supabase
    .from('accounts').select('id, code, name, sector').eq('active', true).order('code')
  const accounts = (accsData ?? []) as Pick<AccountRow, 'id' | 'code' | 'name' | 'sector'>[]

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const periodLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Historial de imputaciones</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, textTransform: 'capitalize' }}>
            {periodLabel} · {entries.length} registros · <strong style={{ color: 'var(--text)' }}>{totalHours}hs</strong>
          </div>
        </div>
        <MonthSelect months={months} current={period} />
      </div>
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <HistorialTable entries={entries} accounts={accounts} />
      </div>
    </>
  )
}
