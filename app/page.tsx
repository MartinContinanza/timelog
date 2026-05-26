import { redirect } from 'next/navigation'

// Root redirect: the real dashboard lives at /dashboard
export default function RootPage() {
  redirect('/dashboard')
}
