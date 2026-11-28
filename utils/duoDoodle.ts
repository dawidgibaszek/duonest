import type { DuoDoodleStroke } from '~/types/duo'

// Keep the board dimensions in sync with both native DoodleRenderer implementations.
export const DOODLE_WIDTH = 768
export const DOODLE_HEIGHT = 384

export function doodleDayBounds(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  return {
    start: new Date(year, month, day),
    end: new Date(year, month, day + 1)
  }
}

export function isDoodleOnDay(updatedAt: string, date: Date) {
  const { start, end } = doodleDayBounds(date)
  const time = Date.parse(updatedAt)
  return time >= start.getTime() && time < end.getTime()
}

export function redrawDoodle(canvas: HTMLCanvasElement | null, strokes: readonly DuoDoodleStroke[]) {
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, DOODLE_WIDTH, DOODLE_HEIGHT)
  for (const stroke of strokes) drawDoodleStroke(ctx, stroke)
}

export function drawDoodleStroke(ctx: CanvasRenderingContext2D, stroke: DuoDoodleStroke) {
  const points = stroke.points
  if (!points || points.length < 2) return

  ctx.save()
  const color = stroke.color || '#e11d48'
  ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.isEraser ? '#000000' : color.toLowerCase() === '#ffffff' ? '#0f172a' : color
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = Math.max(1.5, stroke.width * DOODLE_HEIGHT / 400)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  if (points.length === 2) {
    ctx.arc(points[0] * DOODLE_WIDTH, points[1] * DOODLE_HEIGHT, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.moveTo(points[0] * DOODLE_WIDTH, points[1] * DOODLE_HEIGHT)
    for (let i = 2; i < points.length; i += 2) {
      const prevX = points[i - 2] * DOODLE_WIDTH
      const prevY = points[i - 1] * DOODLE_HEIGHT
      const currX = points[i] * DOODLE_WIDTH
      const currY = points[i + 1] * DOODLE_HEIGHT
      ctx.quadraticCurveTo(prevX, prevY, (prevX + currX) / 2, (prevY + currY) / 2)
    }
    ctx.lineTo(points[points.length - 2] * DOODLE_WIDTH, points[points.length - 1] * DOODLE_HEIGHT)
    ctx.stroke()
  }

  ctx.restore()
}
