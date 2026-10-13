function twoDigits(value) {
  return String(value).padStart(2, '0')
}

export function localDateKey(time = new Date()) {
  const date = new Date(time)
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
}
