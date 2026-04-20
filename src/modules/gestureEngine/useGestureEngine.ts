import { useEffect, useRef, useState } from 'react'
import type { GesturePhase, GestureSnapshot, GestureState, HandFrame, Vec2 } from '../../types'
import { clamp, lerpVec2, magnitude2 } from '../../utils/math'

type GateState = {
  active: boolean
  enterCounter: number
  exitCounter: number
}

type HandSample = {
  timestamp: number
  point: Vec2
}

const OPEN_ENTER = 1.8
const OPEN_EXIT = 1.56
const PINCH_ENTER = 0.28
const PINCH_EXIT = 0.38

const SWIPE_MIN_VELOCITY = 1.2
const SWIPE_COOLDOWN_MS = 420
const SWIPE_WINDOW_MS = 250

const updateGate = (
  gate: GateState,
  enterCondition: boolean,
  exitCondition: boolean,
  enterFrames: number,
  exitFrames: number,
): GesturePhase => {
  if (!gate.active) {
    if (enterCondition) {
      gate.enterCounter += 1
    } else {
      gate.enterCounter = 0
    }

    if (gate.enterCounter >= enterFrames) {
      gate.active = true
      gate.enterCounter = 0
      gate.exitCounter = 0
      return 'start'
    }

    return 'idle'
  }

  if (exitCondition) {
    gate.exitCounter += 1
  } else {
    gate.exitCounter = 0
  }

  if (gate.exitCounter >= exitFrames) {
    gate.active = false
    gate.enterCounter = 0
    gate.exitCounter = 0
    return 'end'
  }

  return 'hold'
}

const initialGestureState: GestureState = {
  active: false,
  phase: 'idle',
  strength: 0,
}

const initialSnapshot: GestureSnapshot = {
  hasHand: false,
  frame: null,
  pointer: { x: 0.5, y: 0.5 },
  pointerVelocity: { x: 0, y: 0 },
  stability: 0,
  openPalm: initialGestureState,
  pinch: initialGestureState,
  point: initialGestureState,
  swipeEvent: null,
}

const pointStrength = (frame: HandFrame) => {
  const { index, middle, ring, pinky } = frame.fingerExtensions
  return clamp((index - (middle + ring + pinky) / 3) * 1.2, 0, 1)
}

