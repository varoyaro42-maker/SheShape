const DAY_SHORT = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
}

/** Group schedule rows by time so "Mon · Wed 06:30 – 07:30" reads as one line. */
export function summarizeSchedule(schedule = []) {
  const groups = new Map()
  for (const entry of schedule) {
    const key = entry.time || ''
    const day = DAY_SHORT[String(entry.day).toLowerCase()] || String(entry.day).slice(0, 3)
    if (!groups.has(key)) groups.set(key, [])
    if (day && !groups.get(key).includes(day)) groups.get(key).push(day)
  }
  return [...groups].map(([time, days]) => ({ time, days }))
}
