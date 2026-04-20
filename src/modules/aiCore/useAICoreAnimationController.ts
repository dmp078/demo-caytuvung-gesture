import { useCallback, useEffect, useRef, useState } from 'react'
import type { AICoreAnimationState, AICorePhase } from '../../types'

type UseAICoreAnimationControllerArgs = {
  enabled: boolean
  openingRequestCount: number
  revealRequestCount: number
}

const BOOT_DURATION_MS = 2800
const FORMATION_DURATION_MS = 2600
const SCAN_DURATION_MS = 2400
const OPENING_DURATION_MS = 2100
const AUTO_OPEN_TIMEOUT_MS = 12000
const AUTO_REVEAL_TIMEOUT_MS = 16000

const headlines: Record<AICorePhase, string> = {
  boot: 'COGNITIVE CORE INITIALIZING',
  formation: 'ENERGY CORE FORMING',
  scan: 'COGNITIVE LINK ESTABLISHMENT',
  interaction: 'INTELLIGENCE CORE ACTIVE',
  opening: 'NEURAL CHAMBER UNSEALING',
  expansion: 'KNOWLEDGE EXPANDING',
  reveal: 'UPGRADE PLATFORM UNLOCKED',
}

const systemLines: Record<AICorePhase, string> = {
  boot: 'System booting',
  formation: 'Outer shell matrix synthesizing',
  scan: 'TARGET ACQUIRED',
  interaction: 'COGNITIVE LINK ESTABLISHED',
  opening: 'Layer separation engaged',
  expansion: 'MEMORY NETWORK SYNCHRONIZED',
  reveal: 'Gate core stabilized',
}

const bootLines = [
  'COGNITIVE CORE INITIALIZING',
  'NEURAL SYSTEM ONLINE',
  'INTELLIGENCE CORE ACTIVE',
]

const createInitialState = (): AICoreAnimationState => {
  const phaseStartedAt = performance.now()
  return {
    phase: 'boot',
    headline: headlines.boot,
    systemLine: bootLines[0],
    bootLine: bootLines[0],
    phaseStartedAt,
  }
}

export const useAICoreAnimationController = ({
  enabled,
  openingRequestCount,
  revealRequestCount,
}: UseAICoreAnimationControllerArgs): AICoreAnimationState => {
  const [state, setState] = useState<AICoreAnimationState>(createInitialState)
  const openingHandledRef = useRef(0)
  const revealHandledRef = useRef(0)
  const pendingOpenRef = useRef(false)
  const pendingRevealRef = useRef(false)

  const transitionTo = useCallback((phase: AICorePhase) => {
    setState((previous) => {
      if (previous.phase === phase) {
        return previous
      }

      return {
        phase,
        headline: headlines[phase],
        systemLine: systemLines[phase],
        bootLine: phase === 'boot' ? bootLines[0] : previous.bootLine,
        phaseStartedAt: performance.now(),
      }
    })
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState(createInitialState())
      openingHandledRef.current = 0
      revealHandledRef.current = 0
      pendingOpenRef.current = false
      pendingRevealRef.current = false
      return
    }

    transitionTo('boot')
  }, [enabled, transitionTo])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (openingRequestCount > openingHandledRef.current) {
      openingHandledRef.current = openingRequestCount
      if (state.phase === 'interaction') {
        transitionTo('opening')
      } else {
        pendingOpenRef.current = true
      }
    }

    if (revealRequestCount > revealHandledRef.current) {
      revealHandledRef.current = revealRequestCount
      if (state.phase === 'expansion') {
        transitionTo('reveal')
      } else {
        pendingRevealRef.current = true
      }
    }
  }, [
    enabled,
    openingRequestCount,
    revealRequestCount,
    state.phase,
    transitionTo,
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (state.phase === 'boot') {
      const interval = window.setInterval(() => {
        setState((previous) => {
          const currentIndex = bootLines.indexOf(previous.bootLine)
          const nextIndex = (currentIndex + 1) % bootLines.length
          return {
            ...previous,
            bootLine: bootLines[nextIndex],
            systemLine: bootLines[nextIndex],
          }
        })
      }, BOOT_DURATION_MS / bootLines.length)

      return () => window.clearInterval(interval)
    }

    if (state.phase === 'scan') {
      const sequence = [
        'TARGET ACQUIRED',
        'COGNITIVE LINK ESTABLISHED',
        'SCAN MATRIX STABLE',
      ]
      let index = 0
      const interval = window.setInterval(() => {
        index = (index + 1) % sequence.length
        setState((previous) => ({
          ...previous,
          systemLine: sequence[index],
        }))
      }, 720)

      return () => window.clearInterval(interval)
    }
  }, [enabled, state.phase])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const timeout = (() => {
      if (state.phase === 'boot') {
        return window.setTimeout(() => transitionTo('formation'), BOOT_DURATION_MS)
      }

      if (state.phase === 'formation') {
        return window.setTimeout(() => transitionTo('scan'), FORMATION_DURATION_MS)
      }

      if (state.phase === 'scan') {
        return window.setTimeout(() => transitionTo('interaction'), SCAN_DURATION_MS)
      }

      if (state.phase === 'interaction') {
        if (pendingOpenRef.current) {
          pendingOpenRef.current = false
          transitionTo('opening')
          return undefined
        }
        return window.setTimeout(() => transitionTo('opening'), AUTO_OPEN_TIMEOUT_MS)
      }

      if (state.phase === 'opening') {
        return window.setTimeout(() => transitionTo('expansion'), OPENING_DURATION_MS)
      }

      if (state.phase === 'expansion') {
        if (pendingRevealRef.current) {
          pendingRevealRef.current = false
          transitionTo('reveal')
          return undefined
        }
        return window.setTimeout(() => transitionTo('reveal'), AUTO_REVEAL_TIMEOUT_MS)
      }

      return undefined
    })()

    return () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout)
      }
    }
  }, [enabled, state.phase, transitionTo])

  return state
}