export const useGestureEngine = (frame: HandFrame | null): GestureSnapshot => {
  const [snapshot, setSnapshot] = useState(initialSnapshot)

  const openGateRef = useRef<GateState>({
    active: false,
    enterCounter: 0,
    exitCounter: 0,
  })
  const pinchGateRef = useRef<GateState>({
    active: false,
    enterCounter: 0,
    exitCounter: 0,
  })
  const pointGateRef = useRef<GateState>({
    active: false,
    enterCounter: 0,
    exitCounter: 0,
  })

  const historyRef = useRef<HandSample[]>([])
  const swipeIndexRef = useRef(0)
  const lastSwipeTimestampRef = useRef(0)
  const lastTimestampRef = useRef(0)

  useEffect(() => {
    if (!frame) {
      historyRef.current = []
      setSnapshot((previous) => ({
        ...previous,
        hasHand: false,
        frame: null,
        pointer: lerpVec2(previous.pointer, { x: 0.5, y: 0.5 }, 0.1),
        pointerVelocity: lerpVec2(previous.pointerVelocity, { x: 0, y: 0 }, 0.2),
        stability: 0,
        openPalm: {
          ...previous.openPalm,
          active: false,
          phase: previous.openPalm.active ? 'end' : 'idle',
          strength: 0,
        },
        pinch: {
          ...previous.pinch,
          active: false,
          phase: previous.pinch.active ? 'end' : 'idle',
          strength: 0,
        },
        point: {
          ...previous.point,
          active: false,
          phase: previous.point.active ? 'end' : 'idle',
          strength: 0,
        },
        swipeEvent: null,
      }))
      return
    }

    const previousTimestamp = lastTimestampRef.current || frame.timestamp
    const dt = Math.max((frame.timestamp - previousTimestamp) / 1000, 1 / 120)
    lastTimestampRef.current = frame.timestamp

    historyRef.current.push({
      timestamp: frame.timestamp,
      point: frame.pointer,
    })
    historyRef.current = historyRef.current.filter(
      (sample) => frame.timestamp - sample.timestamp <= SWIPE_WINDOW_MS,
    )

    const openPhase = updateGate(
      openGateRef.current,
      frame.openness > OPEN_ENTER && frame.pinchDistance > 0.42,
      frame.openness < OPEN_EXIT || frame.pinchDistance < 0.3,
      2,
      2,
    )

    const pinchPhase = updateGate(
      pinchGateRef.current,
      frame.pinchDistance < PINCH_ENTER,
      frame.pinchDistance > PINCH_EXIT,
      1,
      2,
    )

    const shouldEnterPointing =
      frame.fingerExtensions.index > 1.85 &&
      frame.fingerExtensions.middle < 1.7 &&
      frame.fingerExtensions.ring < 1.64 &&
      frame.fingerExtensions.pinky < 1.6 &&
      frame.pinchDistance > 0.26

    const shouldExitPointing =
      frame.fingerExtensions.index < 1.55 ||
      frame.fingerExtensions.middle > 1.8 ||
      frame.fingerExtensions.ring > 1.78 ||
      frame.fingerExtensions.pinky > 1.76

    const pointPhase = updateGate(
      pointGateRef.current,
      shouldEnterPointing,
      shouldExitPointing,
      2,
      3,
    )

    let swipeEvent: GestureSnapshot['swipeEvent'] = null
    const oldest = historyRef.current[0]
    const newest = historyRef.current[historyRef.current.length - 1]

    if (
      oldest &&
      newest &&
      newest.timestamp - oldest.timestamp >= 100 &&
      frame.timestamp - lastSwipeTimestampRef.current > SWIPE_COOLDOWN_MS
    ) {
      const elapsed = (newest.timestamp - oldest.timestamp) / 1000
      const velocityX = (newest.point.x - oldest.point.x) / elapsed
      const velocityY = (newest.point.y - oldest.point.y) / elapsed

      if (Math.abs(velocityX) >= SWIPE_MIN_VELOCITY && Math.abs(velocityX) > Math.abs(velocityY) * 1.2) {
        swipeIndexRef.current += 1
        lastSwipeTimestampRef.current = frame.timestamp
        swipeEvent = {
          id: swipeIndexRef.current,
          direction: velocityX > 0 ? 'right' : 'left',
          velocity: Math.abs(velocityX),
          timestamp: frame.timestamp,
        }
      } else if (velocityY <= -SWIPE_MIN_VELOCITY * 0.9 && Math.abs(velocityY) > Math.abs(velocityX) * 1.15) {
        swipeIndexRef.current += 1
        lastSwipeTimestampRef.current = frame.timestamp
        swipeEvent = {
          id: swipeIndexRef.current,
          direction: 'up',
          velocity: Math.abs(velocityY),
          timestamp: frame.timestamp,
        }
      }
    }

    setSnapshot((previous) => {
      const smoothedPointer = lerpVec2(previous.pointer, frame.pointer, 0.42)
      const rawVelocity = {
        x: (smoothedPointer.x - previous.pointer.x) / dt,
        y: (smoothedPointer.y - previous.pointer.y) / dt,
      }

      const smoothedVelocity = lerpVec2(previous.pointerVelocity, rawVelocity, 0.3)
      const stability = clamp(1 - magnitude2(smoothedVelocity) * 0.08, 0, 1)

      return {
        hasHand: true,
        frame,
        pointer: smoothedPointer,
        pointerVelocity: smoothedVelocity,
        stability,
        openPalm: {
          active: openGateRef.current.active,
          phase: openPhase,
          strength: clamp((frame.openness - 1.45) / 0.7, 0, 1),
        },
        pinch: {
          active: pinchGateRef.current.active,
          phase: pinchPhase,
          strength: clamp((0.38 - frame.pinchDistance) / 0.16, 0, 1),
        },
        point: {
          active: pointGateRef.current.active,
          phase: pointPhase,
          strength: pointStrength(frame),
        },
        swipeEvent,
      }
    })
  }, [frame])

  return snapshot
}
