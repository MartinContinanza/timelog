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

  if (!fullName)           return { error: 'El nombre es obligatorio.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }

  const admin = createAdminClient()

  // Crear usuario con email_confirm:true para saltear la confirmación por email
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    const msg = createError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    return { error: createError.message }
  }

  // Upsert en employees — sobrescribe aunque un trigger haya creado el registro vacío
  const { error: empError } = await admin.from('employees').upsert({
    id: createData.user.id,
    email,
    full_name: fullName,
    sector: '',
    role: 1,
    approver_id: null,
  } as any, { onConflict: 'id' })

  if (empError) return { error: empError.message }

  // Iniciar sesión automáticamente (el usuario no debería tener que volver a poner sus datos)
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
