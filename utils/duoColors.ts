export const hslToHex = (h: number, s: number, l: number): string => {
  const sat = s / 100
  const lit = l / 100
  const a = sat * Math.min(lit, 1 - lit)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
