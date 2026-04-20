import type { Vec2, Vec3 } from '../types'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const lerp = (start: number, end: number, alpha: number) =>
  start + (end - start) * alpha

export const lerpVec2 = (start: Vec2, end: Vec2, alpha: number): Vec2 => ({
  x: lerp(start.x, end.x, alpha),
  y: lerp(start.y, end.y, alpha),
})

export const lerpVec3 = (start: Vec3, end: Vec3, alpha: number): Vec3 => ({
  x: lerp(start.x, end.x, alpha),
  y: lerp(start.y, end.y, alpha),
  z: lerp(start.z, end.z, alpha),
})

export const distance2 = (a: Vec2, b: Vec2) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const distance3 = (a: Vec3, b: Vec3) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

export const magnitude2 = (v: Vec2) => Math.hypot(v.x, v.y)

export const averageVec3 = (points: Vec3[]): Vec3 => {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 }
  }

  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  )

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  }
}

export const wrapAngle = (value: number) => {
  const twoPi = Math.PI * 2
  let angle = value % twoPi
  if (angle < 0) {
    angle += twoPi
  }
  return angle
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)

export const easeInOutSine = (t: number) =>
  -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2
