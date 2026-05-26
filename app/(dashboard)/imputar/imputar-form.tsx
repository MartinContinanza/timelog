'use client'

import { useState, useTransition, useRef } from 'react'
import { createEntries } from './actions'
import type { AccountRow } from '@/types/database'

type Toast = { id: number; msg: string; type: 'success' | 'error' }
type Mode  = 'dia' | 'rango' | 'semana'

const ACTIVITY_TYPES = [
  'Auditoría', 'Reporte', 'Visita campo', 'Oficina', 'Viaje',
  'Capacitación', 'Reunión interna', 'Licencia', 'Vacaciones',
] as const

function groupAccounts(accounts: AccountRow[]) {
  return accounts.reduce<Record<string, AccountRow[]>>((acc, a) => {
    const key = a.sector ?? 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})
}

/* ── Mini calendar ── */
function MiniCalendar({ year, month, hoursMap, selectedDate, onDayClick }: {
  year: number; month: number; hoursMap: Record<string, number>
  selectedDate: string; onDayClick: (d: string) => void
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const firstDow     = ((new Date(year, month, 1).getDay() + 6) % 7)
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells        = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['L','M','X','J','V','S','D'].map(l => (
          <div key={l} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text3)', padding: '3px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const dow        = (firstDow + d - 1) % 7
          const isWeekend  = dow >= 5
          const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const cellDate   = new Date(dateStr + 'T00:00:00')
          const isFuture   = cellDate > today
          const isToday    = cellDate.getTime() === today.getTime()
          const isSelected = dateStr === selectedDate
          const hrs        = hoursMap[dateStr]

          let bg = 'transparent', border = 'transparent', color = 'var(--text)'
          if (isWeekend)              { bg = 'var(--bg2)'; color = 'var(--text3)' }
          if (hrs && hrs >= 8)        { bg = 'var(--cu-pale)'; border = '#bae6fd' }
          else if (hrs)               { bg = '#fffbeb'; border = '#fde68a' }
          if (isToday)                border = 'var(--cu)'
          if (isSelected && !isWeekend) { bg = 'var(--cu-light)'; border = 'var(--cu)' }

          return (
            <div key={d}
              onClick={() => !isFuture && !isWeekend && onDayClick(dateStr)}
              style={{ aspectRatio: '1', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--cu)' : color, background: bg, border: `1.5px solid ${border}`, cursor: isFuture || isWeekend ? 'default' : 'pointer', opacity: isFuture ? 0.4 : 1, transition: 'all .15s', padding: '2px 1px' }}
            >
              {d}
              {hrs ? (
                <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', fontWeight: 500, background: hrs >= 8 ? 'var(--cu)' : 'var(--warning)', color: 'white', borderRadius: 3, padding: '0 3px', marginTop: 1 }}>{hrs}h</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Main component ── */
interface Props {
  accounts: AccountRow[]
  hoursMap: Record<string, number>
  totalHours: number
  hoursTarget: number
  year: number
  month: number
  monthName: string
}

export default function ImputarForm({ accounts, hoursMap, totalHours, hoursTarget, year, month, monthName }: Props) {
  const todayStr = new Date().toISOString().split('T')[0]
  const [mode, setMode]         = useState<Mode>('dia')
  const [activity, setActivity] = useState('Auditoría')
  const [dateVal, setDateVal]   = useState(todayStr)
  const [toasts, setToasts]     = useState<Toast[]>([])
  const [isPending, startTr]    = useTransition()
  const formRef                 = useRef<HTMLFormElement>(null)

  const pct     = Math.round((totalHours / hoursTarget) * 100)
  const remain  = Math.max(hoursTarget - totalHours, 0)
  const circ    = 175.9
  const dashOff = circ - (circ * Math.min(pct, 100) / 100)
  const grouped = groupAccounts(accounts)

  function addToast(msg: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('mode', mode)
    fd.set('activity_type', activity)
    startTr(async () => {
      const res = await createEntries(fd)
      if (res.error)   addToast(res.error, 'error')
      if (res.success) {
        addToast(res.success, 'success')
        const ta = formRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="comment"]')
        if (ta) ta.value = ''
      }
    })
  }

  const modeBtnStyle = (m: Mode) => ({
    flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: 'none', cursor: 'pointer', transition: 'all .15s',
    background: mode === m ? 'var(--bg)' : 'transparent',
    color: mode === m ? 'var(--text)' : 'var(--text3)',
    boxShadow: mode === m ? 'var(--shadow)' : 'none',
  } as React.CSSProperties)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

      {/* ── FORM ── */}
      <div>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 3, gap: 2, marginBottom: 14 }}>
          {(['dia','rango','semana'] as Mode[]).map((m, i) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={modeBtnStyle(m)}>
              {['Por día','Rango de fechas','Semana completa'][i]}
            </button>
          ))}
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--cu)" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Detalle de imputación
            </div>

            {/* DATE INPUTS */}
            {mode === 'dia' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Fecha <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" name="date" required className="form-input" max={todayStr} value={dateVal} onChange={e => setDateVal(e.target.value)} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>No podés imputar en fechas futuras</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Horas <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" name="hours" required className="form-input" min="0.5" max="24" step="0.5" defaultValue="8" />
                </div>
              </div>
            )}

            {mode === 'rango' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Desde <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" name="desde" required className="form-input" max={todayStr} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Hasta <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" name="hasta" required className="form-input" max={todayStr} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Hs/día <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" name="hours" required className="form-input" min="0.5" max="24" step="0.5" defaultValue="8" />
                </div>
              </div>
            )}

            {mode === 'semana' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>Semana <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="week" name="week" required className="form-input" />
                <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>Se imputará 8hs por día hábil (lun–vie)</span>
              </div>
            )}

            {/* SUBCUENTA */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>Subcuenta <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select name="account_id" required className="form-input">
                <option value="">— Seleccioná una subcuenta —</option>
                {Object.entries(grouped).map(([group, accs]) => (
                  <optgroup key={group} label={group}>
                    {accs.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'block' }}>Formato: SECTOR-TIPO-CLIENTE</span>
            </div>

            {/* TIPO DE ACTIVIDAD */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>Tipo de actividad <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ACTIVITY_TYPES.map(type => (
                  <button key={type} type="button" onClick={() => setActivity(type)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: `1.5px solid ${activity === type ? 'var(--cu)' : 'var(--border2)'}`,
                    background: activity === type ? 'var(--cu)' : 'var(--bg)',
                    color: activity === type ? 'white' : 'var(--text2)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>{type}</button>
                ))}
              </div>
            </div>

            {/* COMENTARIO */}
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
                Comentario <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>(opcional)</span>
              </label>
              <textarea name="comment" className="form-input" placeholder="Descripción breve de la tarea..." />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="reset" className="btn" onClick={() => { setActivity('Auditoría'); setDateVal(todayStr) }}>Limpiar</button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Guardando…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>Guardar imputación</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── SIDE PANEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mini calendar */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'capitalize' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {monthName}
          </div>
          <MiniCalendar year={year} month={month} hoursMap={hoursMap} selectedDate={dateVal}
            onDayClick={date => { setDateVal(date); setMode('dia') }} />
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
            Hacé clic en un día para pre-cargar la fecha
          </div>
        </div>

        {/* Progress ring */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10 }}>Progreso del mes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="35" cy="35" r="28" fill="none" stroke="var(--border)" strokeWidth="6"/>
                <circle cx="35" cy="35" r="28" fill="none" stroke="var(--cu)" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"/>
              </svg>
              <span style={{ position: 'absolute', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pct}%</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{totalHours}<span style={{ fontSize: 13, color: 'var(--text3)' }}>/{hoursTarget}hs</span></div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{remain}hs restantes</div>
              {remain > 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>~{(remain / Math.max(1, 11)).toFixed(1)}hs/día</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
