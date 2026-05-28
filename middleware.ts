import { NextResponse, type NextRequest } from 'next/server'

// Middleware is intentionally minimal — auth is handled by each
// server component via createClient() + supabase.auth.getUser().
// Keeping a matcher here so Next.js doesn't skip the route layer.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
