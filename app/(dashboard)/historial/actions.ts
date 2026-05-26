'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActivityType } from '@/types/database'

export async function deleteEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/historial')
  revalidatePath('/dashboard')
  return { success: 'Imputación eliminada' }
}

export async function updateEntry(
  id: string,
  data: {
    date: string
    hours: number
    account_id: string
    activity_type: ActivityType
    comment: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('entries') as any)
    .update({ ...data })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/historial')
  revalidatePath('/dashboard')
  return { success: 'Imputación actualizada' }
}
