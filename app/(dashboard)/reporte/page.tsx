import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, AccountRow } from '@/types/database'
import ReporteClient from './reporte-client'

type EntryFull = EntryRow & {
  account: Pick<AccountRow, 'code' | 'name' | 'sector'> | null
  employee: Pick<EmployeeRow, 'full_name' | 'sector'> | null
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; vista?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  // Fetch submitted/approved entries with employee info
  const { data: entriesData } = await supabase
    .from('entries')
    .select('*, account:accounts(code, name, sector), employee:employees(full_name, sector)')
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .in('status', ['submitted', 'approved'])
    .order('date', { ascending: false })

  const entries = (entriesData ?? []) as EntryFull[]
  const periodLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <ReporteClient
      entries={entries}
      months={months}
      period={period}
      periodLabel={periodLabel}
    />
  )
}
