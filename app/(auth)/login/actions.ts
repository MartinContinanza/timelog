'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: 'Email o contraseña incorrectos.' }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function register(formData: FormData): Promise<{ error?: string }> {
  const email    = (formData.get('email')     as string).trim()
  const password =  formData.get('password')  as string
  const fullName = (formData.get('full_name') as string).trim()

  if (!fullName)          return { error: 'El nombre es obligatorio.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }

  const supabase = await createClient()

  const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) return { error: signUpError.message }
  if (!data.user)  return { error: 'No se pudo crear el usuario.' }

  // Crear registro en employees usando admin client (bypasa RLS)
  const admin = createAdminClient()
  const { error: empError } = await admin.from('employees').insert({
    id: data.user.id,
    email,
    full_name: fullName,
    sector: '',
    role: 1,
    approver_id: null,
  } as any)

  // Ignorar conflicto si ya existe (23505 = unique violation)
  if (empError && empError.code !== '23505') return { error: empError.message }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
