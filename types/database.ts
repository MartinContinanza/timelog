// ─── Primitive types ──────────────────────────────────────────────────────────
export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Domain enums ─────────────────────────────────────────────────────────────
export type ActivityType =
  | 'Auditoría'
  | 'Reporte'
  | 'Visita campo'
  | 'Oficina'
  | 'Viaje'
  | 'Capacitación'
  | 'Reunión interna'
  | 'Licencia'
  | 'Vacaciones'

export type EntryStatus    = 'pendiente' | 'aprobado' | 'rechazado'
export type ClosureStatus  = 'open' | 'submitted' | 'approved' | 'rejected'

// ─── Row shapes (same as Database['public']['Tables'][X]['Row']) ───────────────
export interface EmployeeRow {
  id: string
  email: string
  full_name: string
  initials: string
  sector: string
  role: string
  approver_id: string | null
  monthly_hours_target: number
  created_at: string
}

export interface AccountRow {
  id: string
  code: string       // e.g. "CE.PP.AMARFOOD"
  name: string       // e.g. "Amarfood SA"
  group_name: string // e.g. "Auditoría"
  active: boolean
  created_at: string
}

export interface EntryRow {
  id: string
  employee_id: string
  account_id: string
  date: string
  hours: number
  activity_type: ActivityType
  comment: string | null
  status: EntryStatus
  created_at: string
}

export interface MonthlyClosureRow {
  id: string
  employee_id: string
  period: string      // "YYYY-MM"
  total_hours: number
  submitted_at: string | null
  approved_at: string | null
  approver_id: string | null
  status: ClosureStatus
  created_at: string
}

// ─── Convenience aliases with joined relations ────────────────────────────────
export type Employee       = EmployeeRow
export type Account        = AccountRow
export type Entry          = EntryRow & { account?: AccountRow; employee?: EmployeeRow }
export type MonthlyClosure = MonthlyClosureRow & { employee?: EmployeeRow; approver?: EmployeeRow }

// ─── Supabase Database type (matches GenericSchema expected by supabase-js v2) ─
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: EmployeeRow
        Insert: Omit<EmployeeRow, 'id' | 'created_at'>
        Update: Partial<Omit<EmployeeRow, 'id' | 'created_at'>>
        Relationships: []
      }
      accounts: {
        Row: AccountRow
        Insert: Omit<AccountRow, 'id' | 'created_at'>
        Update: Partial<Omit<AccountRow, 'id' | 'created_at'>>
        Relationships: []
      }
      entries: {
        Row: EntryRow
        Insert: Omit<EntryRow, 'id' | 'created_at'>
        Update: Partial<Omit<EntryRow, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'entries_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entries_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      monthly_closures: {
        Row: MonthlyClosureRow
        Insert: Omit<MonthlyClosureRow, 'id' | 'created_at'>
        Update: Partial<Omit<MonthlyClosureRow, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'monthly_closures_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
