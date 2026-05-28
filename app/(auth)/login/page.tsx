'use client'

import { useState, useTransition } from 'react'
import { login, register } from './actions'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = mode === 'login' ? await login(formData) : await register(formData)
      if (result?.error) setError(result.error)
    })
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setError(null)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--cu)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            TimeLog
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
        }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 3, gap: 2, marginBottom: 24 }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all .15s',
                  background: mode === m ? 'var(--bg)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text3)',
                  boxShadow: mode === m ? 'var(--shadow)' : 'none',
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px',
                background: 'var(--danger-bg)',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
                color: '#991b1b',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Nombre completo — solo en registro */}
            {mode === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
                  Nombre completo <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  name="full_name"
                  placeholder="Ej: Martín García"
                  autoComplete="name"
                  required={mode === 'register'}
                  disabled={isPending}
                  autoFocus
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
                Email <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                required
                disabled={isPending}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
                Contraseña <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                name="password"
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                disabled={isPending}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
            >
              {isPending ? (
                <>
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  {mode === 'login' ? 'Ingresando…' : 'Creando cuenta…'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Ingresar' : 'Crear cuenta y entrar'}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 20 }}>
          {mode === 'login' ? '¿Problemas para ingresar? Contactá a IT.' : 'Al registrarte aceptás los términos de uso.'}
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
