'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import type { EntryRow, AccountRow, EmployeeRow } from '@/types/database'

type EntryFull = EntryRow & {
  account: Pick<AccountRow, 'code' | 'name' | 'sector'> | null
  employee: Pick<EmployeeRow, 'full_name' | 'sector'> | null
}

interface Props {
  entries: EntryFull[]
  months: { value: string; label: string }[]
  period: string
  periodLabel: string
}

export default function ReporteClient({ entries, months, period, periodLabel }: Props) {
  const [vista, setVista] = useState<'detalle' | 'resumen'>('detalle')
  const [filterEmployee, setFilterEmployee] = useState('Todos')

  // Unique employees
  const employees = Array.from(
    new Map(entries.map(e => [e.employee?.full_name ?? 'Sin nombre', e.employee?.full_name ?? 'Sin nombre'])).entries()
  ).map(([k]) => k).sort()

  const filtered = filterEmployee === 'Todos'
    ? entries
    : entries.filter(e => (e.employee?.full_name ?? 'Sin nombre') === filterEmployee)

  // Distribution: group by employee + account
  const distMap: Record<string, { employee: string; code: string; name: string; hours: number }> = {}
  const empTotals: Record<string, number> = {}
  for (const e of filtered) {
    const empName = e.employee?.full_name ?? 'Sin nombre'
    const code = e.account?.code ?? 'SIN CÓDIGO'
    const key = `${empName}||${code}`
    if (!distMap[key]) distMap[key] = { employee: empName, code, name: e.account?.name ?? '', hours: 0 }
    distMap[key].hours += e.hours
    empTotals[empName] = (empTotals[empName] ?? 0) + e.hours
  }
  const distribution = Object.values(distMap)
    .sort((a, b) => a.employee.localeCompare(b.employee) || b.hours - a.hours)
    .map(d => ({ ...d, pct: empTotals[d.employee] > 0 ? Math.round((d.hours / empTotals[d.employee]) * 100) : 0 }))

  function exportDistribucionExcel() {
    const rows = distribution.map(d => ({
      Empleado: d.employee,
      Subcuenta: d.code,
      'Nombre subcuenta': d.name,
      Horas: d.hours,
      '% del total': `${d.pct}%`,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Distribución')
    XLSX.writeFile(wb, `distribucion-${period}.xlsx`)
  }

  function exportDetalleExcel() {
    const rows = filtered.map(e => ({
      Empleado: e.employee?.full_name ?? '',
      Fecha: e.date,
      Subcuenta: e.account?.code ?? '',
      'Nombre subcuenta': e.account?.name ?? '',
      Actividad: e.activity_type,
      Horas: e.hours,
      Comentario: e.comment ?? '',
      Estado: e.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle')
    XLSX.writeFile(wb, `detalle-${period}.xlsx`)
  }

  const totalHours = filtered.reduce((s, e) => s + e.hours, 0)
  const btnTab = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
    border: 'none', cursor: 'pointer', transition: 'all .15s',
    background: active ? 'var(--bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text3)',
    boxShadow: active ? 'var(--shadow)' : 'none',
  })

  return (
    <>
      {/* Header */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Reporte mensual</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, textTransform: 'capitalize' }}>
            {periodLabel} · {totalHours}hs · {entries.length} registros
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Employee filter */}
          {employees.length > 1 && (
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="form-input" style={{ width: 180 }}>
              <option value="Todos">Todos los empleados</option>
              {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          )}
          {/* Month picker */}
          <form method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="vista" value={vista} />
            <select name="month" defaultValue={period} onChange={e => (e.target.closest('form') as HTMLFormElement)?.submit()} className="form-input" style={{ width: 190 }}>
              {months.map(mo => (
                <option key={mo.value} value={mo.value} style={{ textTransform: 'capitalize' }}>{mo.label}</option>
              ))}
            </select>
          </form>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px', flex: 1 }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 3, gap: 2, marginBottom: 20, width: 'fit-content' }}>
          <button style={btnTab(vista === 'detalle')} onClick={() => setVista('detalle')}>Detalle por empleado</button>
          <button style={btnTab(vista === 'resumen')} onClick={() => setVista('resumen')}>Resumen distribución</button>
        </div>

        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ fontSize: 13 }}>No hay imputaciones enviadas en este período.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Solo se muestran entradas con estado &quot;enviado&quot; o &quot;aprobado&quot;.</p>
          </div>
        ) : vista === 'detalle' ? (
          /* VISTA 1: Detail */
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={exportDetalleExcel} className="btn btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar Excel
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Empleado', 'Fecha', 'Subcuenta', 'Actividad', 'Horas', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500 }}>{e.employee?.full_name ?? '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>{new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{e.account?.code ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}><span className="badge badge-blue">{e.activity_type}</span></td>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{e.hours}hs</td>
                    <td style={{ padding: '10px 16px' }}><span className={`badge ${e.status === 'approved' ? 'badge-green' : 'badge-blue'}`}>{e.status === 'approved' ? 'Aprobado' : 'En revisión'}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>Total</td>
                  <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: 'var(--cu)', borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>{totalHours}hs</td>
                  <td style={{ borderTop: '2px solid var(--border)', background: 'var(--bg2)' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* VISTA 2: Distribution summary */
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Distribución de horas por subcuenta · {distribution.length} combinaciones</span>
              <button onClick={exportDistribucionExcel} className="btn btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar Excel
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Empleado', 'Subcuenta', 'Horas', '% del total'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {distribution.map((d, i) => {
                  const prevEmp = i > 0 ? distribution[i - 1].employee : null
                  const isNewEmp = d.employee !== prevEmp
                  return (
                    <tr key={`${d.employee}-${d.code}`} style={{ borderBottom: '1px solid var(--border)', background: isNewEmp && i > 0 ? 'var(--bg2)' : undefined }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: isNewEmp ? 600 : 400, color: isNewEmp ? 'var(--text)' : 'var(--text3)' }}>
                        {isNewEmp ? d.employee : ''}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{d.code}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{d.hours}hs</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', maxWidth: 100 }}>
                            <div style={{ height: '100%', background: 'var(--cu)', borderRadius: 3, width: `${d.pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 36, textAlign: 'right' }}>{d.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
