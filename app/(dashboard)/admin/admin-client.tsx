'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EmployeeRow } from '@/types/database'
import { inviteEmployee, updateEmployee, resendInvite, type EmployeeFormData } from './actions'
import { getInitials } from '@/lib/utils'

const ROLE_LABEL: Record<number, string> = { 1: 'Empleado', 2: 'Supervisor', 3: 'Administrador' }
const ROLE_BADGE: Record<number, React.CSSProperties> = {
  1: { background: 'var(--bg2)', color: 'var(--text3)' },
  2: { background: '#EFF6FF', color: '#2563EB' },
  3: { background: '#F3E8FF', color: '#7C3AED' },
}

const EMPTY_FORM: EmployeeFormData & { firstName: string; lastName: string } = {
  firstName: '', lastName: '', full_name: '',
  email: '', sector: '', role: 1, approver_id: null,
}

interface Props {
  employees: EmployeeRow[]
  currentUserId: string
}

export default function AdminClient({ employees, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modal state
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; employeeId?: string }>({ open: false, mode: 'create' })
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setError(null)
    setModal({ open: true, mode: 'create' })
  }

  function openEdit(emp: EmployeeRow) {
    const parts = emp.full_name.split(' ')
    setForm({
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
      full_name: emp.full_name,
      email: emp.email,
      sector: emp.sector,
      role: emp.role ?? 1,
      approver_id: emp.approver_id,
    })
    setError(null)
    setModal({ open: true, mode: 'edit', employeeId: emp.id })
  }

  function closeModal() {
    setModal({ open: false, mode: 'create' })
    setError(null)
  }

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function buildFullName() {
    return [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')
  }

  function validate(): string | null {
    if (!form.firstName.trim()) return 'El nombre es obligatorio'
    if (!form.email.trim()) return 'El email es obligatorio'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email inválido'
    return null
  }

  function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }

    const payload: EmployeeFormData = {
      full_name: buildFullName(),
      email: form.email.trim(),
      sector: form.sector.trim(),
      role: form.role,
      approver_id: form.approver_id || null,
    }

    startTransition(async () => {
      if (modal.mode === 'create') {
        const result = await inviteEmployee(payload)
        if (!result.ok) { setError(result.error); return }
        showToast(`Invitación enviada a ${payload.email}`)
      } else {
        const result = await updateEmployee(modal.employeeId!, payload)
        if (!result.ok) { setError(result.error); return }
        showToast('Cambios guardados')
      }
      closeModal()
      router.refresh()
    })
  }

  function handleResend(email: string) {
    startTransition(async () => {
      const result = await resendInvite(email)
      if (!result.ok) {
        showToast(`Error: ${result.error}`)
      } else {
        showToast(`Invitación reenviada a ${email}`)
      }
    })
  }

  // Approvers = employees with role >= 2
  const approvers = employees.filter(e => (e.role ?? 1) >= 2)

  return (
    <>
      {/* Header */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Gestión de usuarios</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
            {employees.length} {employees.length === 1 ? 'cuenta' : 'cuentas'}
          </div>
        </div>
        <button onClick={openCreate} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuario', 'Email', 'Sector', 'Rol', 'Aprobador', 'Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No hay usuarios todavía. Creá el primero.
                  </td>
                </tr>
              ) : employees.map(emp => {
                const role = emp.role ?? 1
                const approver = employees.find(e => e.id === emp.approver_id)
                const isCurrentUser = emp.id === currentUserId
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Usuario */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCurrentUser ? 'var(--cu)' : 'var(--bg2)', color: isCurrentUser ? 'white' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          {getInitials(emp.full_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                            {emp.full_name}
                            {isCurrentUser && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--cu)', fontWeight: 600 }}>vos</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
                      {emp.email}
                    </td>
                    {/* Sector */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      {emp.sector || <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    {/* Rol */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ ...ROLE_BADGE[role], fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
                        {ROLE_LABEL[role] ?? `Rol ${role}`}
                      </span>
                    </td>
                    {/* Aprobador */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      {approver ? approver.full_name : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    {/* Acciones */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(emp)} className="btn btn-sm">
                          Editar
                        </button>
                        <button
                          onClick={() => handleResend(emp.email)}
                          disabled={isPending}
                          className="btn btn-sm"
                          style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
                          title="Reenviar email de invitación"
                        >
                          Reenviar invitación
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 16, display: 'flex', gap: 20, fontSize: 12, color: 'var(--text3)' }}>
          <div><span style={{ ...ROLE_BADGE[1], padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>Empleado</span> — Carga y envía horas</div>
          <div><span style={{ ...ROLE_BADGE[2], padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>Supervisor</span> — Puede aprobar horas de su equipo</div>
          <div><span style={{ ...ROLE_BADGE[3], padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>Administrador</span> — Acceso total</div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--text)', color: 'var(--bg)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Modal overlay */}
      {modal.open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {modal.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nombre + Apellido */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Nombre *</span>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={e => setField('firstName', e.target.value)}
                    placeholder="Ej: Martín"
                    autoFocus
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Apellido</span>
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={e => setField('lastName', e.target.value)}
                    placeholder="Ej: García"
                  />
                </label>
              </div>

              {/* Email */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Email corporativo *</span>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="empleado@empresa.com"
                  disabled={modal.mode === 'edit'} // no cambiar email en edición
                  style={modal.mode === 'edit' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
                {modal.mode === 'edit' && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>El email no se puede cambiar una vez creado.</span>
                )}
              </label>

              {/* Sector */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Sector / Área</span>
                <input
                  className="form-input"
                  value={form.sector}
                  onChange={e => setField('sector', e.target.value)}
                  placeholder="Ej: Certificación"
                />
              </label>

              {/* Rol */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Nivel de acceso *</span>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={e => setField('role', Number(e.target.value))}
                >
                  <option value={1}>1 — Empleado (carga horas)</option>
                  <option value={2}>2 — Supervisor (aprueba horas de su equipo)</option>
                  <option value={3}>3 — Administrador (acceso total)</option>
                </select>
              </label>

              {/* Aprobador */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Aprobador asignado</span>
                <select
                  className="form-input"
                  value={form.approver_id ?? ''}
                  onChange={e => setField('approver_id', e.target.value || null)}
                >
                  <option value="">— Sin aprobador —</option>
                  {approvers
                    .filter(a => a.id !== modal.employeeId)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} ({ROLE_LABEL[a.role ?? 1]})
                      </option>
                    ))}
                </select>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Solo se muestran Supervisores y Administradores.
                </span>
              </label>

              {/* Error */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#DC2626' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg2)' }}>
              <button onClick={closeModal} className="btn btn-sm" style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={isPending} className="btn btn-sm" style={{ minWidth: 160 }}>
                {isPending
                  ? 'Guardando...'
                  : modal.mode === 'create'
                    ? '✉ Crear y enviar invitación'
                    : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
