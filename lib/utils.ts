/** Derive two-letter initials from a full name */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Format ISO date string as "3 may" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short',
  })
}

/** Monthly hours target (no DB column — company constant) */
export const HOURS_TARGET = 160

/** Spanish labels for entry/closure statuses */
export const STATUS_LABEL: Record<string, string> = {
  draft:     'Borrador',
  submitted: 'En revisión',
  approved:  'Aprobado',
  rejected:  'Rechazado',
  open:      'Abierto',
}

export const STATUS_BADGE: Record<string, string> = {
  draft:     'badge-gray',
  submitted: 'badge-blue',
  approved:  'badge-green',
  rejected:  'badge-red',
  open:      'badge-gray',
}
