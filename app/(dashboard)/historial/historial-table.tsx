'use client'

import { useState, useTransition, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { deleteEntry, updateEntry } from './actions'
import type { EntryRow, AccountRow, ActivityType } from '@/types/database'
import { formatDate, STATUS_LABEL, STATUS_BADGE } from '@/lib/utils'

type EntryWithAccount = EntryRow & {
  account: Pick<AccountRow, 'id' | 'code' | 'name' | 'sector'> | null
}
type Toast = { id: number; msg: string; type: 'success' | 'error' }

const ACTIVITY_TYPES: ActivityType[] = [
  'Auditoría', 'Reporte', 'Visita campo', 'Oficina', 'Viaje',
  'Capacitación', 'Reunión interna', 'Licencia', 'Vacaciones',
]
const FILTERS = ['Todos', 'Auditoría', 'Reporte', 'Oficina', 'Viaje', 'Capacitación']

interface Props {
  entries: EntryWithAccount[]
  accounts: Pick<AccountRow, 'id' | 'code' | 'name' | 'sector'>[]
}

export default function HistorialTable({ entries: initial, accounts }: Props) {
  const [filter, setFilter]   = useState('Todos')
  const [search, setSearch]   = useState('')
  const [toasts, setToasts]   = useState<Toast[]>([])
  const [isPending, startTr]  = useTransition()

  const [editEntry, setEditEntry]     = useState<EntryWithAccount | null>(null)
  const [editDate, setEditDate]       = useState('')
  const [editHours, setEditHours]     = useState(8)
  const [editAccount, setEditAccount] = useState('')
  const [editType, setEditType]       = useState<ActivityType>('Auditoría')
  const [editComment, setEditComment] = useState('')

  function toast(msg: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  function openEdit(e: EntryWithAccount) {
    setEditEntry(e); setEditDate(e.date); setEditHours(e.hours)
    setEditAccount(e.account_id); setEditType(e.activity_type); setEditComment(e.comment ?? '')
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta imputación?')) return
    startTr(async () => {
      const r = await deleteEntry(id)
      if (r.error) toast(r.error, 'error')
      else toast(r.success!, 'success')
    })
  }

  function handleSave() {
    if (!editEntry) return
    startTr(async () => {
      const r = await updateEntry(editEntry.id, { date: editDate, hours: editHours, account_id: editAccount, activity_type: editType, comment: editComment || null })
      if (r.error) toast(r.error, 'error')
      else { toast(r.success!, 'success'); setEditEntry(null) }
    })
  }

  function exportExcel() {
    const rows = filtered.map(e => ({
      Fecha: e.date,
      Subcuenta: e.account?.code ?? '',
      Nombre: e.account?.name ?? '',
      Actividad: e.activity_type,
      Horas: e.hours,
      Comentario: e.comment ?? '',
      Estado: STATUS_LABEL[e.status] ?? e.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Imputaciones')
    XLSX.writeFile(wb, `imputaciones-${new Date().toISOString().slice(0, 7)}.xlsx`)
    toast('Excel exportado', 'success')
  }

  const filtered = useMemo(() =>
    initial.filter(e =>
      (filter === 'Todos' || e.activity_type === filter) &&
      (!search || (e.account?.code ?? '').toLowerCase().includes(search.toLowerCase()))
    )
  , [initial, filter, search])

  const groupedAccounts = useMemo(() =>
    accounts.reduce<Record<string, typeof accounts>>((acc, a) => {
      const key = a.sector ?? 'General'
      if (!acc[key]) acc[key] = []
      acc[key].push(a)
      return acc
    }, {})
  , [accounts])

  return (
    <>
      {/* Filters */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '14px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${filter === f ? 'var(--cu)' : 'var(--border2)'}`, background: filter === f ? 'var(--cu-light)' : 'var(--bg)', color: filter === f ? 'var(--cu-dark)' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s' }}>{f}</button>
        ))}
        <input type="text" placeholder="Buscar subcuenta…" value={search} onChange={e => setSearch(e.target.value)} className="form-input" style={{ width: 180, padding: '5px 10px', marginLeft: 'auto' }} />
        <button onClick={exportExcel} className="btn btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar Excel
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
            <p style={{ fontSize: 13 }}>No hay imputaciones que coincidan con el filtro.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Fecha','Subcuenta','Actividad','Horas','Comentario','Estado',''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => { (ev.currentTarget.querySelector('.ra') as HTMLElement | null)?.style?.setProperty('opacity','1') }}
                  onMouseLeave={ev => { (ev.currentTarget.querySelector('.ra') as HTMLElement | null)?.style?.setProperty('opacity','0') }}
                >
                  <td style={{ padding: '11px 16px', fontSize: 13 }}>{formatDate(e.date)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, fontFamily: 'DM Mono,monospace', color: 'var(--text2)' }}>{e.account?.code ?? '—'}</td>
                  <td style={{ padding: '11px 16px' }}><span className="badge badge-blue">{e.activity_type}</span></td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600 }}>{e.hours}hs</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.comment || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-gray'}`}>{STATUS_LABEL[e.status] ?? e.status}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div className="ra" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity .15s' }}>
                      <button onClick={() => openEdit(e)} style={{ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        onMouseEnter={ev => { const b = ev.currentTarget; b.style.borderColor='var(--danger)'; b.style.background='var(--danger-bg)'; b.style.color='var(--danger)' }}
                        onMouseLeave={ev => { const b = ev.currentTarget; b.style.borderColor='var(--border)'; b.style.background='var(--bg)'; b.style.color='var(--text2)' }}
                        style={{ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }} title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editEntry && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditEntry(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 20px 40px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Editar imputación</div>
              <button onClick={() => setEditEntry(null)} style={{ width: 28, height: 28, border: 'none', background: 'var(--bg2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Fecha</label>
                <input type="date" className="form-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Horas</label>
                <input type="number" className="form-input" value={editHours} min="0.5" max="24" step="0.5" onChange={e => setEditHours(parseFloat(e.target.value))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>Subcuenta</label>
              <select className="form-input" value={editAccount} onChange={e => setEditAccount(e.target.value)}>
                {Object.entries(groupedAccounts).map(([g, accs]) => (
                  <optgroup key={g} label={g}>
                    {accs.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>Actividad</label>
              <select className="form-input" value={editType} onChange={e => setEditType(e.target.value as ActivityType)}>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>Comentario</label>
              <textarea className="form-input" value={editComment} onChange={e => setEditComment(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setEditEntry(null)} className="btn">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={isPending}>{isPending ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}
