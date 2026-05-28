'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Verifica que el usuario logueado sea admin (role=3) */
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!data || (data as any).role !== 3) {
    throw new Error('No autorizado')
  }
  return createAdminClient()
}

export type EmployeeFormData = {
  full_name: string
  email: string
  sector: string
  role: number
  approver_id: string | null
}

/** Invita al usuario por email y crea su registro en employees */
export async function inviteEmployee(form: EmployeeFormData) {
  const admin = await assertAdmin()

  // Invite via Supabase Auth (sends email with magic link)
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    form.email,
    { data: { full_name: form.full_name } }
  )
  if (inviteErr) throw new Error(inviteErr.message)

  const userId = inviteData.user.id

  // Create employee record
  const { error: empErr } = await admin.from('employees').insert({
    id: userId,
    full_name: form.full_name,
    email: form.email,
    sector: form.sector,
    role: form.role,
    approver_id: form.approver_id ?? null,
  } as any)
  if (empErr) throw new Error(empErr.message)

  revalidatePath('/admin')
}

/** Actualiza datos de un empleado existente */
export async function updateEmployee(id: string, form: EmployeeFormData) {
  const admin = await assertAdmin()

  const { error } = await admin.from('employees').update({
    full_name: form.full_name,
    email: form.email,
    sector: form.sector,
    role: form.role,
    approver_id: form.approver_id ?? null,
  } as any).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

/** Reenvía invitación a un email (útil si el usuario no recibió/expiró el link) */
export async function resendInvite(email: string) {
  const admin = await assertAdmin()
  const { error } = await admin.auth.admin.inviteUserByEmail(email)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
