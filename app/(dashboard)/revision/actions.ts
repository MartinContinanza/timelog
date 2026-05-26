'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitToReview(period: string, totalHours: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: empData } = await supabase
    .from('employees').select('id, approver_id').eq('email', user.email!).single()
  const employee = empData as { id: string; approver_id: string | null } | null
  if (!employee) return { error: 'Empleado no encontrado' }

  // Upsert monthly_closure
  const { error } = await supabase.from('monthly_closures').upsert({
    employee_id:  employee.id,
    period,
    total_hours:  totalHours,
    approver_id:  employee.approver_id,
    submitted_at: new Date().toISOString(),
    status:       'submitted',
  } as any, { onConflict: 'employee_id,period' })

  if (error) return { error: error.message }

  revalidatePath('/revision')
  revalidatePath('/dashboard')
  return { success: 'Enviado a revisión correctamente' }
}
