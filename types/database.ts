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

// Matches real DB check constraints
export type EntryStatus   = 'draft' | 'submitted' | 'approved' | 'rejected'
export type ClosureStatus = 'open'  | 'submitted' | 'approved' | 'rejected'

// ─── Row shapes ───────────────────────────────────────────────────────────────
export interface EmployeeRow {
  id: string            // = auth.uid() (Supabase pattern)
  email: string
  full_name: string
  sector: string
  role: number          // 1=Empleado, 2=Supervisor, 3=Administrador
  approver_id: string | null
  created_at: string
}

export interface AccountRow {
  id: string
  code: string
  name: string
  sector: string | null  // used for optgroup label
  active: boolean
  created_at: string
}

export interface EntryRow {
  id: string
  employee_id: string
  account_id: string
  date: string            // "YYYY-MM-DD"
  hours: number
  activity_type: ActivityType
  comment: string | null
  status: EntryStatus
  created_at: string
  updated_at: string
}

export interface MonthlyClosureRow {
  id: string
  employee_id: string
  period: string          // "YYYY-MM"
  submitted_at: string | null
  approved_at: string | null
  approver_id: string | null
  status: ClosureStatus
}

// ─── Convenience aliases with relations ───────────────────────────────────────
export type Employee       = EmployeeRow
export type Account        = AccountRow
export type Entry          = EntryRow & { account?: AccountRow; employee?: EmployeeRow }
export type MonthlyClosure = MonthlyClosureRow & { employee?: EmployeeRow; approver?: EmployeeRow }

// ─── Supabase Database generic (matches GenericSchema) ────────────────────────
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: EmployeeRow
        Insert: Omit<EmployeeRow, 'created_at'> & { role?: number }
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
        Insert: Omit<EntryRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EntryRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: [
          { foreignKeyName: 'entries_employee_id_fkey'; columns: ['employee_id']; isOneToOne: false; referencedRelation: 'employees'; referencedColumns: ['id'] },
          { foreignKeyName: 'entries_account_id_fkey'; columns: ['account_id']; isOneToOne: false; referencedRelation: 'accounts'; referencedColumns: ['id'] },
        ]
      }
      monthly_closures: {
        Row: MonthlyClosureRow
        Insert: Omit<MonthlyClosureRow, 'id'>
        Update: Partial<Omit<MonthlyClosureRow, 'id'>>
        Relationships: [
          { foreignKeyName: 'monthly_closures_employee_id_fkey'; columns: ['employee_id']; isOneToOne: false; referencedRelation: 'employees'; referencedColumns: ['id'] },
        ]
      }
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
