function dateFromName({ name }) {
  const digits = name.match(/(^| |_|-)(\d{6,8})[^\d]/)?.[2]

  if (!digits) return

  const day = +digits.slice(0, 2)
  const month = +digits.slice(2, 4)
  const year = +digits.slice(4)

  const fullYear = year < 70 ? 2000 + year : year < 100 ? 1900 + year : year
  if (fullYear < 1970 || fullYear > 2070) return

  const date = new Date(fullYear, month - 1, day)

  if (isNaN(date)) return

  return date.toISOString().split('T')[0]
}
export { dateFromName }
