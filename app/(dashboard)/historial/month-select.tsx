'use client'
export default function MonthSelect({ months, current }: { months: { value: string; label: string }[]; current: string }) {
  return (
    <form method="GET">
      <select
        name="month"
        defaultValue={current}
        onChange={e => (e.target.closest('form') as HTMLFormElement)?.submit()}
        className="form-input"
        style={{ width: 190 }}
      >
        {months.map(mo => (
          <option key={mo.value} value={mo.value} style={{ textTransform: 'capitalize' }}>{mo.label}</option>
        ))}
      </select>
    </form>
  )
}
