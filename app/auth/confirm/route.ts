import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Ruta de confirmación para links de invitación y recovery de Supabase.
 * Supabase redirige aquí con ?token_hash=...&type=invite (o recovery).
 * Verificamos el OTP → creamos la sesión → redirigimos al destino.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/set-password'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // Sesión creada — ir a set-password (o al destino que venga en ?next=)
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Token inválido o expirado
  return NextResponse.redirect(new URL('/login?error=link_invalido', origin))
}
