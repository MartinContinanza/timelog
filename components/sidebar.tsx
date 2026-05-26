'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Employee } from '@/types/database'
import { logout } from '@/app/(auth)/login/actions'

interface SidebarProps {
  employee: Employee | null
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Inicio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/imputar',
    label: 'Imputar horas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/historial',
    label: 'Historial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/revision',
    label: 'Enviar a revisión',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
]

const REPORT_ITEMS = [
  {
    href: '/reporte',
    label: 'Reporte mensual',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
]

export default function Sidebar({ employee }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const initials = employee?.initials ?? '??'
  const fullName = employee?.full_name ?? 'Usuario'
  const role = employee
    ? `${employee.sector} · ${employee.role}`
    : ''

  return (
    <aside style={{
      width: 220,
      background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--cu)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.3px' }}>TimeLog</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 1 }}>Control Union</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 8,
              color: isActive(item.href) ? 'var(--cu-dark)' : 'var(--text2)',
              fontSize: 13.5,
              fontWeight: isActive(item.href) ? 500 : 400,
              background: isActive(item.href) ? 'var(--cu-light)' : 'transparent',
              marginBottom: 1,
              cursor: 'pointer',
              transition: 'all .15s',
            }}>
              {item.icon}
              {item.label}
            </div>
          </Link>
        ))}

        {/* Reports section */}
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text3)',
          padding: '6px 10px 4px',
          marginTop: 8,
        }}>
          Reportes
        </div>

        {REPORT_ITEMS.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 8,
              color: isActive(item.href) ? 'var(--cu-dark)' : 'var(--text2)',
              fontSize: 13.5,
              fontWeight: isActive(item.href) ? 500 : 400,
              background: isActive(item.href) ? 'var(--cu-light)' : 'transparent',
              marginBottom: 1,
              cursor: 'pointer',
              transition: 'all .15s',
            }}>
              {item.icon}
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <form action={logout}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background .15s',
              border: 'none',
              background: 'transparent',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Cerrar sesión"
          >
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'var(--cu)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{fullName}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{role}</div>
            </div>
          </button>
        </form>
      </div>
    </aside>
  )
}
