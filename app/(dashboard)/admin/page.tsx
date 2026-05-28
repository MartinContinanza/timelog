import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EmployeeRow } from '@/types/database'
import AdminClient from './admin-client'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify current user is admin (role=3)
  const { data: me } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || (me as any).role !== 3) redirect('/dashboard')

  // Admin client bypasses RLS → read all employees
  const admin = createAdminClient()
  const { data: employeesData } = await admin
    .from('employees')
    .select('*')
    .order('full_name')

  const employees = (employeesData ?? []) as EmployeeRow[]

  return <AdminClient employees={employees} currentUserId={user.id} />
}
