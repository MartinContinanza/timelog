'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

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
    return null
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
export async function inviteEmployee(form: EmployeeFormData): Promise<Result> {
  try {
    const admin = await assertAdmin()
    if (!admin) return { ok: false, error: 'No autorizado' }

    // redirectTo lleva al usuario a /auth/confirm → /set-password al aceptar la invitación
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const redirectTo = siteUrl ? `${siteUrl}/auth/confirm?next=/set-password` : undefined

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      form.email,
      { data: { full_name: form.full_name }, redirectTo }
    )
    if (inviteErr) return { ok: false, error: inviteErr.message }

    const userId = inviteData.user.id

    const { error: empErr } = await admin.from('employees').insert({
      id: userId,
      full_name: form.full_name,
      email: form.email,
      sector: form.sector,
      role: form.role,
      approver_id: form.approver_id ?? null,
    } as any)
    if (empErr) return { ok: false, error: empErr.message }

    revalidatePath('/admin')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error desconocido' }
  }
}

/** Actualiza datos de un empleado existente */
export async function updateEmployee(id: string, form: EmployeeFormData): Promise<Result> {
  try {
    const admin = await assertAdmin()
    if (!admin) return { ok: false, error: 'No autorizado' }

    const { error } = await admin.from('employees').update({
      full_name: form.full_name,
      email: form.email,
      sector: form.sector,
      role: form.role,
      approver_id: form.approver_id ?? null,
    } as any).eq('id', id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error desconocido' }
  }
}

/** Reenvía acceso al usuario.
 *  Usa 'recovery' (reset de contraseña) para usuarios ya registrados,
 *  lo que evita el error "user already registered" de inviteUserByEmail.
 *  El link lleva a /auth/confirm → /set-password igual que la invitación. */
export async function resendInvite(email: string): Promise<Result> {
  try {
    const admin = await assertAdmin()
    if (!admin) return { ok: false, error: 'No autorizado' }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const redirectTo = siteUrl ? `${siteUrl}/auth/confirm?next=/set-password` : undefined

    // recovery funciona para usuarios ya creados — envía email de reset de contraseña
    const { error } = await (admin.auth.admin as any).generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error desconocido' }
  }
}
