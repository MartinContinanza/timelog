'use client'

import { useState, useTransition } from 'react'
import { submitToReview } from './actions'
import type { MonthlyClosureRow } from '@/types/database'

type ClosureWithApprover = MonthlyClosureRow & { approver: { full_name: string } | null }
type Toast = { id: number; msg: string; type: 'success' | 'error' }

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
      {ok ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" width="16" height="16" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" width="16" height="16" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      <span style={{ color: ok ? 'var(--text)' : 'var(--text2)' }}>{text}</span>
    </div>
  )
}

function periodLabel(period: string) {
  const [y, m] = period.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

interface Props {
  period: string
  monthLabel: string
  totalHours: number
  hoursTarget: number
  missingDays: number
  approverName: string
  currentClosure: MonthlyClosureRow | null
  pastClosures: ClosureWithApprover[]
  closeDay: number
}

export default function RevisionClient({
  period, monthLabel, totalHours, hoursTarget, missingDays,
  approverName, currentClosure, pastClosures, closeDay,
}: Props) {
  const [toasts, setToasts]    = useState<Toast[]>([])
  const [isPending, startTr]   = useTransition()
  const [submitted, setSubmitted] = useState(
    currentClosure?.status === 'submitted' || currentClosure?.status === 'approved'
  )

  const hoursOk   = totalHours >= hoursTarget
  const daysOk    = missingDays === 0
  const approverOk = approverName !== 'Sin aprobador'

  function addToast(msg: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  function handleSubmit() {
    startTr(async () => {
      const res = await submitToReview(period, totalHours)
      if (res.error)   addToast(res.error, 'error')
      if (res.success) { addToast(res.success, 'success'); setSubmitted(true) }
    })
  }

  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="badge badge-green">Aprobado</span>
    if (s === 'rejected') return <span className="badge badge-red">Rechazado</span>
    if (s === 'submitted') return <span className="badge badge-blue">En revisión</span>
    return <span className="badge badge-gray">Borrador</span>
  }

  return (
    <>
      {/* Review panel */}
      <div style={{
        background: 'linear-gradient(135deg, var(--cu-pale) 0%, #f0f9ff 100%)',
        border: '1px solid #bae6fd', borderRadius: 'var(--radius-lg)',
        padding: 24, textAlign: 'center', marginBottom: 24,
      }}>
        {submitted ? (
          <>
            <div style={{ width: 48, height: 48, background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="24" height="24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6, textTransform: 'capitalize' }}>
              {monthLabel} enviado a revisión
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>
              Tu cierre fue enviado a <strong>{approverName}</strong> para su aprobación.
            </p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6, textTransform: 'capitalize' }}>
              Cierre de {monthLabel}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Antes de enviar, verificá que todas las horas estén completas y correctas.
            </p>

            <div style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto 20px' }}>
              <CheckItem ok={hoursOk}    text={hoursOk ? `${totalHours} / ${hoursTarget} horas imputadas ✓` : `${totalHours} / ${hoursTarget} horas imputadas (faltan ${hoursTarget - totalHours}hs)`} />
              <CheckItem ok={daysOk}     text={daysOk ? 'Sin días sin imputar ✓' : `${missingDays} día${missingDays > 1 ? 's' : ''} sin imputación registrada`} />
              <CheckItem ok={approverOk} text={approverOk ? `Aprobador asignado: ${approverName}` : 'Sin aprobador asignado'} />
              <CheckItem ok={true}       text="Cierre: " />
              <div style={{ marginLeft: 24, fontSize: 13, color: 'var(--text3)', marginTop: -4 }}>
                {closeDay} de {new Date().toLocaleDateString('es-AR', { month: 'long' })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/imputar" className="btn">
                Completar horas primero
              </a>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={isPending}
              >
                {isPending ? 'Enviando…' : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    {hoursOk && daysOk ? 'Enviar a revisión' : 'Enviar de todas formas'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* History */}
      {pastClosures.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Historial de cierres
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Período','Horas','Enviado','Aprobador','Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastClosures.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13, textTransform: 'capitalize' }}>{periodLabel(c.period)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500 }}>{c.total_hours}hs</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      {c.approver?.full_name ?? '—'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>{statusBadge(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
    </>
  )
}
