'use client'

import { useState, useTransition } from 'react'
import { submitToReview, annulSubmission } from './actions'
import type { MonthlyClosureRow } from '@/types/database'
import { STATUS_LABEL, STATUS_BADGE } from '@/lib/utils'

type ClosureWithApprover = MonthlyClosureRow & { approver: { full_name: string } | null }
type Toast = { id: number; msg: string; type: 'success' | 'error' }

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
      {ok
        ? <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" width="16" height="16" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" width="16" height="16" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      <span style={{ color: ok ? 'var(--text)' : 'var(--text2)' }}>{text}</span>
    </div>
  )
}

function periodLabel(p: string) {
  const [y, m] = p.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

interface Props {
  period: string
  monthLabel: string
  totalHours: number
  hoursTarget: number
  approverName: string
  currentClosure: MonthlyClosureRow | null
  pastClosures: ClosureWithApprover[]
}

export default function RevisionClient({
  period, monthLabel, totalHours, hoursTarget,
  approverName, currentClosure, pastClosures,
}: Props) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPending, startTr] = useTransition()

  function toast(msg: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  function handleSubmit() {
    startTr(async () => {
      const r = await submitToReview(period)
      if (r.error) toast(r.error, 'error')
      else toast(r.success!, 'success')
    })
  }

  function handleAnnul(p: string) {
    if (!confirm('¿Anular el envío? Podrás corregir entradas y reenviar.')) return
    startTr(async () => {
      const r = await annulSubmission(p)
      if (r.error) toast(r.error, 'error')
      else toast(r.success!, 'success')
    })
  }

  const hoursOk    = totalHours >= hoursTarget
  const approverOk = approverName !== 'Sin aprobador asignado'
  const canSubmit  = hoursOk
  const status     = currentClosure?.status ?? 'open'

  return (
    <>
      {/* Current month panel */}
      <div style={{ background: 'linear-gradient(135deg, var(--cu-pale) 0%, #f0f9ff 100%)', border: '1px solid #bae6fd', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
              Cierre de {monthLabel}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              Verificá que todo esté correcto antes de enviar
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[status] ?? 'badge-gray'}`} style={{ fontSize: 12 }}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {/* Checklist */}
        <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #e0f2fe' }}>
          <CheckItem ok={hoursOk} text={hoursOk ? `${totalHours} / ${hoursTarget}hs imputadas ✓` : `${totalHours} / ${hoursTarget}hs — faltan ${hoursTarget - totalHours}hs`} />
          <CheckItem ok={approverOk} text={`Aprobador: ${approverName}`} />
        </div>

        {/* Actions */}
        {status === 'approved' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
            Mes aprobado por {approverName}
          </div>
        ) : status === 'submitted' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Esperando aprobación de <strong>{approverName}</strong>
            </div>
            <button onClick={() => handleAnnul(period)} className="btn btn-sm" disabled={isPending}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              Anular envío
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!hoursOk && (
              <a href="/imputar" className="btn">
                Completar horas primero
              </a>
            )}
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isPending || !canSubmit}
            >
              {isPending ? 'Enviando…' : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Enviar a revisión
                </>
              )}
            </button>
          </div>
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
                  {['Período', 'Enviado', 'Aprobador', 'Estado', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.4px', textTransform: 'uppercase', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastClosures.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13, textTransform: 'capitalize' }}>{periodLabel(c.period)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text2)' }}>{c.approver?.full_name ?? '—'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {c.status === 'submitted' && (
                        <button onClick={() => handleAnnul(c.period)} className="btn btn-sm" disabled={isPending}
                          style={{ fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)', padding: '3px 8px' }}>
                          Anular
                        </button>
                      )}
                    </td>
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
