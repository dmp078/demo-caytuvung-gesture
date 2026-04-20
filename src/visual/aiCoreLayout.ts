import type { AICoreRevealStep, Vec3 } from '../types'
import { clamp } from '../utils/math'

export const AI_CORE_BASE_Z = -2.7

export const aiCoreNodePosition = (
  index: number,
  total: number,
  elapsedSeconds: number,
  expansion: number,
  revealStep: AICoreRevealStep | null,
): Vec3 => {
  const angle = elapsedSeconds * 0.42 + (index / Math.max(total, 1)) * Math.PI * 2
  const baseRadius = 0.9 + Math.sin(elapsedSeconds * 0.62 + index * 0.8) * 0.18
  const radius = baseRadius * expansion
  const collapseFactor = revealStep === 'collapsing' ? 1 - clamp(expansion * 0.9, 0, 0.86) : 1

  return {
    x: Math.cos(angle) * radius * collapseFactor,
    y:
      (Math.sin(angle * 1.2) * 0.44 +
        Math.sin(elapsedSeconds * 1.1 + index * 0.4) * 0.09) *
      expansion *
      collapseFactor,
    z:
      AI_CORE_BASE_Z +
      Math.sin(angle * 1.8 + index) * 0.24 * expansion * collapseFactor,
  }
}

export const aiCoreConnectionPairs = (total: number) => {
  const pairs: Array<[number, number]> = []
  for (let index = 0; index < total; index += 1) {
    pairs.push([index, (index + 1) % total])
    pairs.push([index, (index + 2) % total])
  }
  return pairs
}
