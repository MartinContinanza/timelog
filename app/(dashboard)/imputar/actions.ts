'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActivityType, EntryRow } from '@/types/database'

export async function createEntries(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // employees.id = auth.uid()
  const { data: empData } = await supabase
    .from('employees').select('id').eq('id', user.id).single()
  const employee = empData as { id: string } | null
  if (!employee) return { error: 'Perfil de empleado no encontrado' }

  const mode         = formData.get('mode') as string
  const accountId    = formData.get('account_id') as string
  const activityType = formData.get('activity_type') as ActivityType
  const comment      = (formData.get('comment') as string) || null

  if (!accountId) return { error: 'Seleccioná una subcuenta' }

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  // ── Por día ──────────────────────────────────────────────
  if (mode === 'dia') {
    const date  = formData.get('date') as string
    const hours = parseFloat(formData.get('hours') as string)
    if (!date || isNaN(hours)) return { error: 'Completá todos los campos' }
    if (new Date(date + 'T00:00:00') > today) return { error: 'No podés imputar en fechas futuras' }

    const { error } = await supabase.from('entries').insert({
      employee_id: employee.id, account_id: accountId,
      date, hours, activity_type: activityType, comment, status: 'draft',
    } as any)
    if (error) return { error: error.message }
    revalidatePath('/dashboard'); revalidatePath('/historial')
    return { success: `${hours}hs imputadas correctamente ✓` }
  }

  // ── Rango de fechas ───────────────────────────────────────
  if (mode === 'rango') {
    const desde = formData.get('desde') as string
    const hasta = formData.get('hasta') as string
    const hours = parseFloat(formData.get('hours') as string)
    if (!desde || !hasta || isNaN(hours)) return { error: 'Completá todos los campos' }

    const rows: Omit<EntryRow, 'id' | 'created_at' | 'updated_at'>[] = []
    const current = new Date(desde + 'T00:00:00')
    const end     = new Date(hasta + 'T00:00:00')

    while (current <= end && current <= today) {
      const dow = current.getDay()
      if (dow !== 0 && dow !== 6) {
        rows.push({
          employee_id: employee.id, account_id: accountId,
          date: current.toISOString().split('T')[0],
          hours, activity_type: activityType, comment, status: 'draft',
        })
      }
      current.setDate(current.getDate() + 1)
    }
    if (rows.length === 0) return { error: 'No hay días hábiles en ese rango' }

    const { error } = await supabase.from('entries').insert(rows as any)
    if (error) return { error: error.message }
    revalidatePath('/dashboard'); revalidatePath('/historial')
    return { success: `${rows.length} días imputados (${rows.reduce((s, r) => s + r.hours, 0)}hs total) ✓` }
  }

  // ── Semana completa ───────────────────────────────────────
  if (mode === 'semana') {
    const week = formData.get('week') as string  // "YYYY-Www"
    if (!week) return { error: 'Seleccioná una semana' }

    const [yearStr, wStr] = week.split('-W')
    const year    = parseInt(yearStr)
    const weekNum = parseInt(wStr)

    const jan4   = new Date(year, 0, 4)
    const dow4   = jan4.getDay() || 7
    const monday = new Date(jan4)
    monday.setDate(jan4.getDate() - dow4 + 1 + (weekNum - 1) * 7)

    const rows: Omit<EntryRow, 'id' | 'created_at' | 'updated_at'>[] = []
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      if (day <= today) {
        rows.push({
          employee_id: employee.id, account_id: accountId,
          date: day.toISOString().split('T')[0],
          hours: 8, activity_type: activityType, comment, status: 'draft',
        })
      }
    }
    if (rows.length === 0) return { error: 'No hay días válidos en esa semana' }

    const { error } = await supabase.from('entries').insert(rows as any)
    if (error) return { error: error.message }
    revalidatePath('/dashboard'); revalidatePath('/historial')
    return { success: `Semana imputada: ${rows.length * 8}hs ✓` }
  }

  return { error: 'Modo inválido' }
}
