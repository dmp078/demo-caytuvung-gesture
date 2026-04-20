import type { Vec3 } from '../types'

export const HAND_PLANE_Z = -2
export const CORE_BASE_Z = -2.85

export const pointerToWorld = (pointerX: number, pointerY: number): Vec3 => ({
  x: (pointerX - 0.5) * 4.4,
  y: (0.5 - pointerY) * 2.8,
  z: HAND_PLANE_Z,
})

export const orbitNodePosition = (
  index: number,
  total: number,
  elapsedSeconds: number,
  anchor: Vec3,
): Vec3 => {
  const angle = elapsedSeconds * 0.9 + (index / total) * Math.PI * 2
  const verticalWave = Math.sin(elapsedSeconds * 1.5 + index * 0.7) * 0.12
  const radius = 0.85 + Math.sin(elapsedSeconds * 0.8 + index * 0.5) * 0.11

  return {
    x: anchor.x + Math.cos(angle) * radius,
    y: anchor.y + Math.sin(angle * 1.16) * 0.36 + verticalWave,
    z: CORE_BASE_Z + Math.sin(angle * 1.4) * 0.35,
  }
}

export const quizNodePositions = (anchor: Vec3): Vec3[] => [
  { x: anchor.x - 0.95, y: anchor.y + 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x + 0.95, y: anchor.y + 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x - 0.95, y: anchor.y - 0.44, z: CORE_BASE_Z - 0.05 },
  { x: anchor.x + 0.95, y: anchor.y - 0.44, z: CORE_BASE_Z - 0.05 },
]
