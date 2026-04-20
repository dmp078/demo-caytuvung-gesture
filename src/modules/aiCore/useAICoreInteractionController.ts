import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AICoreInteractionState,
  GestureSnapshot,
  Vec2,
  WordNode,
} from '../../types'
import { clamp, lerpVec2 } from '../../utils/math'

type UseAICoreInteractionControllerArgs = {
  gestures: GestureSnapshot
  words: WordNode[]
  enabled: boolean
}

const INITIAL_POINTER: Vec2 = { x: 0.5, y: 0.5 }

const createInitialState = (): AICoreInteractionState => ({
  hoveredNodeId: null,
  selectedNodeId: null,
  exploredNodeIds: [],
  coreEngagement: 0,
  openingRequestCount: 0,
  revealRequestCount: 0,
  pointer: INITIAL_POINTER,
  pointerVelocity: { x: 0, y: 0 },
})

const mergeUnique = (list: string[], value: string) =>
  list.includes(value) ? list : [...list, value]

const normalizePointer = (pointer: Vec2): Vec2 => ({
  x: clamp(pointer.x, 0, 1),
  y: clamp(pointer.y, 0, 1),
})

export const useAICoreInteractionController = ({
  gestures,
  words,
  enabled,
}: UseAICoreInteractionControllerArgs) => {
  const [state, setState] = useState<AICoreInteractionState>(createInitialState)
  const lastPointerSampleRef = useRef({
    pointer: INITIAL_POINTER,
    timestamp: performance.now(),
  })
  const openingRequestedRef = useRef(false)
  const revealRequestedRef = useRef(false)

  const revealThreshold = useMemo(
    () => Math.max(3, Math.ceil(words.length * 0.66)),
    [words.length],
  )

  const registerPointerMove = useCallback(
    (incomingPointer: Vec2) => {
      if (!enabled) {
        return
      }

      const pointer = normalizePointer(incomingPointer)
      const now = performance.now()
      const dt = Math.max((now - lastPointerSampleRef.current.timestamp) / 1000, 1 / 120)
      const velocity = {
        x: (pointer.x - lastPointerSampleRef.current.pointer.x) / dt,
        y: (pointer.y - lastPointerSampleRef.current.pointer.y) / dt,
      }

      lastPointerSampleRef.current = {
        pointer,
        timestamp: now,
      }

      setState((previous) => ({
        ...previous,
        pointer: lerpVec2(previous.pointer, pointer, 0.8),
        pointerVelocity: lerpVec2(previous.pointerVelocity, velocity, 0.28),
      }))
    },
    [enabled],
  )

  const requestCoreOpening = useCallback(() => {
    if (!enabled) {
      return
    }

    openingRequestedRef.current = true
    setState((previous) => ({
      ...previous,
      openingRequestCount: previous.openingRequestCount + 1,
    }))
  }, [enabled])

  const registerCoreEngagement = useCallback(
    (source: 'pointer' | 'gesture' = 'pointer') => {
      if (!enabled) {
        return
      }

      setState((previous) => {
        const increment = source === 'gesture' ? 0.85 : 1
        const nextEngagement = Math.min(previous.coreEngagement + increment, 12)
        const shouldRequestOpening = nextEngagement >= 2 && !openingRequestedRef.current
        if (shouldRequestOpening) {
          openingRequestedRef.current = true
        }

        return {
          ...previous,
          coreEngagement: nextEngagement,
          openingRequestCount: shouldRequestOpening
            ? previous.openingRequestCount + 1
            : previous.openingRequestCount,
        }
      })
    },
    [enabled],
  )

  const setHoveredNode = useCallback(
    (nodeId: string | null) => {
      if (!enabled) {
        return
      }

      setState((previous) => ({
        ...previous,
        hoveredNodeId: nodeId,
      }))
    },
    [enabled],
  )

  const selectNode = useCallback(
    (nodeId: string) => {
      if (!enabled) {
        return
      }

      setState((previous) => {
        const exploredNodeIds = mergeUnique(previous.exploredNodeIds, nodeId)
        const shouldRequestReveal =
          exploredNodeIds.length >= revealThreshold && !revealRequestedRef.current

        if (shouldRequestReveal) {
          revealRequestedRef.current = true
        }

        return {
          ...previous,
          selectedNodeId: nodeId,
          exploredNodeIds,
          revealRequestCount: shouldRequestReveal
            ? previous.revealRequestCount + 1
            : previous.revealRequestCount,
        }
      })
    },
    [enabled, revealThreshold],
  )

  const requestReveal = useCallback(() => {
    if (!enabled || revealRequestedRef.current) {
      return
    }

    revealRequestedRef.current = true
    setState((previous) => ({
      ...previous,
      revealRequestCount: previous.revealRequestCount + 1,
    }))
  }, [enabled])

  const clearSelectedNode = useCallback(() => {
    if (!enabled) {
      return
    }

    setState((previous) => ({
      ...previous,
      selectedNodeId: null,
    }))
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      registerPointerMove({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      })
    }

    window.addEventListener('pointermove', handlePointerMove)

    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [enabled, registerPointerMove])

  useEffect(() => {
    if (!enabled || !gestures.hasHand || gestures.stability < 0.24) {
      return
    }

    registerPointerMove(gestures.pointer)

    if (gestures.pinch.phase === 'start') {
      registerCoreEngagement('gesture')
    }
  }, [enabled, gestures, registerCoreEngagement, registerPointerMove])

  useEffect(() => {
    if (!enabled) {
      setState(createInitialState())
      openingRequestedRef.current = false
      revealRequestedRef.current = false
      lastPointerSampleRef.current = {
        pointer: INITIAL_POINTER,
        timestamp: performance.now(),
      }
    }
  }, [enabled])

  return {
    state,
    actions: {
      registerPointerMove,
      registerCoreEngagement,
      requestCoreOpening,
      setHoveredNode,
      selectNode,
      requestReveal,
      clearSelectedNode,
    },
  }
}
