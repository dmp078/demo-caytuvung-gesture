import type { Vec3 } from '../types'

export const HAND_PLANE_Z = -2
export const CORE_BASE_Z = -2.85

export const pointerToWorld = (pointerX: number, pointerY: number): Vec3 => ({
  x: (pointerX - 0.5) * 4.4,
  y: (0.5 - pointerY) * 2.8,
  z: HAND_PLANE_Z,
})

export const orbitMenuOffset = (
  index: number,
  total: number,
  focusIndex: number,
): number => {
  let offset = index - focusIndex
  const half = total / 2

  while (offset > half) {
    offset -= total
  }

  while (offset < -half) {
    offset += total
  }

  return offset
}

export const orbitNodePosition = (
  index: number,
  total: number,
  elapsedSeconds: number,
  anchor: Vec3,
  focusIndex = 0,
): Vec3 => {
  const offset = orbitMenuOffset(index, total, focusIndex)
  const spacingX = 0.82
  const lane = Math.sign(offset) * Math.pow(Math.abs(offset), 1.05)
  const hoverWave = Math.sin(elapsedSeconds * 0.94 + index * 0.7) * 0.06
  const depthOffset = -Math.abs(offset) * 0.24

  return {
    x: anchor.x + lane * spacingX,
    y: anchor.y + hoverWave + Math.cos(offset * 0.85) * 0.045,
    z: CORE_BASE_Z + depthOffset + Math.sin(elapsedSeconds * 1.15 + index) * 0.04,
  }
}

export const quizNodePositions = (anchor: Vec3): Vec3[] => [
  { x: anchor.x - 0.95, y: anchor.y + 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x + 0.95, y: anchor.y + 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x - 0.95, y: anchor.y - 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x + 0.95, y: anchor.y - 0.44, z: CORE_BASE_Z - 0.05 },
]
