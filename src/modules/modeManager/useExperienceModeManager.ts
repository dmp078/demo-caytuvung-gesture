import { useEffect, useState } from 'react'
import type { ExperienceModeId, ExperienceModeManager } from '../../types'

const STORAGE_KEY = 'ai-showcase-mode'
const DEFAULT_MODE: ExperienceModeId = 'vocabulary_hologram'

const readStoredMode = (): ExperienceModeId => {
  if (typeof window === 'undefined') {
    return DEFAULT_MODE
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'ai_core_cognitive_upgrade' || stored === 'vocabulary_hologram'
    ? stored
    : DEFAULT_MODE
}

export const useExperienceModeManager = (): ExperienceModeManager => {
  const [activeMode, setActiveMode] = useState<ExperienceModeId>(readStoredMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, activeMode)
  }, [activeMode])

  return {
    activeMode,
    setMode: setActiveMode,
  }
}
