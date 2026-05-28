import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeRow, EntryRow, AccountRow, MonthlyClosureRow } from '@/types/database'
import ReporteClient from './reporte-client'

type EntryFull = EntryRow & {
  account: Pick<AccountRow, 'code' | 'name' | 'sector'> | null
  employee: Pick<EmployeeRow, 'id' | 'full_name' | 'sector'> | null
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
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

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }
  })

  // Todas las entries del período — sin filtrar por status de entry.
  // La aprobación viene del monthly_closure, no del entry.
  const { data: entriesData } = await supabase
    .from('entries')
    .select('*, account:accounts(code, name, sector), employee:employees(id, full_name, sector)')
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: false })

  const entries = (entriesData ?? []) as EntryFull[]

  // Closures del período para saber el estado de aprobación por empleado
  const { data: closuresData } = await supabase
    .from('monthly_closures')
    .select('employee_id, status, submitted_at, approved_at')
    .eq('period', period)

  // Map: employee_id → closure status
  const closureMap: Record<string, Pick<MonthlyClosureRow, 'status' | 'submitted_at' | 'approved_at'>> = {}
  for (const c of (closuresData ?? [])) {
    closureMap[(c as any).employee_id] = c as any
  }

  const periodLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <ReporteClient
      entries={entries}
      closureMap={closureMap}
      months={months}
      period={period}
      periodLabel={periodLabel}
    />
  )
}
